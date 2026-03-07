import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Alert, Spinner, Logo } from "../components/UI";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Ambient orb bottom right */}
      <div className="fixed bottom-0 right-0 w-96 h-96 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(6,214,160,0.07) 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-sm z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8 animate-fade-up">
          <Logo />
        </div>

        {/* Card */}
        <div className="animate-fade-up delay-100 rounded-2xl p-8 relative overflow-hidden"
          style={{ background: "rgba(14,14,31,0.8)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(40px)" }}>

          {/* Top accent */}
          <div className="absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(124,109,250,0.8), transparent)" }} />

          {/* Subtle inner glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(124,109,250,0.08) 0%, transparent 70%)" }} />

          <div className="relative">
            <h2 className="heading text-2xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Sign in to your vault</p>

            {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError("")} /></div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <input
                    type="email" required
                    className="input pl-10"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <input
                    type={showPw ? "text" : "password"} required
                    className="input pl-10 pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "rgba(255,255,255,0.3)" }}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2 py-3">
                {loading ? <><Spinner size={15} /> Signing in...</> : <>Sign in <ArrowRight size={15} /></>}
              </button>
            </form>

            <p className="text-center text-sm mt-6" style={{ color: "rgba(255,255,255,0.35)" }}>
              No account?{" "}
              <Link to="/register" className="font-medium transition-colors"
                style={{ color: "#a89dff" }}
                onMouseOver={e => e.target.style.color = "#7c6dfa"}
                onMouseOut={e => e.target.style.color = "#a89dff"}>
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
