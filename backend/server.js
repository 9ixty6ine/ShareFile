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