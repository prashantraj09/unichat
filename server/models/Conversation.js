const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  hkdfSalt: { type: String, required: true }, // base64

  // Track last message time for sorting
  lastMessageAt: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Conversation", ConversationSchema);
