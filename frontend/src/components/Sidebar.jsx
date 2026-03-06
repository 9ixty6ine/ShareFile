import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Files, Upload, Link, BarChart3, LogOut, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { StorageBar } from "./UI";

const nav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/files",     icon: Files,           label: "My Files" },
  { to: "/upload",    icon: Upload,          label: "Upload" },
  { to: "/shares",    icon: Link,            label: "Share Links" },
  { to: "/analytics", icon: BarChart3,       label: "Analytics" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-white/5 border-r border-white/10 flex flex-col z-40">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-vault-600 flex items-center justify-center"><Shield size={16} className="text-white" /></div>
          <span className="font-semibold text-white">SecureVault</span>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? "bg-vault-600/20 text-vault-400 border border-vault-500/20" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
            <Icon size={16} />{label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10 space-y-3">
        {user && <>
          <StorageBar used={user.storage_used || user.storageUsed || 0} limit={user.storage_limit || user.storageLimit || 5368709120} />
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button onClick={() => { logout(); navigate("/login"); }} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Logout">
              <LogOut size={15} />
            </button>
          </div>
        </>}
      </div>
    </aside>
  );
}