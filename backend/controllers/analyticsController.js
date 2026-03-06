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