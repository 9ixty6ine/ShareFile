const path = require("path");
const fs = require("fs-extra");
const { v4: uuidv4 } = require("uuid");
const pool = require("../config/database");
const enc = require("../services/encryptionService");
const storage = require("../services/storageService");
const scanner = require("../services/virusScannerService");

async function uploadFile(req, res) {
  const tempFile = req.file;
  if (!tempFile) return res.status(400).json({ error: "No file uploaded" });
  const client = await pool.connect();
  try {
    const fileBuffer = await fs.readFile(tempFile.path);
    const scan = await scanner.scanBuffer(fileBuffer, tempFile.originalname);
    if (!scan.clean) {
      await fs.remove(tempFile.path);
      return res.status(422).json({ error: "Virus detected", threat: scan.threat });
    }
    const userResult = await client.query("SELECT storage_used, storage_limit FROM users WHERE id = $1", [req.user.id]);
    const { storage_used, storage_limit } = userResult.rows[0];
    if (storage_used + tempFile.size > storage_limit) {
      await fs.remove(tempFile.path);
      return res.status(413).json({ error: "Storage quota exceeded" });
    }
    const { key, iv } = enc.generateEncryptionKey();
    const checksum = enc.computeChecksum(fileBuffer);
    const encryptedBuffer = enc.encryptBuffer(fileBuffer, key, iv);
    const encryptedName = `${uuidv4()}.enc`;
    await storage.save(encryptedBuffer, encryptedName);
    await fs.remove(tempFile.path);
    await client.query("BEGIN");
    const fileResult = await client.query(
      `INSERT INTO files (user_id, original_name, encrypted_name, mime_type, size, encryption_key_ref, encryption_iv, virus_scan_status, checksum)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'clean',$8) RETURNING id, original_name, size, upload_date, mime_type`,
      [req.user.id, tempFile.originalname, encryptedName, tempFile.mimetype, tempFile.size, key, iv, checksum]
    );
    await client.query("UPDATE users SET storage_used = storage_used + $1 WHERE id = $2", [tempFile.size, req.user.id]);
    await client.query("COMMIT");
    const file = fileResult.rows[0];
    return res.status(201).json({ message: "File uploaded and encrypted", file: { id: file.id, name: file.original_name, size: file.size, mimeType: file.mime_type, uploadDate: file.upload_date } });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    if (tempFile?.path) await fs.remove(tempFile.path).catch(() => {});
    console.error(err);
    return res.status(500).json({ error: "Upload failed" });
  } finally { client.release(); }
}

async function listFiles(req, res) {
  try {
    const result = await pool.query(
      `SELECT f.id, f.original_name AS name, f.size, f.mime_type AS "mimeType", f.upload_date AS "uploadDate",
       COUNT(DISTINCT sl.id) AS "shareCount", COALESCE(SUM(sl.download_count),0) AS "totalDownloads"
       FROM files f LEFT JOIN share_links sl ON sl.file_id = f.id AND sl.is_active = TRUE
       WHERE f.user_id = $1 AND f.is_deleted = FALSE GROUP BY f.id ORDER BY f.upload_date DESC`,
      [req.user.id]
    );
    return res.json({ files: result.rows });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Failed to list files" }); }
}

async function deleteFile(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const fileResult = await client.query(
      "SELECT id, encrypted_name, size FROM files WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE",
      [id, req.user.id]
    );
    if (fileResult.rows.length === 0) return res.status(404).json({ error: "File not found" });
    const file = fileResult.rows[0];
    await client.query("BEGIN");
    await client.query("UPDATE files SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1", [id]);
    await client.query("UPDATE share_links SET is_active = FALSE WHERE file_id = $1", [id]);
    await client.query("UPDATE users SET storage_used = GREATEST(0, storage_used - $1) WHERE id = $2", [file.size, req.user.id]);
    await client.query("COMMIT");
    storage.delete(file.encrypted_name).catch(console.error);
    return res.json({ message: "File deleted" });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    return res.status(500).json({ error: "Delete failed" });
  } finally { client.release(); }
}

module.exports = { uploadFile, listFiles, deleteFile };