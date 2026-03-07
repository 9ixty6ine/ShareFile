import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Download, Lock, Shield, AlertTriangle, CheckCircle, FileDown } from "lucide-react";
import { shareAPI } from "../services/api";
import { formatBytes, downloadBlob } from "../utils/helpers";
import { Alert, Spinner, Logo } from "../components/UI";

export default function SharePage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const [needsPw, setNeedsPw] = useState(false);

  useEffect(() => {
    shareAPI.getInfo(token)
      .then(r => { setInfo(r.data); setNeedsPw(r.data.hasPassword); })
      .catch(err => setError(err.response?.data?.error || "Link not found or expired"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownload = async (e) => {
    e?.preventDefault();
    setError("");
    setDownloading(true);
    try {
      const res = await shareAPI.download(token, needsPw ? password : undefined);
      const cd = res.headers["content-disposition"];
      const filename = cd
        ? decodeURIComponent(cd.split('filename="')[1]?.replace('"', "") || info.fileName)
        : info.fileName;
      downloadBlob(res.data, filename);
      setDone(true);
    } catch (err) {
      if (err.response?.data?.requiresPassword) { setNeedsPw(true); setError("Password required"); }
      else setError(err.response?.data?.error || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      {/* Ambient orbs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(124,109,250,0.08) 0%, transparent 70%)" }} />
      <div className="fixed bottom-0 right-0 w-80 h-80 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(6,214,160,0.06) 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-sm z-10">
        <div className="flex justify-center mb-8 animate-fade-up">
          <Logo />
        </div>

        <div className="animate-fade-up delay-100 rounded-2xl p-8 relative overflow-hidden"
          style={{ background: "rgba(14,14,31,0.85)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(40px)", opacity: 0 }}>

          <div className="absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(124,109,250,0.8), transparent)" }} />

          {loading ? (
            <div className="flex justify-center py-12"><Spinner size={28} /></div>
          ) : error && !info ? (
            <div className="flex flex-col items-center py-8 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <AlertTriangle size={24} style={{ color: "#f87171" }} />
              </div>
              <div>
                <p className="heading text-lg font-semibold text-white mb-1">Link unavailable</p>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{error}</p>
              </div>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center py-8 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(6,214,160,0.08)", border: "1px solid rgba(6,214,160,0.2)" }}>
                <CheckCircle size={24} style={{ color: "#06d6a0" }} />
              </div>
              <div>
                <p className="heading text-lg font-semibold text-white mb-1">Download started!</p>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Your file is decrypted and downloading</p>
              </div>
              <button onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all mt-2"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                <Download size={14} /> Download again
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="heading text-xl font-bold text-white">Secure download</h1>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(124,109,250,0.1)", border: "1px solid rgba(124,109,250,0.2)" }}>
                  <Shield size={14} style={{ color: "#a89dff" }} />
                </div>
              </div>

              {/* File info */}
              <div className="rounded-xl p-4 mb-5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(124,109,250,0.1)", border: "1px solid rgba(124,109,250,0.15)" }}>
                    <FileDown size={16} style={{ color: "#a89dff" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{info?.fileName}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{formatBytes(info?.size || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-5">
                {info?.hasPassword && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                    style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}>
                    <Lock size={10} /> Password protected
                  </span>
                )}
                {info?.expiresAt && (
                  <span className="px-2.5 py-1 rounded-full text-xs"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
                    Expires {new Date(info.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError("")} /></div>}

              {needsPw ? (
                <form onSubmit={handleDownload} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>Password</label>
                    <div className="relative">
                      <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }} />
                      <input type="password" className="input pl-10" placeholder="••••••••"
                        value={password} onChange={e => setPassword(e.target.value)} required autoFocus />
                    </div>
                  </div>
                  <button type="submit" disabled={downloading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                    {downloading ? <><Spinner size={15} /> Decrypting...</> : <><Download size={15} /> Download file</>}
                  </button>
                </form>
              ) : (
                <button onClick={handleDownload} disabled={downloading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                  {downloading ? <><Spinner size={15} /> Decrypting...</> : <><Download size={15} /> Download file</>}
                </button>
              )}

              <p className="text-center text-xs mt-5" style={{ color: "rgba(255,255,255,0.2)" }}>
                Secured by SecureVault - AES-256 Encrypted
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
