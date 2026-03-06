import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Upload, Files, Link as LinkIcon, Download, ArrowRight } from "lucide-react";
import Layout from "../components/Layout";
import { analyticsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatBytes } from "../utils/helpers";
import { Spinner, StorageBar } from "../components/UI";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";

const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="bg-[#1a1929] border border-white/10 rounded-lg p-2 text-xs"><p className="text-gray-400">{label}</p><p className="text-white font-medium">{payload[0].value} downloads</p></div>
) : null;

export default function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { analyticsAPI.get().then((r) => setAnalytics(r.data)).catch(console.error).finally(() => setLoading(false)); }, []);

  if (loading) return <Layout><div className="flex justify-center py-20"><Spinner size={24} /></div></Layout>;
  const { overview, activity, topFiles } = analytics || {};

  return (
    <Layout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-2xl font-semibold text-white">Welcome back, {user?.name?.split(" ")[0]} ðŸ‘‹</h1><p className="text-gray-400 text-sm mt-1">Your vault overview</p></div>
          <Link to="/upload" className="btn-primary flex items-center gap-2"><Upload size={16} /> Upload file</Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[["Total files", overview?.totalFiles ?? 0, Files], ["Downloads", overview?.totalDownloads ?? 0, Download], ["Share links", overview?.totalShareLinks ?? 0, LinkIcon], ["Storage used", formatBytes(overview?.totalStorageUsed ?? 0), Upload]].map(([label, value, Icon]) => (
            <div key={label} className="card flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-vault-500/10 flex items-center justify-center flex-shrink-0"><Icon size={18} className="text-vault-400" /></div>
              <div><p className="text-gray-400 text-sm">{label}</p><p className="text-2xl font-semibold text-white mt-0.5">{value}</p></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 card">
            <div className="flex justify-between mb-4"><h2 className="font-medium text-white">Download activity</h2><span className="text-xs text-gray-500">Last 30 days</span></div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={activity || []}>
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="date" hide /><Tooltip content={<TT />} />
                <Area type="monotone" dataKey="downloads" stroke="#6366f1" fill="url(#g)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h2 className="font-medium text-white mb-4">Top files</h2>
            <div className="space-y-3">
              {topFiles?.length > 0 ? topFiles.map((f, i) => (
                <div key={f.id} className="flex items-center gap-3"><span className="text-xs text-gray-500 w-4">{i+1}</span><div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{f.name}</p><p className="text-xs text-gray-500">{f.downloads} downloads</p></div></div>
              )) : <p className="text-gray-500 text-sm">No files yet</p>}
            </div>
          </div>
        </div>
        <div className="card mt-4">
          <div className="flex justify-between mb-3"><h2 className="font-medium text-white">Storage</h2><Link to="/files" className="text-sm text-vault-400 flex items-center gap-1">Manage <ArrowRight size={13} /></Link></div>
          <StorageBar used={user?.storage_used || user?.storageUsed || 0} limit={user?.storage_limit || user?.storageLimit || 5368709120} />
        </div>
      </div>
    </Layout>
  );
}