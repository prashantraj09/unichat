// server/server.js
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");

const { port, mongoUri, corsOrigin, jwtSecret } = require("./config");

// Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const convoRoutes = require("./routes/conversations");
const messageRoutes = require("./routes/messages");

// Models
const Message = require("./models/Message");
const Conversation = require("./models/Conversation");

async function start() {
  // Connect to MongoDB
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");

  const app = express();
  app.use(express.json());

  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    })
  );

  // REST API routes
  app.use("/api", authRoutes);
  app.use("/api", userRoutes);
  app.use("/api", convoRoutes);
  app.use("/api", messageRoutes);

  // HTTP server wrapper
  const server = http.createServer(app);

  // WebSocket server for realtime chat
  const wss = new WebSocket.Server({ server, path: "/ws" });

  // Map of connected clients: userId -> ws
  const clients = new Map();

  wss.on("connection", (ws, req) => {
    // Extract token from query string ?token=...
    const url = new URL(req.url, "http://localhost");
    const token = url.searchParams.get("token");
    let userId = null;

    if (!token) {
      console.log("WS connection rejected: missing token");
      ws.close();
      return;
    }

    try {
      const payload = jwt.verify(token, jwtSecret);
      userId = payload.userId;
      clients.set(userId, ws);
      console.log("WS connected:", userId);
    } catch (err) {
      console.error("WS auth error:", err.message);
      ws.close();
      return;
    }

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Handle encrypted message send
        if (msg.type === "SEND_MESSAGE") {
          const p = msg.payload;

          // 1) Store encrypted message in DB
          const doc = await Message.create({
            conversationId: p.conversationId,
            senderId: userId,
            recipientId: p.recipientId,
            ciphertext: JSON.stringify(p.ciphertext),
            iv: JSON.stringify(p.iv),
            counter: p.counter,
            keyId: p.keyId || "convKey-v1",
          });

          // 2) Update conversation lastMessageAt so we can sort by recent
          await Conversation.findByIdAndUpdate(p.conversationId, {
            lastMessageAt: doc.timestamp,
          });

          // 3) Build payload to send to both users
          const outPayload = {
            _id: doc._id,
            conversationId: p.conversationId,
            senderId: userId,
            recipientId: p.recipientId,
            ciphertext: p.ciphertext,
            iv: p.iv,
            counter: p.counter,
            keyId: doc.keyId,
            timestamp: doc.timestamp,
          };

          const outMsg = {
            type: "NEW_MESSAGE",
            payload: outPayload,
          };

          const outStr = JSON.stringify(outMsg);

          // Send to recipient if online
          const recipientWs = clients.get(p.recipientId);
          if (
            recipientWs &&
            recipientWs.readyState === WebSocket.OPEN
          ) {
            recipientWs.send(outStr);
          }

          // Echo back to sender (to confirm/store in UI)
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(outStr);
          }
        }
      } catch (err) {
        console.error("WS message error:", err);
      }
    });

    ws.on("close", () => {
      if (userId) {
        clients.delete(userId);
        console.log("WS disconnected:", userId);
      }
    });
  });

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
});
