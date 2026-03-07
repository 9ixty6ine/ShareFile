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
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = { fileId: file.id };
      if (form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString();
      if (form.maxDownloads) payload.maxDownloads = parseInt(form.maxDownloads);
      if (form.password) payload.password = form.password;
      const res = await shareAPI.create(payload);
      setResult(res.data.shareLink);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title={`Share: ${file.name}`} onClose={onClose}>
      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError("")} />}

          {[
            { label: "Expiry date", icon: Calendar, type: "datetime-local", key: "expiresAt", placeholder: "", min: new Date().toISOString().slice(0, 16) },
            { label: "Max downloads", icon: Hash, type: "number", key: "maxDownloads", placeholder: "Unlimited" },
            { label: "Password", icon: Lock, type: "password", key: "password", placeholder: "No password" },
          ].map(({ label, icon: Icon, type, key, placeholder, min }) => (
            <div key={key}>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-2"
                style={{ color: "rgba(255,255,255,0.45)" }}>
                <Icon size={12} /> {label} <span style={{ color: "rgba(255,255,255,0.25)" }}>(optional)</span>
              </label>
              <input type={type} className="input" placeholder={placeholder} min={min}
                value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
            </div>
          ))}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            {loading ? <><Spinner size={15} /> Creating...</> : <><Link2 size={15} /> Generate link</>}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col items-center py-4 gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(6,214,160,0.1)", border: "1px solid rgba(6,214,160,0.2)" }}>
              <Check size={24} style={{ color: "#06d6a0" }} />
            </div>
            <p className="heading text-lg font-semibold text-white">Link created!</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Share URL</p>
            <p className="text-sm font-mono break-all" style={{ color: "#a89dff" }}>{result.url}</p>
          </div>
          <div className="flex gap-2">
            <CopyButton text={result.url} label="Copy link" />
            <a href={result.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
              <ExternalLink size={12} /> Open
            </a>
          </div>
          <button onClick={onClose} className="btn-ghost w-full text-sm">Close</button>
        </div>
      )}
    </Modal>
  );
}
