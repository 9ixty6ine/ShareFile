import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Files, Trash2, Share2, Upload, Search, File } from "lucide-react";
import Layout from "../components/Layout";
import { filesAPI } from "../services/api";
import { formatBytes, formatDate } from "../utils/helpers";
import { EmptyState, Badge, Spinner, Alert, Modal } from "../components/UI";
import ShareLinkModal from "../components/ShareLinkModal";

export default function FilesPage() {
  const [files, setFiles] = useState([]); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null); const [shareFile, setShareFile] = useState(null); const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { filesAPI.list().then((r) => setFiles(r.data.files)).catch(() => setError("Failed to load files")).finally(() => setLoading(false)); }, []);

  const handleDelete = async (file) => {
    setDeletingId(file.id);
    try { await filesAPI.delete(file.id); setFiles((p) => p.filter((f) => f.id !== file.id)); setConfirmDelete(null); }
    catch (err) { setError(err.response?.data?.error || "Delete failed"); }
    finally { setDeletingId(null); }
  };

  const filtered = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-semibold text-white">My Files</h1><p className="text-gray-400 text-sm mt-1">{files.length} encrypted file{files.length !== 1 ? "s" : ""}</p></div>
          <Link to="/upload" className="btn-primary flex items-center gap-2"><Upload size={15} /> Upload</Link>
        </div>
        {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError("")} /></div>}
        {files.length > 0 && (
          <div className="relative mb-4"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input className="input pl-9 max-w-xs" placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        )}
        {loading ? <div className="flex justify-center py-20"><Spinner size={24} /></div>
        : filtered.length === 0 ? <EmptyState icon={Files} title={search ? "No matching files" : "No files yet"} description={search ? "Try a different search" : "Upload your first file"} action={!search && <Link to="/upload" className="btn-primary">Upload file</Link>} />
        : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-white/5">{["Name","Size","Uploaded","Downloads",""].map((h) => <th key={h} className={`text-left text-xs font-medium text-gray-500 px-5 py-3 ${h === "" ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((file) => (
                  <tr key={file.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"><File size={14} className="text-gray-400" /></div>
                        <div><p className="text-sm text-white truncate max-w-[200px]">{file.name}</p>{file.shareCount > 0 && <Badge variant="primary">{file.shareCount} link{file.shareCount > 1 ? "s" : ""}</Badge>}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400">{formatBytes(file.size)}</td>
                    <td className="px-5 py-3 text-sm text-gray-400">{formatDate(file.uploadDate)}</td>
                    <td className="px-5 py-3 text-sm text-gray-400">{file.totalDownloads}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setShareFile(file)} className="p-1.5 text-gray-400 hover:text-vault-400 hover:bg-vault-500/10 rounded-lg transition-all" title="Share"><Share2 size={14} /></button>
                        <button onClick={() => setConfirmDelete(file)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Delete"><Trash2 size={14} /></button>
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
        <p className="text-gray-400 text-sm mb-5">Delete <strong className="text-white">{confirmDelete?.name}</strong>? All share links will be revoked.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setConfirmDelete(null)} className="btn-ghost text-sm">Cancel</button>
          <button onClick={() => handleDelete(confirmDelete)} disabled={!!deletingId} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            {deletingId ? <Spinner size={13} /> : null} Delete
          </button>
        </div>
      </Modal>
    </Layout>
  );
}