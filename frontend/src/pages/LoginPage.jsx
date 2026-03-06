import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Alert, Spinner } from "../components/UI";

export default function LoginPage() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const { login } = useAuth(); const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await login(email, password); navigate("/dashboard"); }
    catch (err) { setError(err.response?.data?.error || "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-vault-600/10 rounded-full blur-3xl" /></div>
      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-vault-600 flex items-center justify-center"><Shield size={20} className="text-white" /></div>
          <h1 className="text-2xl font-semibold text-white">SecureVault</h1>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-1">Welcome back</h2>
          <p className="text-gray-400 text-sm mb-5">Sign in to your vault</p>
          {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError("")} /></div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="email" required className="input pl-9" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <div className="relative"><Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type={showPw ? "text" : "password"} required className="input pl-9 pr-9" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {loading ? <><Spinner size={15} /> Signing in...</> : "Sign in"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">No account? <Link to="/register" className="text-vault-400 hover:text-vault-300 font-medium">Create one</Link></p>
        </div>
      </div>
    </div>
  );
}