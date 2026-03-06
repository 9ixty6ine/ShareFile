import { useState, useEffect } from "react";
import { Link2, Trash2, Clock, Hash, Lock, ExternalLink } from "lucide-react";
import Layout from "../components/Layout";
import { shareAPI } from "../services/api";
import { formatDate, isExpired } from "../utils/helpers";
import { EmptyState, Badge, Spinner, Alert, CopyButton, Modal } from "../components/UI";

export default function SharesPage() {
  const [links, setLinks] = useState([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); const [revoking, setRevoking] = useState(null); const [confirmRevoke, setConfirmRevoke] = useState(null);

  useEffect(() => { shareAPI.list().then((r) => setLinks(r.data.shareLinks)).catch(() => setError("Failed to load links")).finally(() => setLoading(false)); }, []);

  const handleRevoke = async (link) => {
    setRevoking(link.id);
    try { await shareAPI.revoke(link.id); setLinks((p) => p.filter((l) => l.id !== link.id)); setConfirmRevoke(null); }
    catch (err) { setError(err.response?.data?.error || "Failed to revoke"); }
    finally { setRevoking(null); }
  };

  const getStatus = (l) => {
    if (!l.is_active) return { label: "Revoked", variant: "error" };
    if (isExpired(l.expires_at)) return { label: "Expired", variant: "warning" };
    if (l.max_downloads && l.download_count >= l.max_downloads) return { label: "Limit reached", variant: "warning" };
    return { label: "Active", variant: "success" };
  };

  return (
    <Layout>
      <div className="animate-fade-in">
        <div className="mb-6"><h1 className="text-2xl font-semibold text-white">Share Links</h1><p className="text-gray-400 text-sm mt-1">{links.length} link{links.length !== 1 ? "s" : ""}</p></div>
        {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError("")} /></div>}
        {loading ? <div className="flex justify-center py-20"><Spinner size={24} /></div>
        : links.length === 0 ? <EmptyState icon={Link2} title="No share links yet" description="Go to My Files and click the share button to create a link" />
        : (
          <div className="space-y-3">
            {links.map((link) => {
              const status = getStatus(link);
              return (
                <div key={link.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-white truncate">{link.fileName}</p>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {link.hasPassword && <Lock size={12} className="text-yellow-400" title="Password protected" />}
                      </div>
                      <p className="text-xs text-gray-500 font-mono truncate mb-2">{link.url}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Hash size={11} />{link.download_count}{link.max_downloads ? `/${link.max_downloads}` : ""} downloads</span>
                        {link.expires_at && <span className="flex items-center gap-1"><Clock size={11} />Expires {formatDate(link.expires_at)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <CopyButton text={link.url} />
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"><ExternalLink size={14} /></a>
                      {link.is_active && <button onClick={() => setConfirmRevoke(link)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={14} /></button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Modal open={!!confirmRevoke} onClose={() => setConfirmRevoke(null)} title="Revoke share link">
        <p className="text-gray-400 text-sm mb-5">Permanently disable this link for <strong className="text-white">{confirmRevoke?.fileName}</strong>?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setConfirmRevoke(null)} className="btn-ghost text-sm">Cancel</button>
          <button onClick={() => handleRevoke(confirmRevoke)} disabled={!!revoking} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            {revoking ? <Spinner size={13} /> : null} Revoke
          </button>
        </div>
      </Modal>
    </Layout>
  );
}