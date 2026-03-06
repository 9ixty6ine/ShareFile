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