const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

function generateEncryptionKey() {
  const key = crypto.randomBytes(KEY_LENGTH).toString("hex");
  const iv = crypto.randomBytes(IV_LENGTH).toString("hex");
  return { key, iv };
}

function encryptBuffer(buffer, keyHex, ivHex) {
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  return Buffer.concat([cipher.update(buffer), cipher.final()]);
}

function decryptBuffer(encryptedBuffer, keyHex, ivHex) {
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
}

function computeChecksum(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

module.exports = { generateEncryptionKey, encryptBuffer, decryptBuffer, computeChecksum };