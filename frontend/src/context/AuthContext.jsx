import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => { try { const s = localStorage.getItem("user"); return s ? JSON.parse(s) : null; } catch { return null; } });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      authAPI.getMe().then((res) => { setUser(res.data.user); localStorage.setItem("user", JSON.stringify(res.data.user)); })
        .catch(() => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); })
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, []);
  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem("token", res.data.token); localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user); return res.data.user;
  };
  const register = async (email, password, name) => {
    const res = await authAPI.register({ email, password, name });
    localStorage.setItem("token", res.data.token); localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user); return res.data.user;
  };
  const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); };
  return <AuthContext.Provider value={{ user, login, register, logout, loading }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth must be inside AuthProvider"); return ctx; }