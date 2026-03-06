# SecureVault - Full Project Setup Script
# Run this from inside your SHAREfile folder:
#   cd C:\Users\abhij\Documents\SHAREfile
#   .\setup.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SecureVault Project Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

# ── Create folder structure ──────────────────────────────────────────────────
Write-Host "`nCreating folders..." -ForegroundColor Yellow

$folders = @(
    "backend\config",
    "backend\controllers",
    "backend\middlewares",
    "backend\services",
    "backend\routes",
    "backend\jobs",
    "frontend\src\components",
    "frontend\src\pages",
    "frontend\src\services",
    "frontend\src\context",
    "frontend\src\utils",
    "storage\files",
    "storage\temp"
)

foreach ($f in $folders) {
    $path = Join-Path $root $f
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}
Write-Host "Folders created." -ForegroundColor Green

# ── Helper function ───────────────────────────────────────────────────────────
function Write-File($relativePath, $content) {
    $fullPath = Join-Path $root $relativePath
    $dir = Split-Path $fullPath -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($fullPath, $content, [System.Text.Encoding]::UTF8)
    Write-Host "  Created: $relativePath" -ForegroundColor DarkGray
}

Write-Host "`nWriting backend files..." -ForegroundColor Yellow

# ── backend/package.json ─────────────────────────────────────────────────────
Write-File "backend\package.json" @'
{
  "name": "securevault-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "migrate": "node config/migrate.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "fs-extra": "^11.2.0",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "node-cron": "^3.0.3",
    "pg": "^8.11.3",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
'@

# ── backend/.env.example ─────────────────────────────────────────────────────
Write-File "backend\.env.example" @'
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=securevault
DB_USER=postgres
DB_PASSWORD=yourpassword
JWT_SECRET=change_this_to_a_long_random_secret_at_least_64_chars
JWT_EXPIRES_IN=7d
STORAGE_PROVIDER=local
STORAGE_DIR=../storage/files
MAX_FILE_SIZE=104857600
FRONTEND_URL=http://localhost:5173
'@

# ── backend/config/database.js ───────────────────────────────────────────────
Write-File "backend\config\database.js" @'
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "securevault",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

module.exports = pool;
'@

# ── backend/config/schema.sql ─────────────────────────────────────────────────
Write-File "backend\config\schema.sql" @'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  storage_used BIGINT DEFAULT 0,
  storage_limit BIGINT DEFAULT 5368709120
);

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name VARCHAR(500) NOT NULL,
  encrypted_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100),
  size BIGINT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  encryption_key_ref VARCHAR(500) NOT NULL,
  encryption_iv VARCHAR(100) NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  virus_scan_status VARCHAR(20) DEFAULT 'pending',
  checksum VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(128) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE,
  max_downloads INT,
  download_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_link_id UUID NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  country_code VARCHAR(2)
);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_downloads_share_link_id ON downloads(share_link_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
'@

# ── backend/config/migrate.js ─────────────────────────────────────────────────
Write-File "backend\config\migrate.js" @'
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("./database");

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Running database migrations...");
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    await client.query(schema);
    console.log("Database schema applied successfully");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
'@

# ── backend/services/encryptionService.js ────────────────────────────────────
Write-File "backend\services\encryptionService.js" @'
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
'@

# ── backend/services/storageService.js ───────────────────────────────────────
Write-File "backend\services\storageService.js" @'
const fs = require("fs-extra");
const path = require("path");

const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(__dirname, "../../storage/files");

const LocalProvider = {
  async init() { await fs.ensureDir(STORAGE_DIR); },
  async save(buffer, filename) {
    const filePath = path.join(STORAGE_DIR, filename);
    await fs.writeFile(filePath, buffer);
    return filePath;
  },
  async read(filename) { return fs.readFile(path.join(STORAGE_DIR, filename)); },
  async delete(filename) { await fs.remove(path.join(STORAGE_DIR, filename)); },
  async exists(filename) { return fs.pathExists(path.join(STORAGE_DIR, filename)); },
};

module.exports = {
  init: () => LocalProvider.init(),
  save: (b, f) => LocalProvider.save(b, f),
  read: (f) => LocalProvider.read(f),
  delete: (f) => LocalProvider.delete(f),
  exists: (f) => LocalProvider.exists(f),
};
'@

# ── backend/services/virusScannerService.js ──────────────────────────────────
Write-File "backend\services\virusScannerService.js" @'
const MOCK_INFECTED = [Buffer.from("EICAR-STANDARD-ANTIVIRUS-TEST-FILE")];

async function scanBuffer(fileBuffer, filename) {
  await new Promise((res) => setTimeout(res, 80));
  for (const sig of MOCK_INFECTED) {
    if (fileBuffer.includes(sig)) return { clean: false, threat: "EICAR.Test.File" };
  }
  return { clean: true, threat: null };
}

module.exports = { scanBuffer };
'@

# ── backend/middlewares/auth.js ───────────────────────────────────────────────
Write-File "backend\middlewares\auth.js" @'
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ error: "No token provided" });

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      "SELECT id, email, name, storage_used, storage_limit FROM users WHERE id = $1 AND is_active = TRUE",
      [decoded.userId]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ error: "User not found" });

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") return res.status(401).json({ error: "Token expired" });
    if (err.name === "JsonWebTokenError") return res.status(401).json({ error: "Invalid token" });
    return res.status(500).json({ error: "Authentication error" });
  }
}

module.exports = { authenticate };
'@

# ── backend/middlewares/rateLimiter.js ───────────────────────────────────────
Write-File "backend\middlewares\rateLimiter.js" @'
const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 100, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: "Too many auth attempts" } });
const uploadLimiter = rateLimit({ windowMs: 60*60*1000, max: 50, standardHeaders: true, legacyHeaders: false });
const downloadLimiter = rateLimit({ windowMs: 15*60*1000, max: 200, standardHeaders: true, legacyHeaders: false });

module.exports = { apiLimiter, authLimiter, uploadLimiter, downloadLimiter };
'@

# ── backend/middlewares/upload.js ────────────────────────────────────────────
Write-File "backend\middlewares\upload.js" @'
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");

const TEMP_DIR = path.join(__dirname, "../../storage/temp");
fs.ensureDirSync(TEMP_DIR);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg","image/png","image/gif","image/webp","image/svg+xml",
  "video/mp4","video/webm","video/quicktime",
  "audio/mpeg","audio/wav","audio/ogg",
  "application/pdf","application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip","application/x-tar","application/gzip",
  "text/plain","text/csv","text/html","application/json",
]);

