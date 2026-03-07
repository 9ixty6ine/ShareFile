// FilesPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Files, Trash2, Share2, Upload, Search, File } from "lucide-react";
import Layout from "../components/Layout";
import { filesAPI } from "../services/api";
import { formatBytes, formatDate } from "../utils/helpers";
import { EmptyState, Badge, Spinner, Alert, Modal } from "../components/UI";
import ShareLinkModal from "../components/ShareLinkModal";

export default function FilesPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [shareFile, setShareFile] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    filesAPI.list().then(r => setFiles(r.data.files)).catch(() => setError("Failed to load files")).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (file) => {
    setDeletingId(file.id);
    try {
      await filesAPI.delete(file.id);
      setFiles(p => p.filter(f => f.id !== file.id));
      setConfirmDelete(null);
    } catch (err) {
      setError(err.response?.data?.error || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between animate-fade-up">
          <div>
            <h1 className="heading text-3xl font-bold text-white">My Files</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{files.length} encrypted file{files.length !== 1 ? "s" : ""}</p>
          </div>
          <Link to="/upload" className="btn-primary flex items-center gap-2"><Upload size={15} /> Upload</Link>
        </div>

        {error && <div className="animate-fade-up"><Alert type="error" message={error} onClose={() => setError("")} /></div>}

        {files.length > 0 && (
          <div className="relative animate-fade-up delay-100" style={{ opacity: 0 }}>
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }} />
            <input className="input pl-11 max-w-xs" placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={24} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Files} title={search ? "No matching files" : "No files yet"}
            description={search ? "Try a different search" : "Upload your first encrypted file"}
            action={!search && <Link to="/upload" className="btn-primary">Upload file</Link>} />
        ) : (
          <div className="glass-card overflow-hidden animate-fade-up delay-200" style={{ opacity: 0 }}>
            <div className="absolute inset-x-0 top-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(124,109,250,0.3), transparent)" }} />
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {["Name", "Size", "Uploaded", "Downloads", ""].map(h => (
                    <th key={h} className={`text-left px-5 py-3.5 text-xs font-medium ${h === "" ? "text-right" : ""}`}
                      style={{ color: "rgba(255,255,255,0.35)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((file, i) => (
                  <tr key={file.id} className="transition-all duration-200"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: "rgba(124,109,250,0.08)", border: "1px solid rgba(124,109,250,0.15)" }}>
                          <File size={13} style={{ color: "#a89dff" }} />
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium truncate max-w-[180px]">{file.name}</p>
                          {file.shareCount > 0 && <Badge variant="primary">{file.shareCount} link{file.shareCount > 1 ? "s" : ""}</Badge>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{formatBytes(file.size)}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{formatDate(file.uploadDate)}</td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{file.totalDownloads}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setShareFile(file)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                          style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.04)" }}
                          onMouseOver={e => { e.currentTarget.style.color = "#a89dff"; e.currentTarget.style.background = "rgba(124,109,250,0.1)"; }}
                          onMouseOut={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}>
                          <Share2 size={13} />
                        </button>
                        <button onClick={() => setConfirmDelete(file)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                          style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.04)" }}
                          onMouseOver={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                          onMouseOut={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {shareFile && <ShareLinkModal file={shareFile} onClose={() => setShareFile(null)} />}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete file">
        <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.5)" }}>
          Delete <strong className="text-white">{confirmDelete?.name}</strong>? All share links will be revoked.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setConfirmDelete(null)} className="btn-ghost text-sm">Cancel</button>
          <button onClick={() => handleDelete(confirmDelete)} disabled={!!deletingId}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
            {deletingId ? <Spinner size={13} /> : null} Delete
          </button>
        </div>
      </Modal>
    </Layout>
  );
}
