// server/models/Message.js
const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
  },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  ciphertext: { type: String, required: true }, // base64 or JSON string
  iv: { type: String, required: true },         // base64
  counter: { type: Number, required: true },
  keyId: { type: String, default: "convKey-v1" },

  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", MessageSchema);
