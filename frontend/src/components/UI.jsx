import { useState } from "react";
import { Copy, Check, AlertCircle, X, Loader2, Shield } from "lucide-react";
import { copyToClipboard } from "../utils/helpers";

export function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="animate-spin" />;
}

export function Alert({ type = "error", message, onClose }) {
  if (!message) return null;
  const styles = {
    error: "bg-red-500/10 border-red-500/20 text-red-400",
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    info: "bg-violet-500/10 border-violet-500/20 text-violet-400",
  };
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border text-sm animate-fade-in ${styles[type]}`}>
      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
      <p className="flex-1">{message}</p>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">
          <X size={13} />
        </button>
      )}
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: copied ? "#06d6a0" : "rgba(255,255,255,0.6)" }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied!" : label}
    </button>
  );
}

export function ProgressBar({ value }) {
  return (
    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: "linear-gradient(90deg, #7c6dfa, #06d6a0)",
        }}
      />
    </div>
  );
}

export function StorageBar({ used, limit }) {
  const pct = Math.min(100, (used / limit) * 100);
  const color = pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#7c6dfa";
  const fmt = (b) => {
    if (!b) return "0 B";
    const k = 1024, s = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
  };
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
        <span>{fmt(used)}</span>
        <span>{fmt(limit)}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
        style={{ background: "rgba(124,109,250,0.08)", border: "1px solid rgba(124,109,250,0.15)" }}>
        <Icon size={32} style={{ color: "rgba(124,109,250,0.6)" }} />
      </div>
      <h3 className="heading text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm max-w-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Badge({ children, variant = "default" }) {
  const styles = {
    default: { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" },
    success: { background: "rgba(6,214,160,0.12)", color: "#06d6a0" },
    error: { background: "rgba(239,68,68,0.12)", color: "#f87171" },
    warning: { background: "rgba(245,158,11,0.12)", color: "#fbbf24" },
    primary: { background: "rgba(124,109,250,0.15)", color: "#a89dff" },
  };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ ...styles[variant], border: `1px solid ${styles[variant].color}30` }}>
      {children}
    </span>
  );
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(8,8,18,0.8)", backdropFilter: "blur(8px)" }} onClick={onClose} />
      <div className="relative w-full max-w-md animate-fade-up rounded-2xl p-6 shadow-2xl"
        style={{ background: "rgba(14,14,31,0.95)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(40px)" }}>
        <div className="absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(124,109,250,0.6), transparent)" }} />
        <div className="flex items-center justify-between mb-5">
          <h2 className="heading text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)" }}
            onMouseOver={e => e.currentTarget.style.color = "white"}
            onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}>
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Logo({ size = "md" }) {
  const s = size === "sm" ? { icon: 14, text: "text-base", box: "w-7 h-7 rounded-lg" } : { icon: 18, text: "text-xl", box: "w-10 h-10 rounded-xl" };
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${s.box} flex items-center justify-center relative`}
        style={{ background: "linear-gradient(135deg, #7c6dfa, #5b4fcf)", boxShadow: "0 4px 20px rgba(124,109,250,0.4)" }}>
        <Shield size={s.icon} className="text-white" />
        <div className="absolute inset-0 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.2), transparent)" }} />
      </div>
      <span className={`heading font-bold text-white ${s.text}`}>SecureVault</span>
    </div>
  );
}
