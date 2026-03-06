import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Download, Lock, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { shareAPI } from "../services/api";
import { formatBytes, downloadBlob } from "../utils/helpers";
import { Alert, Spinner } from "../components/UI";

export default function SharePage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); const [password, setPassword] = useState("");
  const [downloading, setDownloading] = useState(false); const [done, setDone] = useState(false); const [needsPw, setNeedsPw] = useState(false);

  useEffect(() => {
    shareAPI.getInfo(token).then((r) => { setInfo(r.data); setNeedsPw(r.data.hasPassword); })
      .catch((err) => setError(err.response?.data?.error || "Link not found or expired"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownload = async (e) => {
    e?.preventDefault(); setError(""); setDownloading(true);
    try {
      const res = await shareAPI.download(token, needsPw ? password : undefined);
      const cd = res.headers["content-disposition"];
      const filename = cd ? decodeURIComponent(cd.split('filename="')[1]?.replace('"',"") || info.fileName) : info.fileName;
      downloadBlob(res.data, filename); setDone(true);
    } catch (err) {
      if (err.response?.data?.requiresPassword) { setNeedsPw(true); setError("Password required"); }
      else setError(err.response?.data?.error || "Download failed");
    } finally { setDownloading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <div className="absolute inset-0"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-vault-600/8 rounded-full blur-3xl" /></div>
      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-vault-600 flex items-center justify-center"><Shield size={20} className="text-white" /></div>
          <h1 className="text-2xl font-semibold text-white">SecureVault</h1>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-7 shadow-2xl">
          {loading ? <div className="flex justify-center py-8"><Spinner size={28} /></div>
          : error && !info ? (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center"><AlertTriangle size={20} className="text-red-400" /></div>
              <p className="text-white font-medium">Link unavailable</p>
              <p className="text-gray-400 text-sm">{error}</p>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center"><CheckCircle size={20} className="text-green-400" /></div>
              <p className="text-white font-medium">Download started!</p>
              <button onClick={handleDownload} className="btn-ghost text-sm flex items-center gap-2 mt-2"><Download size={14} /> Download again</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2"><h1 className="font-semibold text-white text-lg">Secure file download</h1><Shield size={15} className="text-vault-400" /></div>
              <div className="bg-white/5 rounded-xl p-4 mb-4"><p className="text-white font-medium truncate">{info?.fileName}</p><p className="text-gray-400 text-sm mt-0.5">{formatBytes(info?.size || 0)}</p></div>
              <div className="flex flex-wrap gap-2 mb-4">
                {info?.hasPassword && <span className="flex items-center gap-1 bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full text-xs"><Lock size={10} /> Password protected</span>}
                {info?.expiresAt && <span className="bg-white/5 px-2 py-0.5 rounded-full text-xs text-gray-400">Expires {new Date(info.expiresAt).toLocaleDateString()}</span>}
              </div>
              {error && <div className="mb-3"><Alert type="error" message={error} onClose={() => setError("")} /></div>}
              {needsPw ? (
                <form onSubmit={handleDownload} className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Password</label>
                    <div className="relative"><Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input type="password" className="input pl-9" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
                    </div>
                  </div>
                  <button type="submit" disabled={downloading} className="btn-primary w-full flex items-center justify-center gap-2">
                    {downloading ? <><Spinner size={15} /> Decrypting...</> : <><Download size={15} /> Download file</>}
                  </button>
                </form>
              ) : (
                <button onClick={handleDownload} disabled={downloading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {downloading ? <><Spinner size={15} /> Decrypting...</> : <><Download size={15} /> Download file</>}
                </button>
              )}
              <p className="text-center text-xs text-gray-600 mt-4">ðŸ”’ Shared via SecureVault â€” End-to-end encrypted</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}