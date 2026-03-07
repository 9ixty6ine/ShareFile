import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Files, Upload, Link, BarChart3, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { StorageBar, Logo } from "./UI";

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
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col z-40"
      style={{ background: "rgba(8,8,18,0.7)", borderRight: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(40px)" }}>

      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(124,109,250,0.5), transparent)" }} />

      {/* Logo */}
      <div className="p-5 pb-4">
        <Logo />
      </div>

      <div className="px-3 mb-2">
        <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }, i) => (
          <NavLink
            key={to}
            to={to}
            style={{ animationDelay: `${i * 0.06}s`, opacity: 0 }}
            className={({ isActive }) =>
              `nav-link animate-slide-left ${isActive ? "active" : ""}`
            }
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom user section */}
      <div className="p-4 space-y-4">
        <div className="accent-line" />

        {user && (
          <>
            <StorageBar
              used={user.storage_used || user.storageUsed || 0}
              limit={user.storage_limit || user.storageLimit || 5368709120}
            />
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate heading">{user.name}</p>
                <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{user.email}</p>
              </div>
              <button
                onClick={() => { logout(); navigate("/login"); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0"
                style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                onMouseOver={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
                onMouseOut={e => { e.currentTarget.style.color = "rgba(255,255,255,0.35)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
