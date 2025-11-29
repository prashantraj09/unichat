// server/models/User.js
const mongoose = require("mongoose");

const EncryptedBlobSchema = new mongoose.Schema(
  {
    ciphertext: String,
    iv: String,
    salt: String,
    iterations: Number,
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },

  publicIdentityKeyJwk: { type: Object, required: true },
  encryptedPrivateKeyBlob: { type: EncryptedBlobSchema, required: true },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);