const storage = multer.diskStorage({
  destination: async (req, file, cb) => { await fs.ensureDir(TEMP_DIR); cb(null, TEMP_DIR); },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || "104857600") },
  fileFilter: (req, file, cb) => {
    ALLOWED_MIME_TYPES.has(file.mimetype) ? cb(null, true) : cb(new Error(`File type ${file.mimetype} not allowed`), false);
  },
});

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "File too large (max 100MB)" });
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
}

module.exports = { upload, handleMulterError };
'@

# ── backend/controllers/authController.js ────────────────────────────────────
Write-File "backend\controllers\authController.js" @'
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const pool = require("../config/database");

const registerValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
  body("name").trim().isLength({ min: 2, max: 100 }),
];
const loginValidation = [body("email").isEmail().normalizeEmail(), body("password").notEmpty()];

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
}

async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password, name } = req.body;
  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "Email already registered" });
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at",
      [email, passwordHash, name]
    );
    const user = result.rows[0];
    return res.status(201).json({ message: "Account created", token: generateToken(user.id), user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Registration failed" });
  }
}

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      "SELECT id, email, name, password_hash, storage_used, storage_limit FROM users WHERE email = $1 AND is_active = TRUE",
      [email]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    const { password_hash, ...safeUser } = user;
    return res.json({ message: "Login successful", token: generateToken(user.id), user: safeUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Login failed" });
  }
}

async function getMe(req, res) {
  return res.json({ user: req.user });
}

module.exports = { register, login, getMe, registerValidation, loginValidation };
'@

# ── backend/controllers/fileController.js ────────────────────────────────────
Write-File "backend\controllers\fileController.js" @'
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
'@

# ── backend/controllers/shareController.js ───────────────────────────────────
Write-File "backend\controllers\shareController.js" @'
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
'@

# ── backend/controllers/analyticsController.js ───────────────────────────────
Write-File "backend\controllers\analyticsController.js" @'
const pool = require("../config/database");

async function getAnalytics(req, res) {
  const userId = req.user.id;
  try {
    const stats = await pool.query(
      `SELECT COUNT(DISTINCT f.id) AS "totalFiles", COALESCE(SUM(f.size),0) AS "totalStorageUsed",
       COUNT(DISTINCT sl.id) AS "totalShareLinks", COALESCE(SUM(sl.download_count),0) AS "totalDownloads"
       FROM files f LEFT JOIN share_links sl ON sl.file_id = f.id WHERE f.user_id = $1 AND f.is_deleted = FALSE`,
      [userId]
    );
    const topFiles = await pool.query(
      `SELECT f.id, f.original_name AS name, f.size, COALESCE(SUM(sl.download_count),0) AS downloads
       FROM files f LEFT JOIN share_links sl ON sl.file_id = f.id
       WHERE f.user_id = $1 AND f.is_deleted = FALSE GROUP BY f.id ORDER BY downloads DESC LIMIT 5`,
      [userId]
    );
    const activityResult = await pool.query(
      `SELECT DATE(d.downloaded_at) AS date, COUNT(*) AS downloads
       FROM downloads d JOIN share_links sl ON sl.id = d.share_link_id
       WHERE sl.user_id = $1 AND d.downloaded_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(d.downloaded_at) ORDER BY date ASC`,
      [userId]
    );
    const activityMap = {};
    activityResult.rows.forEach((r) => { activityMap[r.date.toISOString().slice(0,10)] = parseInt(r.downloads); });
    const activity = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0,10);
      activity.push({ date: ds, downloads: activityMap[ds] || 0 });
    }
    const logs = await pool.query(
      `SELECT d.downloaded_at AS "downloadedAt", f.original_name AS "fileName", d.ip_address AS ip, d.user_agent AS "userAgent"
       FROM downloads d JOIN share_links sl ON sl.id = d.share_link_id JOIN files f ON f.id = d.file_id
       WHERE sl.user_id = $1 ORDER BY d.downloaded_at DESC LIMIT 20`,
      [userId]
    );
    const s = stats.rows[0];
    return res.json({
      overview: { totalFiles: parseInt(s.totalFiles), totalStorageUsed: parseInt(s.totalStorageUsed), totalShareLinks: parseInt(s.totalShareLinks), totalDownloads: parseInt(s.totalDownloads) },
      topFiles: topFiles.rows.map((f) => ({ ...f, downloads: parseInt(f.downloads) })),
      activity,
      recentLogs: logs.rows,
    });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Analytics failed" }); }
}

module.exports = { getAnalytics };
'@

# ── backend/routes/index.js ───────────────────────────────────────────────────
Write-File "backend\routes\index.js" @'
const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");
const files = require("../controllers/fileController");
const share = require("../controllers/shareController");
const analytics = require("../controllers/analyticsController");
const { authenticate } = require("../middlewares/auth");
const { upload, handleMulterError } = require("../middlewares/upload");
const { authLimiter, uploadLimiter, downloadLimiter } = require("../middlewares/rateLimiter");

router.post("/auth/register", authLimiter, auth.registerValidation, auth.register);
router.post("/auth/login",    authLimiter, auth.loginValidation,    auth.login);
router.get("/auth/me",        authenticate, auth.getMe);

router.post("/files/upload", authenticate, uploadLimiter, upload.single("file"), handleMulterError, files.uploadFile);
router.get("/files",         authenticate, files.listFiles);
router.delete("/files/:id",  authenticate, files.deleteFile);

router.post("/share/create",         authenticate, share.createShareValidation, share.createShareLink);
router.get("/share",                  authenticate, share.listShareLinks);
router.delete("/share/:id",           authenticate, share.deleteShareLink);
router.get("/share/:token/info",      downloadLimiter, share.getShareInfo);
router.post("/share/:token/download", downloadLimiter, share.downloadFile);

router.get("/analytics", authenticate, analytics.getAnalytics);

module.exports = router;
'@

# ── backend/jobs/cleanupJob.js ────────────────────────────────────────────────
Write-File "backend\jobs\cleanupJob.js" @'
const cron = require("node-cron");
const pool = require("../config/database");
const storage = require("../services/storageService");

