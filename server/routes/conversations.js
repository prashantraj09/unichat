// server/routes/conversations.js
const express = require("express");
const crypto = require("crypto");
const auth = require("../middleware/auth");
const Conversation = require("../models/Conversation");

const router = express.Router();

/**
 * GET /api/conversations
 * Returns all conversations that the current user participates in.
 * Sorted by most recent activity:
 *   - first by lastMessageAt (desc)
 *   - then by createdAt (desc)
 */
router.get("/conversations", auth, async (req, res) => {
  try {
    const convos = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "_id email")
      .sort({ lastMessageAt: -1, createdAt: -1 });

    res.json(convos);
  } catch (err) {
    console.error("GET /conversations error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/conversations
 * Body: { participantId }
 * Finds an existing 1-1 conversation between the current user and participant,
 * or creates a new one with a fresh hkdfSalt.
 */
router.post("/conversations", auth, async (req, res) => {
  try {
    const { participantId } = req.body;
    if (!participantId) {
      return res
        .status(400)
        .json({ error: "participantId required" });
    }

    // Check if a conversation already exists between these two users
    let convo = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId], $size: 2 },
    });

    if (!convo) {
      // Create new conversation with random hkdfSalt
      const hkdfSalt = crypto.randomBytes(16).toString("base64");

      convo = await Conversation.create({
        participants: [req.user._id, participantId],
        hkdfSalt,
        lastMessageAt: null,
      });
    }

    res.status(201).json(convo);
  } catch (err) {
    console.error("POST /conversations error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
