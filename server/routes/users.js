// server/routes/users.js
const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

// GET /api/me
router.get("/me", auth, (req, res) => {
  res.json({
    id: req.user._id,
    email: req.user.email,
    publicIdentityKeyJwk: req.user.publicIdentityKeyJwk,
  });
});

// GET /api/users => list all except me
router.get("/users", auth, async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } })
    .select("_id email");
  res.json(users);
});

// GET /api/users/:id/public-key
router.get("/users/:id/public-key", auth, async (req, res) => {
  const user = await User.findById(req.params.id).select(
    "_id publicIdentityKeyJwk email"
  );
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    userId: user._id,
    email: user.email,
    publicIdentityKeyJwk: user.publicIdentityKeyJwk,
  });
});

module.exports = router;
