import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, File, X, CheckCircle, AlertCircle, Lock } from "lucide-react";
import Layout from "../components/Layout";
import { filesAPI } from "../services/api";
import { ProgressBar, Spinner } from "../components/UI";
import { formatBytes } from "../utils/helpers";

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState([]);
  const inputRef = useRef();
  const navigate = useNavigate();

  const addFiles = (newFiles) => setFiles((prev) => [...prev, ...Array.from(newFiles).map((f) => ({ id: Math.random().toString(36).slice(2), file: f, progress: 0, status: "pending", error: null }))]);
  const handleDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }, []);

  const uploadFile = async (item) => {
    const formData = new FormData(); formData.append("file", item.file);
    setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "uploading" } : f));
    try {
      await filesAPI.upload(formData, (p) => setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, progress: p } : f)));
      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "done", progress: 100 } : f));
    } catch (err) {
      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "error", error: err.response?.data?.error || "Upload failed" } : f));
    }
  };

  const allDone = files.length > 0 && files.every((f) => f.status === "done");
  const hasPending = files.some((f) => f.status === "pending");
  const hasUploading = files.some((f) => f.status === "uploading");

  return (
    <Layout>
      <div className="max-w-2xl animate-fade-in">
        <div className="mb-6"><h1 className="text-2xl font-semibold text-white">Upload files</h1><p className="text-gray-400 text-sm mt-1">Files are AES-256 encrypted before storage</p></div>
        <div className="flex items-center gap-2 mb-4 text-xs text-gray-400"><Lock size={13} className="text-vault-400" /><span>End-to-end encrypted - Virus scanned - Stored securely</span></div>
        <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${dragOver ? "border-vault-500 bg-vault-500/10" : "border-white/10 hover:border-white/20"}`}>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          <div className="w-16 h-16 rounded-2xl bg-vault-600/20 flex items-center justify-center mx-auto mb-4"><Upload size={28} className="text-vault-400" /></div>
          <p className="text-white font-medium">Drop files here or click to browse</p>
          <p className="text-gray-500 text-sm mt-1">Images, videos, documents, archives â€¢ Max 100MB</p>
        </div>
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((item) => (
              <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"><File size={14} className="text-gray-400" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-white truncate">{item.file.name}</p>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-gray-500">{formatBytes(item.file.size)}</span>
                        {item.status === "done" && <CheckCircle size={14} className="text-green-400" />}
                        {item.status === "error" && <AlertCircle size={14} className="text-red-400" />}
                        {item.status === "uploading" && <Spinner size={14} />}
                        {item.status === "pending" && <button onClick={(e) => { e.stopPropagation(); setFiles((p) => p.filter((f) => f.id !== item.id)); }} className="text-gray-500 hover:text-red-400"><X size={14} /></button>}
                      </div>
                    </div>
                    {item.status === "uploading" && <ProgressBar value={item.progress} />}
                    {item.status === "error" && <p className="text-xs text-red-400">{item.error}</p>}
                    {item.status === "done" && <p className="text-xs text-green-400">Encrypted and stored</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {files.length > 0 && (
          <div className="flex items-center gap-3 mt-4">
            {hasPending && !hasUploading && <button onClick={() => files.filter((f) => f.status === "pending").forEach(uploadFile)} className="btn-primary flex items-center gap-2"><Upload size={15} /> Upload {files.filter((f) => f.status === "pending").length} file(s)</button>}
            {hasUploading && <button disabled className="btn-primary flex items-center gap-2"><Spinner size={15} /> Uploading...</button>}
            {allDone && <button onClick={() => navigate("/files")} className="btn-primary">View my files â†’</button>}
            <button onClick={() => setFiles([])} className="btn-ghost text-sm">Clear all</button>
          </div>
        )}
      </div>
    </Layout>
  );
}