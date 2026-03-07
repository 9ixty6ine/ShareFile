import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, File, X, CheckCircle, AlertCircle, Lock, UploadCloud } from "lucide-react";
import Layout from "../components/Layout";
import { filesAPI } from "../services/api";
import { ProgressBar, Spinner } from "../components/UI";
import { formatBytes } from "../utils/helpers";

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState([]);
  const inputRef = useRef();
  const navigate = useNavigate();

  const addFiles = (newFiles) =>
    setFiles(prev => [...prev, ...Array.from(newFiles).map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f, progress: 0, status: "pending", error: null,
    }))]);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files);
  }, []);

  const uploadFile = async (item) => {
    const formData = new FormData();
    formData.append("file", item.file);
    setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: "uploading" } : f));
    try {
      await filesAPI.upload(formData, p =>
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: p } : f))
      );
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: "done", progress: 100 } : f));
    } catch (err) {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: "error", error: err.response?.data?.error || "Upload failed" } : f));
    }
  };

  const allDone = files.length > 0 && files.every(f => f.status === "done");
  const hasPending = files.some(f => f.status === "pending");
  const hasUploading = files.some(f => f.status === "uploading");

  return (
    <Layout>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="heading text-3xl font-bold text-white">Upload Files</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>AES-256 encrypted before storage</p>
        </div>

        {/* Security badges */}
        <div className="flex flex-wrap gap-2 animate-fade-up delay-100" style={{ opacity: 0 }}>
          {["End-to-end encrypted", "Virus scanned", "Stored securely"].map(label => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: "rgba(124,109,250,0.08)", border: "1px solid rgba(124,109,250,0.15)", color: "#a89dff" }}>
              <Lock size={10} />
              {label}
            </div>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className="relative rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 animate-fade-up delay-200 overflow-hidden"
          style={{
            opacity: 0,
            background: dragOver ? "rgba(124,109,250,0.08)" : "rgba(255,255,255,0.02)",
            border: `2px dashed ${dragOver ? "rgba(124,109,250,0.5)" : "rgba(255,255,255,0.08)"}`,
            boxShadow: dragOver ? "0 0 40px rgba(124,109,250,0.1) inset" : "none",
          }}
        >
          <input ref={inputRef} type="file" multiple className="hidden" onChange={e => addFiles(e.target.files)} />

          {/* Animated icon */}
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 transition-all duration-300"
            style={{
              background: dragOver ? "rgba(124,109,250,0.2)" : "rgba(124,109,250,0.08)",
              border: `1px solid ${dragOver ? "rgba(124,109,250,0.4)" : "rgba(124,109,250,0.15)"}`,
              transform: dragOver ? "scale(1.1)" : "scale(1)",
            }}>
            <UploadCloud size={32} style={{ color: dragOver ? "#a89dff" : "rgba(124,109,250,0.6)" }} />
          </div>

          <p className="heading text-lg font-semibold text-white mb-1">
            {dragOver ? "Drop it!" : "Drop files here or click to browse"}
          </p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Images, videos, documents, archives - Max 100MB
          </p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2 animate-fade-up">
            {files.map(item => (
              <div key={item.id} className="rounded-xl p-4 transition-all duration-300"
                style={{
                  background: item.status === "done" ? "rgba(6,214,160,0.05)" : item.status === "error" ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${item.status === "done" ? "rgba(6,214,160,0.2)" : item.status === "error" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.07)"}`,
                }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <File size={14} style={{ color: "rgba(255,255,255,0.5)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm text-white truncate font-medium">{item.file.name}</p>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{formatBytes(item.file.size)}</span>
                        {item.status === "done" && <CheckCircle size={14} style={{ color: "#06d6a0" }} />}
                        {item.status === "error" && <AlertCircle size={14} style={{ color: "#f87171" }} />}
                        {item.status === "uploading" && <Spinner size={14} />}
                        {item.status === "pending" && (
                          <button onClick={e => { e.stopPropagation(); setFiles(p => p.filter(f => f.id !== item.id)); }}
                            style={{ color: "rgba(255,255,255,0.3)" }} className="hover:text-red-400 transition-colors">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    {item.status === "uploading" && <ProgressBar value={item.progress} />}
                    {item.status === "error" && <p className="text-xs" style={{ color: "#f87171" }}>{item.error}</p>}
                    {item.status === "done" && <p className="text-xs" style={{ color: "#06d6a0" }}>Encrypted and stored</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {files.length > 0 && (
          <div className="flex items-center gap-3">
            {hasPending && !hasUploading && (
              <button onClick={() => files.filter(f => f.status === "pending").forEach(uploadFile)}
                className="btn-primary flex items-center gap-2">
                <Upload size={15} /> Upload {files.filter(f => f.status === "pending").length} file(s)
              </button>
            )}
            {hasUploading && (
              <button disabled className="btn-primary flex items-center gap-2 opacity-70">
                <Spinner size={15} /> Uploading...
              </button>
            )}
            {allDone && (
              <button onClick={() => navigate("/files")} className="btn-primary flex items-center gap-2">
                View my files
              </button>
            )}
            <button onClick={() => setFiles([])} className="btn-ghost text-sm">Clear all</button>
          </div>
        )}
      </div>
    </Layout>
  );
}
