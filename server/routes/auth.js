// server/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config");
const User = require("../models/User");

const router = express.Router();

// POST /api/register
router.post("/register", async (req, res) => {
  try {
    const {
      email,
      password,
      publicIdentityKeyJwk,
      encryptedPrivateKeyBlob,
    } = req.body;

    if (!email || !password || !publicIdentityKeyJwk || !encryptedPrivateKeyBlob) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      passwordHash,
      publicIdentityKeyJwk,
      encryptedPrivateKeyBlob,
    });

    res.status(201).json({
      id: user._id,
      email: user.email,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, jwtSecret, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        publicIdentityKeyJwk: user.publicIdentityKeyJwk,
        encryptedPrivateKeyBlob: user.encryptedPrivateKeyBlob,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
