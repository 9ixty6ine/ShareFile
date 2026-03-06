require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const routes = require("./routes");
const { apiLimiter } = require("./middlewares/rateLimiter");

const app = express();

// Allowed origins: support comma-separated list for multiple environments
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman) and listed origins
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/api", apiLimiter);
app.use("/api", routes);
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

// Only start the HTTP server when running directly (local dev).
// In production (Vercel serverless), this file is imported as a module
// and the app is exported below — no listen() is called.
if (require.main === module) {
  const storage = require("./services/storageService");
  const { startCleanupJob } = require("./jobs/cleanupJob");
  const PORT = process.env.PORT || 3001;
  (async () => {
    await storage.init();
    startCleanupJob();
    app.listen(PORT, () =>
      console.log(`SecureVault backend running on http://localhost:${PORT}`)
    );
  })();
}

module.exports = app;