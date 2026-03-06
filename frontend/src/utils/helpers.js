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