async function runCleanup() {
  console.log("[Cleanup] Running at", new Date().toISOString());
  const client = await pool.connect();
  try {
    const expired = await client.query(
      "UPDATE share_links SET is_active = FALSE WHERE is_active = TRUE AND expires_at IS NOT NULL AND expires_at < NOW() RETURNING id"
    );
    if (expired.rowCount > 0) console.log(`[Cleanup] Deactivated ${expired.rowCount} expired links`);

    const oldFiles = await client.query(
      "SELECT id, encrypted_name, size FROM files WHERE is_deleted = TRUE AND deleted_at < NOW() - INTERVAL '7 days'"
    );
    for (const file of oldFiles.rows) {
      await client.query("BEGIN");
      try {
        await client.query("DELETE FROM downloads WHERE share_link_id IN (SELECT id FROM share_links WHERE file_id = $1)", [file.id]);
        await client.query("DELETE FROM share_links WHERE file_id = $1", [file.id]);
        await client.query("DELETE FROM files WHERE id = $1", [file.id]);
        await client.query("COMMIT");
        await storage.delete(file.encrypted_name);
        console.log(`[Cleanup] Deleted file ${file.id}`);
      } catch (err) { await client.query("ROLLBACK"); console.error("[Cleanup] Error:", err.message); }
    }
  } catch (err) { console.error("[Cleanup] Job error:", err); }
  finally { client.release(); }
}

function startCleanupJob() {
  runCleanup().catch(console.error);
  cron.schedule("0 * * * *", () => runCleanup().catch(console.error));
  console.log("[Cleanup] Scheduled hourly");
}

module.exports = { startCleanupJob };
'@

# ── backend/server.js ─────────────────────────────────────────────────────────
Write-File "backend\server.js" @'
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const routes = require("./routes");
const { apiLimiter } = require("./middlewares/rateLimiter");
const storage = require("./services/storageService");
const { startCleanupJob } = require("./jobs/cleanupJob");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/api", apiLimiter);
app.use("/api", routes);
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: "Server error" }); });

async function start() {
  await storage.init();
  startCleanupJob();
  app.listen(PORT, () => console.log(`SecureVault backend running on http://localhost:${PORT}`));
}
start();
'@

# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`nWriting frontend files..." -ForegroundColor Yellow
# ─────────────────────────────────────────────────────────────────────────────

Write-File "frontend\package.json" @'
{
  "name": "securevault-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.6.5",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.3",
    "recharts": "^2.10.3",
    "lucide-react": "^0.309.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "vite": "^5.0.12"
  }
}
'@

Write-File "frontend\vite.config.js" @'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": { target: "http://localhost:3001", changeOrigin: true } } },
});
'@

Write-File "frontend\postcss.config.js" @'
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
'@

Write-File "frontend\tailwind.config.js" @'
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        vault: { 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5" },
      },
      fontFamily: { sans: ["DM Sans", "system-ui", "sans-serif"] },
      animation: { "fade-in": "fadeIn 0.3s ease-out", "slide-up": "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(16px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
'@

Write-File "frontend\index.html" @'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SecureVault</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
'@

Write-File "frontend\src\index.css" @'
@tailwind base;
@tailwind components;
@tailwind utilities;
@layer base { html { @apply bg-[#0f0e17] text-gray-100 font-sans antialiased; } }
@layer components {
  .glass { @apply bg-white/5 backdrop-blur-sm border border-white/10; }
  .btn-primary { @apply bg-vault-600 hover:bg-vault-500 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed; }
  .btn-ghost { @apply text-gray-400 hover:text-white hover:bg-white/5 px-4 py-2 rounded-lg transition-all duration-200; }
  .input { @apply w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-vault-500/50 focus:border-vault-500/50 transition-all; }
  .card { @apply bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6; }
}
'@

Write-File "frontend\src\main.jsx" @'
import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
'@

Write-File "frontend\src\App.jsx" @'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import FilesPage from "./pages/FilesPage";
import UploadPage from "./pages/UploadPage";
import SharesPage from "./pages/SharesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SharePage from "./pages/SharePage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/share/:token" element={<SharePage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/files"     element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
          <Route path="/upload"    element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
          <Route path="/shares"    element={<ProtectedRoute><SharesPage /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
'@

Write-File "frontend\src\services\api.js" @'
import axios from "axios";
const api = axios.create({ baseURL: "/api", timeout: 60000 });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((r) => r, (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem("token"); localStorage.removeItem("user");
    window.location.href = "/login";
  }
  return Promise.reject(error);
});
export const authAPI = { register: (d) => api.post("/auth/register", d), login: (d) => api.post("/auth/login", d), getMe: () => api.get("/auth/me") };
export const filesAPI = {
  upload: (formData, onProgress) => api.post("/files/upload", formData, { headers: { "Content-Type": "multipart/form-data" }, onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded*100)/e.total)) }),
  list: () => api.get("/files"),
  delete: (id) => api.delete(`/files/${id}`),
};
export const shareAPI = {
  create: (d) => api.post("/share/create", d),
  list: () => api.get("/share"),
  getInfo: (token) => axios.get(`/api/share/${token}/info`),
  download: (token, password) => axios.post(`/api/share/${token}/download`, { password }, { responseType: "blob" }),
  revoke: (id) => api.delete(`/share/${id}`),
};
export const analyticsAPI = { get: () => api.get("/analytics") };
export default api;
'@

Write-File "frontend\src\utils\helpers.js" @'
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024, sizes = ["B","KB","MB","GB","TB"], i = Math.floor(Math.log(bytes)/Math.log(k));
  return `${parseFloat((bytes/Math.pow(k,i)).toFixed(decimals))} ${sizes[i]}`;
}
export function formatDate(dateStr) {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
}
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
export async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
export function isExpired(expiresAt) { return expiresAt ? new Date(expiresAt) < new Date() : false; }
'@

