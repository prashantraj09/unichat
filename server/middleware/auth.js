// server/middleware/auth.js
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config");
const User = require("../models/User");

async function auth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findById(payload.userId).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = auth;
