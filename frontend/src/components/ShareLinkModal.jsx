import { useState } from "react";
import { Link2, Calendar, Hash, Lock, Check, ExternalLink } from "lucide-react";
import { shareAPI } from "../services/api";
import { Modal, CopyButton, Alert, Spinner } from "./UI";

export default function ShareLinkModal({ file, onClose }) {
  const [form, setForm] = useState({ expiresAt: "", maxDownloads: "", password: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const payload = { fileId: file.id };
      if (form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString();
      if (form.maxDownloads) payload.maxDownloads = parseInt(form.maxDownloads);
      if (form.password) payload.password = form.password;
      const res = await shareAPI.create(payload);
      setResult(res.data.shareLink);
    } catch (err) { setError(err.response?.data?.error || "Failed to create link"); }
    finally { setLoading(false); }
  };

  return (
    <Modal open title={`Share: ${file.name}`} onClose={onClose}>
      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError("")} />}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1.5"><Calendar size={13} /> Expiry date (optional)</label>
            <input type="datetime-local" className="input" min={new Date().toISOString().slice(0,16)} value={form.expiresAt} onChange={(e) => setForm({...form, expiresAt: e.target.value})} />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1.5"><Hash size={13} /> Max downloads (optional)</label>
            <input type="number" className="input" placeholder="Unlimited" min="1" value={form.maxDownloads} onChange={(e) => setForm({...form, maxDownloads: e.target.value})} />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-1.5"><Lock size={13} /> Password (optional)</label>
            <input type="password" className="input" placeholder="No password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <><Spinner size={15} /> Creating...</> : <><Link2 size={15} /> Generate link</>}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mx-auto"><Check size={22} className="text-green-400" /></div>
          <p className="text-center text-white font-medium">Link created!</p>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Share URL</p>
            <p className="text-sm text-vault-400 font-mono break-all">{result.url}</p>
          </div>
          <div className="flex gap-2">
            <CopyButton text={result.url} label="Copy link" />
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-gray-300 transition-all">
              <ExternalLink size={13} /> Open
            </a>
          </div>
          <button onClick={onClose} className="btn-ghost w-full text-sm">Close</button>
        </div>
      )}
    </Modal>
  );
}