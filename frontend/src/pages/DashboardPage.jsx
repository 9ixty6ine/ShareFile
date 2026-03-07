import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Upload, Files, Link as LinkIcon, Download, ArrowRight, TrendingUp } from "lucide-react";
import Layout from "../components/Layout";
import { analyticsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatBytes } from "../utils/helpers";
import { Spinner, StorageBar } from "../components/UI";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";

const CustomTooltip = ({ active, payload, label }) =>
  active && payload?.length ? (
    <div className="rounded-xl px-3 py-2 text-xs"
      style={{ background: "rgba(14,14,31,0.95)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)" }}>
      <p style={{ color: "rgba(255,255,255,0.5)" }}>{label}</p>
      <p className="font-semibold text-white mt-0.5">{payload[0].value} downloads</p>
    </div>
  ) : null;

const statCards = (overview) => [
  { label: "Total Files", value: overview?.totalFiles ?? 0, icon: Files, color: "#7c6dfa", glow: "rgba(124,109,250,0.2)" },
  { label: "Downloads", value: overview?.totalDownloads ?? 0, icon: Download, color: "#06d6a0", glow: "rgba(6,214,160,0.2)" },
  { label: "Share Links", value: overview?.totalShareLinks ?? 0, icon: LinkIcon, color: "#f59e0b", glow: "rgba(245,158,11,0.2)" },
  { label: "Storage Used", value: formatBytes(overview?.totalStorageUsed ?? 0), icon: TrendingUp, color: "#ec4899", glow: "rgba(236,72,153,0.2)" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.get().then(r => setAnalytics(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout>
      <div className="flex justify-center items-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
            style={{ background: "rgba(124,109,250,0.1)", border: "1px solid rgba(124,109,250,0.2)" }}>
            <Spinner size={20} />
          </div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading your vault...</p>
        </div>
      </div>
    </Layout>
  );

  const { overview, activity, topFiles } = analytics || {};
  const cards = statCards(overview);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-up">
          <div>
            <h1 className="heading text-3xl font-bold text-white">
              Hey, {user?.name?.split(" ")[0]} <span className="animate-pulse">👋</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Here's what's happening in your vault</p>
          </div>
          <Link to="/upload" className="btn-primary flex items-center gap-2">
            <Upload size={15} /> Upload file
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(({ label, value, icon: Icon, color, glow }, i) => (
            <div key={label} className="glass-card p-5 animate-fade-up" style={{ animationDelay: `${i * 0.08}s`, opacity: 0 }}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: glow, border: `1px solid ${color}30` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
              </div>
              <p className="text-2xl font-bold text-white heading">{value}</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Activity Chart */}
          <div className="col-span-2 glass-card p-6 animate-fade-up delay-300" style={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="heading font-semibold text-white">Download Activity</h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Last 30 days</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={activity || []}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c6dfa" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#7c6dfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="downloads" stroke="#7c6dfa" strokeWidth={2} fill="url(#areaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top Files */}
          <div className="glass-card p-6 animate-fade-up delay-400" style={{ opacity: 0 }}>
            <h2 className="heading font-semibold text-white mb-4">Top Files</h2>
            <div className="space-y-3">
              {topFiles?.length > 0 ? topFiles.map((f, i) => (
                <div key={f.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold heading w-4" style={{ color: i === 0 ? "#7c6dfa" : "rgba(255,255,255,0.3)" }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate font-medium">{f.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{f.downloads} downloads</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>No files yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Storage */}
        <div className="glass-card p-6 animate-fade-up delay-500" style={{ opacity: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading font-semibold text-white">Storage</h2>
            <Link to="/files" className="flex items-center gap-1.5 text-xs font-medium transition-colors"
              style={{ color: "#a89dff" }}>
              Manage <ArrowRight size={12} />
            </Link>
          </div>
          <StorageBar
            used={user?.storage_used || user?.storageUsed || 0}
            limit={user?.storage_limit || user?.storageLimit || 5368709120}
          />
        </div>
      </div>
    </Layout>
  );
}
