const cron = require("node-cron");
const pool = require("../config/database");
const storage = require("../services/storageService");

async function runCleanup() {
  console.log("[Cleanup] Running at", new Date().toISOString());
  const client = await pool.connect();
  try {
    // Check tables exist before querying
    const tableCheck = await client.query(`
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'share_links'
    `);
    if (parseInt(tableCheck.rows[0].count) === 0) {
      console.log("[Cleanup] Tables not ready yet, skipping.");
      return;
    }

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
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("[Cleanup] Error:", err.message);
      }
    }
  } catch (err) {
    console.error("[Cleanup] Job error:", err.message);
  } finally {
    client.release();
  }
}

function startCleanupJob() {
  // Delay first run by 5 seconds to let DB settle
  setTimeout(() => runCleanup().catch(console.error), 5000);
  cron.schedule("0 * * * *", () => runCleanup().catch(console.error));
  console.log("[Cleanup] Scheduled hourly");
}

module.exports = { startCleanupJob };