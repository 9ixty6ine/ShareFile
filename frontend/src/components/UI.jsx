import { useState } from "react";
import { Copy, Check, AlertCircle, X, Loader2, Shield } from "lucide-react";
import { copyToClipboard } from "../utils/helpers";

export function Spinner({ size = 16 }) { return <Loader2 size={size} className="animate-spin" />; }

export function Alert({ type = "error", message, onClose }) {
  if (!message) return null;
  const s = { error: "bg-red-500/10 border-red-500/20 text-red-400", success: "bg-green-500/10 border-green-500/20 text-green-400", info: "bg-blue-500/10 border-blue-500/20 text-blue-400" };
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${s[type]} animate-fade-in`}>
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
      <p className="flex-1">{message}</p>
      {onClose && <button onClick={onClose}><X size={14} /></button>}
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { await copyToClipboard(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all">
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
      {copied ? "Copied!" : label}
    </button>
  );
}

export function ProgressBar({ value }) {
  return <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-vault-500 rounded-full transition-all duration-300" style={{ width: `${Math.min(100,Math.max(0,value))}%` }} /></div>;
}

export function StorageBar({ used, limit }) {
  const pct = Math.min(100, (used / limit) * 100);
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-vault-500";
  const fmt = (b) => { if (!b) return "0 B"; const k=1024,s=["B","KB","MB","GB"],i=Math.floor(Math.log(b)/Math.log(k)); return `${(b/Math.pow(k,i)).toFixed(1)} ${s[i]}`; };
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1"><span>{fmt(used)} used</span><span>{fmt(limit)}</span></div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4"><Icon size={28} className="text-gray-500" /></div>
      <h3 className="text-gray-300 font-medium mb-1">{title}</h3>
      <p className="text-gray-500 text-sm max-w-xs">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Badge({ children, variant = "default" }) {
  const v = { default:"bg-white/10 text-gray-300", success:"bg-green-500/15 text-green-400", error:"bg-red-500/15 text-red-400", warning:"bg-yellow-500/15 text-yellow-400", primary:"bg-vault-500/15 text-vault-400" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${v[variant]}`}>{children}</span>;
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a1929] border border-white/10 rounded-2xl p-6 w-full max-w-md animate-slide-up shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-vault-600 flex items-center justify-center"><Shield size={16} className="text-white" /></div>
      <span className="font-semibold text-white">SecureVault</span>
    </div>
  );
}