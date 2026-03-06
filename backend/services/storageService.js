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