import { useState, useEffect } from "react";
import { BarChart3, Download, Globe, HardDrive } from "lucide-react";
import Layout from "../components/Layout";
import { analyticsAPI } from "../services/api";
import { formatBytes, formatDate } from "../utils/helpers";
import { Spinner } from "../components/UI";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#6366f1","#818cf8","#a5b4fc","#c7d2fe","#e0e7ff"];
const TT = ({ active, payload, label }) => active && payload?.length ? <div className="bg-[#1a1929] border border-white/10 rounded-lg p-2 text-xs"><p className="text-gray-400">{label}</p><p className="text-white font-medium">{payload[0].value}</p></div> : null;

export default function AnalyticsPage() {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { analyticsAPI.get().then((r) => setData(r.data)).catch(console.error).finally(() => setLoading(false)); }, []);
  if (loading) return <Layout><div className="flex justify-center py-20"><Spinner size={24} /></div></Layout>;
  const { overview, topFiles, activity, recentLogs } = data || {};
  const chartData = (activity || []).map((a) => ({ ...a, label: new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) }));

  return (
    <Layout>
      <div className="animate-fade-in">
        <div className="mb-6"><h1 className="text-2xl font-semibold text-white">Analytics</h1><p className="text-gray-400 text-sm mt-1">Your file sharing statistics</p></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[[BarChart3,"Total files",overview?.totalFiles ?? 0],[Download,"Total downloads",overview?.totalDownloads ?? 0],[Globe,"Share links",overview?.totalShareLinks ?? 0],[HardDrive,"Storage used",formatBytes(overview?.totalStorageUsed ?? 0)]].map(([Icon,label,value]) => (
            <div key={label} className="card"><div className="flex items-center gap-3 mb-2"><Icon size={15} className="text-vault-400" /><p className="text-xs text-gray-400">{label}</p></div><p className="text-2xl font-semibold text-white">{value}</p></div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-2 card">
            <h2 className="font-medium text-white mb-4">Downloads over time</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fill:"#6b7280", fontSize:10 }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fill:"#6b7280", fontSize:10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<TT />} />
                <Area type="monotone" dataKey="downloads" stroke="#6366f1" fill="url(#ag)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h2 className="font-medium text-white mb-4">Top files</h2>
            {topFiles?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topFiles} layout="vertical">
                  <XAxis type="number" hide /><YAxis type="category" dataKey="name" width={80} tick={{ fill:"#6b7280", fontSize:10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v.length > 12 ? v.slice(0,12)+"â€¦" : v} />
                  <Tooltip content={<TT />} />
                  <Bar dataKey="downloads" radius={[0,4,4,0]}>{topFiles.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-500 text-sm text-center py-8">No data yet</p>}
          </div>
        </div>
        <div className="card">
          <h2 className="font-medium text-white mb-4">Recent downloads</h2>
          {recentLogs?.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5">{["File","IP","Date"].map((h) => <th key={h} className="text-left text-xs text-gray-500 pb-2 pr-4">{h}</th>)}</tr></thead>
              <tbody>{recentLogs.map((log, i) => <tr key={i} className="border-b border-white/5 last:border-0"><td className="py-2 pr-4 text-white">{log.fileName}</td><td className="py-2 pr-4 text-gray-400 font-mono">{log.ip || "Unknown"}</td><td className="py-2 text-gray-400">{formatDate(log.downloadedAt)}</td></tr>)}</tbody>
            </table>
          ) : <p className="text-gray-500 text-sm text-center py-8">No downloads yet</p>}
        </div>
      </div>
    </Layout>
  );
}