Write-File "frontend\src\context\AuthContext.jsx" @'
import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => { try { const s = localStorage.getItem("user"); return s ? JSON.parse(s) : null; } catch { return null; } });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      authAPI.getMe().then((res) => { setUser(res.data.user); localStorage.setItem("user", JSON.stringify(res.data.user)); })
        .catch(() => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); })
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, []);
  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem("token", res.data.token); localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user); return res.data.user;
  };
  const register = async (email, password, name) => {
    const res = await authAPI.register({ email, password, name });
    localStorage.setItem("token", res.data.token); localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user); return res.data.user;
  };
  const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); };
  return <AuthContext.Provider value={{ user, login, register, logout, loading }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth must be inside AuthProvider"); return ctx; }
'@

Write-File "frontend\src\components\ProtectedRoute.jsx" @'
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-vault-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
'@

Write-File "frontend\src\components\UI.jsx" @'
import { useState } from "react";
import { Copy, Check, AlertCircle, X, Loader2, Shield } from "lucide-react";
import { copyToClipboard } from "../utils/helpers";

export function Spinner({ size = 16 }) { return <Loader2 size={size} className="animate-spin" />; }

export function Alert({ type = "error", message, onClose }) {
  if (!message) return null;
  const s = { error: "bg-red-500/10 border-red-500/20 text-red-400", success: "bg-green-500/10 border-green-500/20 text-green-400", info: "bg-blue-500/10 border-blue-500/20 text-blue-400" };
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${s[type]} animate-fade-in`}>
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
      <p className="flex-1">{message}</p>
      {onClose && <button onClick={onClose}><X size={14} /></button>}
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { await copyToClipboard(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all">
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
      {copied ? "Copied!" : label}
    </button>
  );
}

export function ProgressBar({ value }) {
  return <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-vault-500 rounded-full transition-all duration-300" style={{ width: `${Math.min(100,Math.max(0,value))}%` }} /></div>;
}

export function StorageBar({ used, limit }) {
  const pct = Math.min(100, (used / limit) * 100);
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-vault-500";
  const fmt = (b) => { if (!b) return "0 B"; const k=1024,s=["B","KB","MB","GB"],i=Math.floor(Math.log(b)/Math.log(k)); return `${(b/Math.pow(k,i)).toFixed(1)} ${s[i]}`; };
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1"><span>{fmt(used)} used</span><span>{fmt(limit)}</span></div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4"><Icon size={28} className="text-gray-500" /></div>
      <h3 className="text-gray-300 font-medium mb-1">{title}</h3>
      <p className="text-gray-500 text-sm max-w-xs">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Badge({ children, variant = "default" }) {
  const v = { default:"bg-white/10 text-gray-300", success:"bg-green-500/15 text-green-400", error:"bg-red-500/15 text-red-400", warning:"bg-yellow-500/15 text-yellow-400", primary:"bg-vault-500/15 text-vault-400" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${v[variant]}`}>{children}</span>;
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a1929] border border-white/10 rounded-2xl p-6 w-full max-w-md animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-vault-600 flex items-center justify-center"><Shield size={16} className="text-white" /></div>
      <span className="font-semibold text-white">SecureVault</span>
    </div>
  );
}
'@

Write-File "frontend\src\components\Sidebar.jsx" @'
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Files, Upload, Link, BarChart3, LogOut, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { StorageBar } from "./UI";

const nav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/files",     icon: Files,           label: "My Files" },
  { to: "/upload",    icon: Upload,          label: "Upload" },
  { to: "/shares",    icon: Link,            label: "Share Links" },
  { to: "/analytics", icon: BarChart3,       label: "Analytics" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-white/5 border-r border-white/10 flex flex-col z-40">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-vault-600 flex items-center justify-center"><Shield size={16} className="text-white" /></div>
          <span className="font-semibold text-white">SecureVault</span>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? "bg-vault-600/20 text-vault-400 border border-vault-500/20" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
            <Icon size={16} />{label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10 space-y-3">
        {user && <>
          <StorageBar used={user.storage_used || user.storageUsed || 0} limit={user.storage_limit || user.storageLimit || 5368709120} />
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button onClick={() => { logout(); navigate("/login"); }} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Logout">
              <LogOut size={15} />
            </button>
          </div>
        </>}
      </div>
    </aside>
  );
}
'@

Write-File "frontend\src\components\Layout.jsx" @'
import Sidebar from "./Sidebar";
export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="ml-60 flex-1 min-h-screen"><div className="max-w-5xl mx-auto px-8 py-8">{children}</div></main>
    </div>
  );
}
'@

Write-File "frontend\src\components\ShareLinkModal.jsx" @'
import { useState } from "react";
import { Link2, Calendar, Hash, Lock, Check, ExternalLink } from "lucide-react";
import { shareAPI } from "../services/api";
import { Modal, CopyButton, Alert, Spinner } from "./UI";

export default function ShareLinkModal({ file, onClose }) {
  const [form, setForm] = useState({ expiresAt: "", maxDownloads: "", password: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const payload = { fileId: file.id };
      if (form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString();
      if (form.maxDownloads) payload.maxDownloads = parseInt(form.maxDownloads);
      if (form.password) payload.password = form.password;
      const res = await shareAPI.create(payload);
      setResult(res.data.shareLink);
    } catch (err) { setError(err.response?.data?.error || "Failed to create link"); }
    finally { setLoading(false); }
  };

  return (
    <Modal open title={`Share: ${file.name}`} onClose={onClose}>
      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError("")} />}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1.5"><Calendar size={13} /> Expiry date (optional)</label>
            <input type="datetime-local" className="input" min={new Date().toISOString().slice(0,16)} value={form.expiresAt} onChange={(e) => setForm({...form, expiresAt: e.target.value})} />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1.5"><Hash size={13} /> Max downloads (optional)</label>
            <input type="number" className="input" placeholder="Unlimited" min="1" value={form.maxDownloads} onChange={(e) => setForm({...form, maxDownloads: e.target.value})} />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1.5"><Lock size={13} /> Password (optional)</label>
            <input type="password" className="input" placeholder="No password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <><Spinner size={15} /> Creating...</> : <><Link2 size={15} /> Generate link</>}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mx-auto"><Check size={22} className="text-green-400" /></div>
          <p className="text-center text-white font-medium">Link created!</p>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Share URL</p>
            <p className="text-sm text-vault-400 font-mono break-all">{result.url}</p>
          </div>
          <div className="flex gap-2">
            <CopyButton text={result.url} label="Copy link" />
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-gray-300 transition-all">
              <ExternalLink size={13} /> Open
            </a>
          </div>
          <button onClick={onClose} className="btn-ghost w-full text-sm">Close</button>
        </div>
      )}
    </Modal>
  );
}
'@

# ── Pages ─────────────────────────────────────────────────────────────────────

Write-File "frontend\src\pages\LoginPage.jsx" @'
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Alert, Spinner } from "../components/UI";

