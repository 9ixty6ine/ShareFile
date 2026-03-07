const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const pool = require("../config/database");
const enc = require("../services/encryptionService");
const storage = require("../services/storageService");

function generateShareToken() { return crypto.randomBytes(48).toString("base64url"); }

const createShareValidation = [
  body("fileId").isUUID(),
  body("expiresAt").optional().isISO8601(),
  body("maxDownloads").optional().isInt({ min: 1, max: 10000 }),
  body("password").optional().isLength({ min: 4 }),
];

async function createShareLink(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { fileId, expiresAt, maxDownloads, password } = req.body;
  try {
    const fileResult = await pool.query(
      "SELECT id FROM files WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE", [fileId, req.user.id]
    );
    if (fileResult.rows.length === 0) return res.status(404).json({ error: "File not found" });
    const token = generateShareToken();
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const result = await pool.query(
      `INSERT INTO share_links (file_id, user_id, token, password_hash, expires_at, max_downloads)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, token, expires_at, max_downloads, created_at`,
      [fileId, req.user.id, token, passwordHash, expiresAt || null, maxDownloads || null]
    );
    const link = result.rows[0];
    const shareUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/share/${link.token}`;
    return res.status(201).json({ message: "Share link created", shareLink: { id: link.id, token: link.token, url: shareUrl, expiresAt: link.expires_at, maxDownloads: link.max_downloads, hasPassword: !!password, createdAt: link.created_at } });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Failed to create share link" }); }
}

async function getShareInfo(req, res) {
  const { token } = req.params;
  try {
    const result = await pool.query(
      `SELECT sl.expires_at, sl.max_downloads, sl.download_count, sl.password_hash IS NOT NULL AS "hasPassword",
       f.original_name AS "fileName", f.size, f.mime_type AS "mimeType"
       FROM share_links sl JOIN files f ON f.id = sl.file_id
       WHERE sl.token = $1 AND sl.is_active = TRUE AND f.is_deleted = FALSE`, [token]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Link not found" });
    const link = result.rows[0];
    if (link.expires_at && new Date(link.expires_at) < new Date()) return res.status(410).json({ error: "Link expired" });
    if (link.max_downloads && link.download_count >= link.max_downloads) return res.status(410).json({ error: "Download limit reached" });
    return res.json(link);
  } catch (err) { console.error(err); return res.status(500).json({ error: "Failed to get share info" }); }
}

async function downloadFile(req, res) {
  const { token } = req.params;
  const { password } = req.body;
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT sl.id, sl.expires_at, sl.max_downloads, sl.download_count, sl.password_hash,
       f.id AS "fileId", f.original_name AS "fileName", f.encrypted_name, f.encryption_key_ref, f.encryption_iv, f.mime_type AS "mimeType"
       FROM share_links sl JOIN files f ON f.id = sl.file_id
       WHERE sl.token = $1 AND sl.is_active = TRUE AND f.is_deleted = FALSE`, [token]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Link not found" });
    const link = result.rows[0];
    if (link.expires_at && new Date(link.expires_at) < new Date()) return res.status(410).json({ error: "Link expired" });
    if (link.max_downloads && link.download_count >= link.max_downloads) return res.status(410).json({ error: "Download limit reached" });
    if (link.password_hash) {
      if (!password) return res.status(401).json({ error: "Password required", requiresPassword: true });
      const valid = await bcrypt.compare(password, link.password_hash);
      if (!valid) return res.status(401).json({ error: "Incorrect password" });
    }
    const fileExists = await storage.exists(link.encrypted_name);
    if (!fileExists) {
      console.error(`Download error: encrypted file not found: ${link.encrypted_name}`);
      return res.status(404).json({ error: "Encrypted file not found on server. It may have been lost due to server restart." });
    }
    const encryptedBuffer = await storage.read(link.encrypted_name);
    const decryptedBuffer = enc.decryptBuffer(encryptedBuffer, link.encryption_key_ref, link.encryption_iv);
    await client.query("BEGIN");
    await client.query("UPDATE share_links SET download_count = download_count + 1 WHERE id = $1", [link.id]);
    await client.query(
      "INSERT INTO downloads (share_link_id, file_id, ip_address, user_agent) VALUES ($1,$2,$3,$4)",
      [link.id, link.fileId, req.ip, req.headers["user-agent"]]
    );
    await client.query("COMMIT");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(link.fileName)}"`);
    res.setHeader("Content-Type", link.mimeType || "application/octet-stream");
    res.setHeader("Content-Length", decryptedBuffer.length);
    return res.send(decryptedBuffer);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    return res.status(500).json({ error: "Download failed" });
  } finally { client.release(); }
}

async function listShareLinks(req, res) {
  try {
    const result = await pool.query(
      `SELECT sl.id, sl.token, sl.expires_at, sl.max_downloads, sl.download_count, sl.is_active, sl.created_at,
       sl.password_hash IS NOT NULL AS "hasPassword", f.original_name AS "fileName"
       FROM share_links sl JOIN files f ON f.id = sl.file_id WHERE sl.user_id = $1 ORDER BY sl.created_at DESC`,
      [req.user.id]
    );
    const links = result.rows.map((l) => ({ ...l, url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/share/${l.token}` }));
    return res.json({ shareLinks: links });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Failed to list share links" }); }
}

async function deleteShareLink(req, res) {
  try {
    const result = await pool.query(
      "UPDATE share_links SET is_active = FALSE WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Link not found" });
    return res.json({ message: "Link revoked" });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Failed to revoke link" }); }
}

module.exports = { createShareLink, getShareInfo, downloadFile, listShareLinks, deleteShareLink, createShareValidation };