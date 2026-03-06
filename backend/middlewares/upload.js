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