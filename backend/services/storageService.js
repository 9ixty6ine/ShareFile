const fs = require("fs-extra");
const path = require("path");

// ---------------------------------------------------------------------------
// Local filesystem provider (used in development)
// ---------------------------------------------------------------------------
const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(__dirname, "../../storage/files");

const LocalProvider = {
  async init() {
    await fs.ensureDir(STORAGE_DIR);
  },
  async save(buffer, filename) {
    const filePath = path.join(STORAGE_DIR, filename);
    await fs.writeFile(filePath, buffer);
    return filePath;
  },
  async read(filename) {
    return fs.readFile(path.join(STORAGE_DIR, filename));
  },
  async delete(filename) {
    await fs.remove(path.join(STORAGE_DIR, filename));
  },
  async exists(filename) {
    return fs.pathExists(path.join(STORAGE_DIR, filename));
  },
};

// ---------------------------------------------------------------------------
// S3-compatible cloud storage provider (used in production on Vercel)
// Works with AWS S3, Cloudflare R2, Supabase Storage, MinIO, etc.
//
// Required env vars:
//   S3_BUCKET      – bucket name
//   S3_REGION      – e.g. "auto" for R2, "us-east-1" for S3
//   S3_ENDPOINT    – full endpoint URL (required for R2 / custom S3-compatible)
//   S3_ACCESS_KEY  – access key ID
//   S3_SECRET_KEY  – secret access key
// ---------------------------------------------------------------------------
const S3Provider = {
  _client: null,
  _getClient() {
    if (!this._client) {
      const {
        S3Client,
        PutObjectCommand,
        GetObjectCommand,
        DeleteObjectCommand,
        HeadObjectCommand,
      } = require("@aws-sdk/client-s3");

      this._s3 = new S3Client({
        region: process.env.S3_REGION || "auto",
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY,
          secretAccessKey: process.env.S3_SECRET_KEY,
        },
      });
      this._cmds = {
        PutObjectCommand,
        GetObjectCommand,
        DeleteObjectCommand,
        HeadObjectCommand,
      };
      this._client = true;
    }
    return this;
  },

  async init() {
    // No filesystem setup needed for S3
  },

  async save(buffer, filename) {
    const { _s3, _cmds } = this._getClient();
    await _s3.send(
      new _cmds.PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: filename,
        Body: buffer,
      })
    );
    return filename;
  },

  async read(filename) {
    const { _s3, _cmds } = this._getClient();
    const response = await _s3.send(
      new _cmds.GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: filename,
      })
    );
    // Convert readable stream to Buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  },

  async delete(filename) {
    const { _s3, _cmds } = this._getClient();
    await _s3.send(
      new _cmds.DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: filename,
      })
    );
  },

  async exists(filename) {
    const { _s3, _cmds } = this._getClient();
    try {
      await _s3.send(
        new _cmds.HeadObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: filename,
        })
      );
      return true;
    } catch {
      return false;
    }
  },
};

// ---------------------------------------------------------------------------
// Select provider based on STORAGE_PROVIDER env var
//   "s3"   → S3Provider  (production / Vercel)
//   "local" or unset → LocalProvider (development)
// ---------------------------------------------------------------------------
const provider =
  process.env.STORAGE_PROVIDER === "s3" ? S3Provider : LocalProvider;

module.exports = {
  init: () => provider.init(),
  save: (buffer, filename) => provider.save(buffer, filename),
  read: (filename) => provider.read(filename),
  delete: (filename) => provider.delete(filename),
  exists: (filename) => provider.exists(filename),
};