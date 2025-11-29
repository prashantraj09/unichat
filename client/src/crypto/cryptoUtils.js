// Web Crypto helpers for UNICHAT

const enc = new TextEncoder();
const dec = new TextDecoder();

/** PBKDF2 password -> AES-GCM key */
export async function derivePasswordKey(password, salt, iterations = 150000) {
  const passKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    passKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Generate identity key pair + encrypted private key blob */
export async function generateIdentityKeysAndBlob(password) {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  const publicJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const passKey = await derivePasswordKey(password, salt);

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    passKey,
    enc.encode(JSON.stringify(privateJwk))
  );

  return {
    publicJwk,
    encryptedPrivateKeyBlob: {
      ciphertext: bufToBase64(new Uint8Array(ciphertext)),
      iv: bufToBase64(iv),
      salt: bufToBase64(salt),
      iterations: 150000,
    },
  };
}

/** Decrypt private identity key from blob */
export async function decryptPrivateIdentityKey(password, blob) {
  const salt = base64ToBuf(blob.salt);
  const iv = base64ToBuf(blob.iv);
  const ciphertext = base64ToBuf(blob.ciphertext);

  const passKey = await derivePasswordKey(password, salt, blob.iterations);

  const plaintextBuf = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    passKey,
    ciphertext
  );

  const privateJwk = JSON.parse(dec.decode(plaintextBuf));
  const privateKey = await window.crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  return privateKey;
}

/** Derive conversation key from ECDH + HKDF */
export async function deriveConversationKey(
  myPrivateKey,
  otherPublicJwk,
  hkdfSaltBase64,
  conversationId
) {
  const otherPubKey = await window.crypto.subtle.importKey(
    "jwk",
    otherPublicJwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );

  const sharedBits = await window.crypto.subtle.deriveBits(
    { name: "ECDH", public: otherPubKey },
    myPrivateKey,
    256
  );

  const sharedKey = await window.crypto.subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveKey"]
  );

  const salt = base64ToBuf(hkdfSaltBase64);
  const info = enc.encode("UNICHAT_" + conversationId);

  const convKey = await window.crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info,
    },
    sharedKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  return convKey;
}

/** Encrypt plaintext with AES-GCM & AAD */
export async function encryptMessage(conversationKey, plaintext, aadObj) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const aad = enc.encode(JSON.stringify(aadObj));

  const ciphertextBuf = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: aad,
      tagLength: 128,
    },
    conversationKey,
    enc.encode(plaintext)
  );

  return {
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ciphertextBuf)),
  };
}

export async function decryptMessage(conversationKey, ciphertextArr, ivArr, aadObj) {
  const iv = new Uint8Array(ivArr);
  const ciphertext = new Uint8Array(ciphertextArr);
  const aad = enc.encode(JSON.stringify(aadObj));

  const plaintextBuf = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: aad,
      tagLength: 128,
    },
    conversationKey,
    ciphertext
  );

  return dec.decode(plaintextBuf);
}

// helper: base64 <-> Uint8Array

export function bufToBase64(buf) {
  let binary = "";
  buf.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function base64ToBuf(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const buf = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    buf[i] = binary.charCodeAt(i);
  }
  return buf;
}
