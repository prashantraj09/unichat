// server/routes/messages.js
const express = require("express");
const auth = require("../middleware/auth");
const Message = require("../models/Message");

const router = express.Router();

// GET /api/conversations/:id/messages
router.get("/conversations/:id/messages", auth, async (req, res) => {
  const conversationId = req.params.id;

  const msgs = await Message.find({ conversationId })
    .sort({ timestamp: 1 });

  res.json(msgs);
});

module.exports = router;