export default function LoginPage() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const { login } = useAuth(); const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await login(email, password); navigate("/dashboard"); }
    catch (err) { setError(err.response?.data?.error || "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-vault-600/10 rounded-full blur-3xl" /></div>
      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-vault-600 flex items-center justify-center"><Shield size={20} className="text-white" /></div>
          <h1 className="text-2xl font-semibold text-white">SecureVault</h1>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-1">Welcome back</h2>
          <p className="text-gray-400 text-sm mb-5">Sign in to your vault</p>
          {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError("")} /></div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="email" required className="input pl-9" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <div className="relative"><Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type={showPw ? "text" : "password"} required className="input pl-9 pr-9" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {loading ? <><Spinner size={15} /> Signing in...</> : "Sign in"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">No account? <Link to="/register" className="text-vault-400 hover:text-vault-300 font-medium">Create one</Link></p>
        </div>
      </div>
    </div>
  );
}
'@

Write-File "frontend\src\pages\RegisterPage.jsx" @'
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Alert, Spinner } from "../components/UI";

export default function RegisterPage() {
  const [form, setForm] = useState({ name:"", email:"", password:"" });
  const [showPw, setShowPw] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const { register } = useAuth(); const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await register(form.email, form.password, form.name); navigate("/dashboard"); }
    catch (err) { const errs = err.response?.data?.errors; setError(errs ? errs[0].msg : err.response?.data?.error || "Registration failed"); }
    finally { setLoading(false); }
  };

  const reqs = [{ label:"8+ chars", met: form.password.length >= 8 }, { label:"Uppercase", met: /[A-Z]/.test(form.password) }, { label:"Number", met: /[0-9]/.test(form.password) }];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-vault-600/10 rounded-full blur-3xl" /></div>
      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-vault-600 flex items-center justify-center"><Shield size={20} className="text-white" /></div>
          <h1 className="text-2xl font-semibold text-white">SecureVault</h1>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-1">Create account</h2>
          <p className="text-gray-400 text-sm mb-5">Start sharing securely</p>
          {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError("")} /></div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Name</label>
              <div className="relative"><User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" required className="input pl-9" placeholder="Your name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="email" required className="input pl-9" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <div className="relative"><Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type={showPw ? "text" : "password"} required className="input pl-9 pr-9" placeholder="••••••••" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
              {form.password.length > 0 && <div className="flex gap-3 mt-2">{reqs.map((r) => <span key={r.label} className={`text-xs ${r.met ? "text-green-400" : "text-gray-500"}`}>{r.met ? "✓" : "○"} {r.label}</span>)}</div>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {loading ? <><Spinner size={15} /> Creating...</> : "Create account"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">Already have an account? <Link to="/login" className="text-vault-400 hover:text-vault-300 font-medium">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
'@

Write-File "frontend\src\pages\DashboardPage.jsx" @'
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Upload, Files, Link as LinkIcon, Download, ArrowRight } from "lucide-react";
import Layout from "../components/Layout";
import { analyticsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatBytes } from "../utils/helpers";
import { Spinner, StorageBar } from "../components/UI";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";

const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="bg-[#1a1929] border border-white/10 rounded-lg p-2 text-xs"><p className="text-gray-400">{label}</p><p className="text-white font-medium">{payload[0].value} downloads</p></div>
) : null;

