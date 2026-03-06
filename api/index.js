/**
 * Vercel Serverless Function Entry Point
 *
 * Vercel automatically treats any file in /api as a serverless function.
 * This file imports the Express app (which does NOT call listen()) and
 * exports it as the default handler so Vercel can invoke it per-request.
 *
 * All routes under /api/* hit this handler, which then delegates to the
 * Express router exactly as it would on a regular Node server.
 */

// Load env vars (only relevant for local testing via `vercel dev`)
require("dotenv").config({ path: require("path").join(__dirname, "../backend/.env") });

const app = require("../backend/server");

module.exports = app;