export default function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { analyticsAPI.get().then((r) => setAnalytics(r.data)).catch(console.error).finally(() => setLoading(false)); }, []);

  if (loading) return <Layout><div className="flex justify-center py-20"><Spinner size={24} /></div></Layout>;
  const { overview, activity, topFiles } = analytics || {};

  return (
    <Layout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-2xl font-semibold text-white">Welcome back, {user?.name?.split(" ")[0]} 👋</h1><p className="text-gray-400 text-sm mt-1">Your vault overview</p></div>
          <Link to="/upload" className="btn-primary flex items-center gap-2"><Upload size={16} /> Upload file</Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[["Total files", overview?.totalFiles ?? 0, Files], ["Downloads", overview?.totalDownloads ?? 0, Download], ["Share links", overview?.totalShareLinks ?? 0, LinkIcon], ["Storage used", formatBytes(overview?.totalStorageUsed ?? 0), Upload]].map(([label, value, Icon]) => (
            <div key={label} className="card flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-vault-500/10 flex items-center justify-center flex-shrink-0"><Icon size={18} className="text-vault-400" /></div>
              <div><p className="text-gray-400 text-sm">{label}</p><p className="text-2xl font-semibold text-white mt-0.5">{value}</p></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 card">
            <div className="flex justify-between mb-4"><h2 className="font-medium text-white">Download activity</h2><span className="text-xs text-gray-500">Last 30 days</span></div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={activity || []}>
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="date" hide /><Tooltip content={<TT />} />
                <Area type="monotone" dataKey="downloads" stroke="#6366f1" fill="url(#g)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h2 className="font-medium text-white mb-4">Top files</h2>
            <div className="space-y-3">
              {topFiles?.length > 0 ? topFiles.map((f, i) => (
                <div key={f.id} className="flex items-center gap-3"><span className="text-xs text-gray-500 w-4">{i+1}</span><div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{f.name}</p><p className="text-xs text-gray-500">{f.downloads} downloads</p></div></div>
              )) : <p className="text-gray-500 text-sm">No files yet</p>}
            </div>
          </div>
        </div>
        <div className="card mt-4">
          <div className="flex justify-between mb-3"><h2 className="font-medium text-white">Storage</h2><Link to="/files" className="text-sm text-vault-400 flex items-center gap-1">Manage <ArrowRight size={13} /></Link></div>
          <StorageBar used={user?.storage_used || user?.storageUsed || 0} limit={user?.storage_limit || user?.storageLimit || 5368709120} />
        </div>
      </div>
    </Layout>
  );
}
'@

Write-File "frontend\src\pages\UploadPage.jsx" @'
import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, File, X, CheckCircle, AlertCircle, Lock } from "lucide-react";
import Layout from "../components/Layout";
import { filesAPI } from "../services/api";
import { ProgressBar, Spinner } from "../components/UI";
import { formatBytes } from "../utils/helpers";

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState([]);
  const inputRef = useRef();
  const navigate = useNavigate();

  const addFiles = (newFiles) => setFiles((prev) => [...prev, ...Array.from(newFiles).map((f) => ({ id: Math.random().toString(36).slice(2), file: f, progress: 0, status: "pending", error: null }))]);
  const handleDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }, []);

  const uploadFile = async (item) => {
    const formData = new FormData(); formData.append("file", item.file);
    setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "uploading" } : f));
    try {
      await filesAPI.upload(formData, (p) => setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, progress: p } : f)));
      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "done", progress: 100 } : f));
    } catch (err) {
      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "error", error: err.response?.data?.error || "Upload failed" } : f));
    }
  };

  const allDone = files.length > 0 && files.every((f) => f.status === "done");
  const hasPending = files.some((f) => f.status === "pending");
  const hasUploading = files.some((f) => f.status === "uploading");

  return (
    <Layout>
      <div className="max-w-2xl animate-fade-in">
        <div className="mb-6"><h1 className="text-2xl font-semibold text-white">Upload files</h1><p className="text-gray-400 text-sm mt-1">Files are AES-256 encrypted before storage</p></div>
        <div className="flex items-center gap-2 mb-4 text-xs text-gray-400"><Lock size={13} className="text-vault-400" /><span>End-to-end encrypted · Virus scanned · Stored securely</span></div>
        <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${dragOver ? "border-vault-500 bg-vault-500/10" : "border-white/10 hover:border-white/20"}`}>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          <div className="w-16 h-16 rounded-2xl bg-vault-600/20 flex items-center justify-center mx-auto mb-4"><Upload size={28} className="text-vault-400" /></div>
          <p className="text-white font-medium">Drop files here or click to browse</p>
          <p className="text-gray-500 text-sm mt-1">Images, videos, documents, archives • Max 100MB</p>
        </div>
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((item) => (
              <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"><File size={14} className="text-gray-400" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-white truncate">{item.file.name}</p>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-gray-500">{formatBytes(item.file.size)}</span>
                        {item.status === "done" && <CheckCircle size={14} className="text-green-400" />}
                        {item.status === "error" && <AlertCircle size={14} className="text-red-400" />}
                        {item.status === "uploading" && <Spinner size={14} />}
                        {item.status === "pending" && <button onClick={(e) => { e.stopPropagation(); setFiles((p) => p.filter((f) => f.id !== item.id)); }} className="text-gray-500 hover:text-red-400"><X size={14} /></button>}
                      </div>
                    </div>
                    {item.status === "uploading" && <ProgressBar value={item.progress} />}
                    {item.status === "error" && <p className="text-xs text-red-400">{item.error}</p>}
                    {item.status === "done" && <p className="text-xs text-green-400">Encrypted and stored</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {files.length > 0 && (
          <div className="flex items-center gap-3 mt-4">
            {hasPending && !hasUploading && <button onClick={() => files.filter((f) => f.status === "pending").forEach(uploadFile)} className="btn-primary flex items-center gap-2"><Upload size={15} /> Upload {files.filter((f) => f.status === "pending").length} file(s)</button>}
            {hasUploading && <button disabled className="btn-primary flex items-center gap-2"><Spinner size={15} /> Uploading...</button>}
            {allDone && <button onClick={() => navigate("/files")} className="btn-primary">View my files →</button>}
            <button onClick={() => setFiles([])} className="btn-ghost text-sm">Clear all</button>
          </div>
        )}
      </div>
    </Layout>
  );
}
'@

Write-File "frontend\src\pages\FilesPage.jsx" @'
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Files, Trash2, Share2, Upload, Search, File } from "lucide-react";
import Layout from "../components/Layout";
import { filesAPI } from "../services/api";
import { formatBytes, formatDate } from "../utils/helpers";
import { EmptyState, Badge, Spinner, Alert, Modal } from "../components/UI";
import ShareLinkModal from "../components/ShareLinkModal";

export default function FilesPage() {
  const [files, setFiles] = useState([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null); const [shareFile, setShareFile] = useState(null); const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { filesAPI.list().then((r) => setFiles(r.data.files)).catch(() => setError("Failed to load files")).finally(() => setLoading(false)); }, []);

  const handleDelete = async (file) => {
    setDeletingId(file.id);
    try { await filesAPI.delete(file.id); setFiles((p) => p.filter((f) => f.id !== file.id)); setConfirmDelete(null); }
    catch (err) { setError(err.response?.data?.error || "Delete failed"); }
    finally { setDeletingId(null); }
  };

  const filtered = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-semibold text-white">My Files</h1><p className="text-gray-400 text-sm mt-1">{files.length} encrypted file{files.length !== 1 ? "s" : ""}</p></div>
          <Link to="/upload" className="btn-primary flex items-center gap-2"><Upload size={15} /> Upload</Link>
        </div>
        {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError("")} /></div>}
        {files.length > 0 && (
          <div className="relative mb-4"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input className="input pl-9 max-w-xs" placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        )}
        {loading ? <div className="flex justify-center py-20"><Spinner size={24} /></div>
        : filtered.length === 0 ? <EmptyState icon={Files} title={search ? "No matching files" : "No files yet"} description={search ? "Try a different search" : "Upload your first file"} action={!search && <Link to="/upload" className="btn-primary">Upload file</Link>} />
        : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-white/5">{["Name","Size","Uploaded","Downloads",""].map((h) => <th key={h} className={`text-left text-xs font-medium text-gray-500 px-5 py-3 ${h === "" ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((file) => (
                  <tr key={file.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"><File size={14} className="text-gray-400" /></div>
                        <div><p className="text-sm text-white truncate max-w-[200px]">{file.name}</p>{file.shareCount > 0 && <Badge variant="primary">{file.shareCount} link{file.shareCount > 1 ? "s" : ""}</Badge>}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400">{formatBytes(file.size)}</td>
                    <td className="px-5 py-3 text-sm text-gray-400">{formatDate(file.uploadDate)}</td>
                    <td className="px-5 py-3 text-sm text-gray-400">{file.totalDownloads}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setShareFile(file)} className="p-1.5 text-gray-400 hover:text-vault-400 hover:bg-vault-500/10 rounded-lg transition-all" title="Share"><Share2 size={14} /></button>
                        <button onClick={() => setConfirmDelete(file)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {shareFile && <ShareLinkModal file={shareFile} onClose={() => setShareFile(null)} />}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete file">
        <p className="text-gray-400 text-sm mb-5">Delete <strong className="text-white">{confirmDelete?.name}</strong>? All share links will be revoked.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setConfirmDelete(null)} className="btn-ghost text-sm">Cancel</button>
          <button onClick={() => handleDelete(confirmDelete)} disabled={!!deletingId} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            {deletingId ? <Spinner size={13} /> : null} Delete
          </button>
        </div>
      </Modal>
    </Layout>
  );
}
'@

Write-File "frontend\src\pages\SharesPage.jsx" @'
import { useState, useEffect } from "react";
import { Link2, Trash2, Clock, Hash, Lock, ExternalLink } from "lucide-react";
import Layout from "../components/Layout";
import { shareAPI } from "../services/api";
import { formatDate, isExpired } from "../utils/helpers";
import { EmptyState, Badge, Spinner, Alert, CopyButton, Modal } from "../components/UI";

export default function SharesPage() {
  const [links, setLinks] = useState([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); const [revoking, setRevoking] = useState(null); const [confirmRevoke, setConfirmRevoke] = useState(null);

  useEffect(() => { shareAPI.list().then((r) => setLinks(r.data.shareLinks)).catch(() => setError("Failed to load links")).finally(() => setLoading(false)); }, []);

  const handleRevoke = async (link) => {
    setRevoking(link.id);
    try { await shareAPI.revoke(link.id); setLinks((p) => p.filter((l) => l.id !== link.id)); setConfirmRevoke(null); }
    catch (err) { setError(err.response?.data?.error || "Failed to revoke"); }
    finally { setRevoking(null); }
  };

  const getStatus = (l) => {
    if (!l.is_active) return { label: "Revoked", variant: "error" };
    if (isExpired(l.expires_at)) return { label: "Expired", variant: "warning" };
    if (l.max_downloads && l.download_count >= l.max_downloads) return { label: "Limit reached", variant: "warning" };
    return { label: "Active", variant: "success" };
  };

  return (
    <Layout>
      <div className="animate-fade-in">
        <div className="mb-6"><h1 className="text-2xl font-semibold text-white">Share Links</h1><p className="text-gray-400 text-sm mt-1">{links.length} link{links.length !== 1 ? "s" : ""}</p></div>
        {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError("")} /></div>}
        {loading ? <div className="flex justify-center py-20"><Spinner size={24} /></div>
        : links.length === 0 ? <EmptyState icon={Link2} title="No share links yet" description="Go to My Files and click the share button to create a link" />
        : (
          <div className="space-y-3">
            {links.map((link) => {
              const status = getStatus(link);
              return (
                <div key={link.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-white truncate">{link.fileName}</p>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {link.hasPassword && <Lock size={12} className="text-yellow-400" title="Password protected" />}
                      </div>
                      <p className="text-xs text-gray-500 font-mono truncate mb-2">{link.url}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Hash size={11} />{link.download_count}{link.max_downloads ? `/${link.max_downloads}` : ""} downloads</span>
                        {link.expires_at && <span className="flex items-center gap-1"><Clock size={11} />Expires {formatDate(link.expires_at)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <CopyButton text={link.url} />
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"><ExternalLink size={14} /></a>
                      {link.is_active && <button onClick={() => setConfirmRevoke(link)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={14} /></button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Modal open={!!confirmRevoke} onClose={() => setConfirmRevoke(null)} title="Revoke share link">
        <p className="text-gray-400 text-sm mb-5">Permanently disable this link for <strong className="text-white">{confirmRevoke?.fileName}</strong>?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setConfirmRevoke(null)} className="btn-ghost text-sm">Cancel</button>
          <button onClick={() => handleRevoke(confirmRevoke)} disabled={!!revoking} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            {revoking ? <Spinner size={13} /> : null} Revoke
          </button>
        </div>
      </Modal>
    </Layout>
  );
}
'@

Write-File "frontend\src\pages\AnalyticsPage.jsx" @'
import { useState, useEffect } from "react";
import { BarChart3, Download, Globe, HardDrive } from "lucide-react";
import Layout from "../components/Layout";
import { analyticsAPI } from "../services/api";
import { formatBytes, formatDate } from "../utils/helpers";
import { Spinner } from "../components/UI";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#6366f1","#818cf8","#a5b4fc","#c7d2fe","#e0e7ff"];
const TT = ({ active, payload, label }) => active && payload?.length ? <div className="bg-[#1a1929] border border-white/10 rounded-lg p-2 text-xs"><p className="text-gray-400">{label}</p><p className="text-white font-medium">{payload[0].value}</p></div> : null;

export default function AnalyticsPage() {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { analyticsAPI.get().then((r) => setData(r.data)).catch(console.error).finally(() => setLoading(false)); }, []);
  if (loading) return <Layout><div className="flex justify-center py-20"><Spinner size={24} /></div></Layout>;
  const { overview, topFiles, activity, recentLogs } = data || {};
  const chartData = (activity || []).map((a) => ({ ...a, label: new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) }));

  return (
    <Layout>
      <div className="animate-fade-in">
        <div className="mb-6"><h1 className="text-2xl font-semibold text-white">Analytics</h1><p className="text-gray-400 text-sm mt-1">Your file sharing statistics</p></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[[BarChart3,"Total files",overview?.totalFiles ?? 0],[Download,"Total downloads",overview?.totalDownloads ?? 0],[Globe,"Share links",overview?.totalShareLinks ?? 0],[HardDrive,"Storage used",formatBytes(overview?.totalStorageUsed ?? 0)]].map(([Icon,label,value]) => (
            <div key={label} className="card"><div className="flex items-center gap-3 mb-2"><Icon size={15} className="text-vault-400" /><p className="text-xs text-gray-400">{label}</p></div><p className="text-2xl font-semibold text-white">{value}</p></div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-2 card">
            <h2 className="font-medium text-white mb-4">Downloads over time</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fill:"#6b7280", fontSize:10 }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fill:"#6b7280", fontSize:10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<TT />} />
                <Area type="monotone" dataKey="downloads" stroke="#6366f1" fill="url(#ag)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h2 className="font-medium text-white mb-4">Top files</h2>
            {topFiles?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topFiles} layout="vertical">
                  <XAxis type="number" hide /><YAxis type="category" dataKey="name" width={80} tick={{ fill:"#6b7280", fontSize:10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v.length > 12 ? v.slice(0,12)+"…" : v} />
                  <Tooltip content={<TT />} />
                  <Bar dataKey="downloads" radius={[0,4,4,0]}>{topFiles.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-500 text-sm text-center py-8">No data yet</p>}
          </div>
        </div>
        <div className="card">
          <h2 className="font-medium text-white mb-4">Recent downloads</h2>
          {recentLogs?.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5">{["File","IP","Date"].map((h) => <th key={h} className="text-left text-xs text-gray-500 pb-2 pr-4">{h}</th>)}</tr></thead>
              <tbody>{recentLogs.map((log, i) => <tr key={i} className="border-b border-white/5 last:border-0"><td className="py-2 pr-4 text-white">{log.fileName}</td><td className="py-2 pr-4 text-gray-400 font-mono">{log.ip || "Unknown"}</td><td className="py-2 text-gray-400">{formatDate(log.downloadedAt)}</td></tr>)}</tbody>
            </table>
          ) : <p className="text-gray-500 text-sm text-center py-8">No downloads yet</p>}
        </div>
      </div>
    </Layout>
  );
}
'@

Write-File "frontend\src\pages\SharePage.jsx" @'
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Download, Lock, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { shareAPI } from "../services/api";
import { formatBytes, downloadBlob } from "../utils/helpers";
import { Alert, Spinner } from "../components/UI";

export default function SharePage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); const [password, setPassword] = useState("");
  const [downloading, setDownloading] = useState(false); const [done, setDone] = useState(false); const [needsPw, setNeedsPw] = useState(false);

  useEffect(() => {
    shareAPI.getInfo(token).then((r) => { setInfo(r.data); setNeedsPw(r.data.hasPassword); })
      .catch((err) => setError(err.response?.data?.error || "Link not found or expired"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownload = async (e) => {
    e?.preventDefault(); setError(""); setDownloading(true);
    try {
      const res = await shareAPI.download(token, needsPw ? password : undefined);
      const cd = res.headers["content-disposition"];
      const filename = cd ? decodeURIComponent(cd.split('filename="')[1]?.replace('"',"") || info.fileName) : info.fileName;
      downloadBlob(res.data, filename); setDone(true);
    } catch (err) {
      if (err.response?.data?.requiresPassword) { setNeedsPw(true); setError("Password required"); }
      else setError(err.response?.data?.error || "Download failed");
    } finally { setDownloading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <div className="absolute inset-0"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-vault-600/8 rounded-full blur-3xl" /></div>
      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-vault-600 flex items-center justify-center"><Shield size={20} className="text-white" /></div>
          <h1 className="text-2xl font-semibold text-white">SecureVault</h1>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-7 shadow-2xl">
          {loading ? <div className="flex justify-center py-8"><Spinner size={28} /></div>
          : error && !info ? (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center"><AlertTriangle size={20} className="text-red-400" /></div>
              <p className="text-white font-medium">Link unavailable</p>
              <p className="text-gray-400 text-sm">{error}</p>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center"><CheckCircle size={20} className="text-green-400" /></div>
              <p className="text-white font-medium">Download started!</p>
              <button onClick={handleDownload} className="btn-ghost text-sm flex items-center gap-2 mt-2"><Download size={14} /> Download again</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2"><h1 className="font-semibold text-white text-lg">Secure file download</h1><Shield size={15} className="text-vault-400" /></div>
              <div className="bg-white/5 rounded-xl p-4 mb-4"><p className="text-white font-medium truncate">{info?.fileName}</p><p className="text-gray-400 text-sm mt-0.5">{formatBytes(info?.size || 0)}</p></div>
              <div className="flex flex-wrap gap-2 mb-4">
                {info?.hasPassword && <span className="flex items-center gap-1 bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full text-xs"><Lock size={10} /> Password protected</span>}
                {info?.expiresAt && <span className="bg-white/5 px-2 py-0.5 rounded-full text-xs text-gray-400">Expires {new Date(info.expiresAt).toLocaleDateString()}</span>}
              </div>
              {error && <div className="mb-3"><Alert type="error" message={error} onClose={() => setError("")} /></div>}
              {needsPw ? (
                <form onSubmit={handleDownload} className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Password</label>
                    <div className="relative"><Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input type="password" className="input pl-9" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
                    </div>
                  </div>
                  <button type="submit" disabled={downloading} className="btn-primary w-full flex items-center justify-center gap-2">
                    {downloading ? <><Spinner size={15} /> Decrypting...</> : <><Download size={15} /> Download file</>}
                  </button>
                </form>
              ) : (
                <button onClick={handleDownload} disabled={downloading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {downloading ? <><Spinner size={15} /> Decrypting...</> : <><Download size={15} /> Download file</>}
                </button>
              )}
              <p className="text-center text-xs text-gray-600 mt-4">🔒 Shared via SecureVault — End-to-end encrypted</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
'@

# ── Root files ────────────────────────────────────────────────────────────────
Write-File "docker-compose.yml" @'
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    container_name: securevault-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
      POSTGRES_DB: ${DB_NAME:-securevault}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/config/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    container_name: securevault-backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-securevault}
      DB_USER: ${DB_USER:-postgres}
      DB_PASSWORD: ${DB_PASSWORD:-password}
      JWT_SECRET: ${JWT_SECRET:-changeme_please}
      STORAGE_DIR: /app/storage/files
      FRONTEND_URL: http://localhost
    volumes:
      - file_storage:/app/storage
    ports:
      - "3001:3001"

  frontend:
    build: ./frontend
    container_name: securevault-frontend
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  postgres_data:
  file_storage:
'@

Write-File ".env.example" @'
DB_NAME=securevault
DB_USER=postgres
DB_PASSWORD=strongpassword123
JWT_SECRET=generate_a_64_char_random_string_here
'@

Write-File ".gitignore" @'
node_modules/
.env
dist/
storage/files/
storage/temp/
*.log
.DS_Store
'@

# ─── Done ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All files created!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Set up PostgreSQL and create the database:" -ForegroundColor White
Write-Host '   psql -U postgres -c "CREATE DATABASE securevault;"' -ForegroundColor DarkGray
Write-Host ""
Write-Host "2. Configure backend environment:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor DarkGray
Write-Host "   copy .env.example .env" -ForegroundColor DarkGray
Write-Host "   (Edit .env with your DB password and JWT_SECRET)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "3. Install dependencies and run migrations:" -ForegroundColor White
Write-Host "   npm install" -ForegroundColor DarkGray
Write-Host "   npm run migrate" -ForegroundColor DarkGray
Write-Host "   npm run dev" -ForegroundColor DarkGray
Write-Host ""
Write-Host "4. In a NEW terminal, start the frontend:" -ForegroundColor White
Write-Host "   cd ..\frontend" -ForegroundColor DarkGray
Write-Host "   npm install" -ForegroundColor DarkGray
Write-Host "   npm run dev" -ForegroundColor DarkGray
Write-Host ""
Write-Host "App will be at: http://localhost:5173" -ForegroundColor Green
Write-Host ""
