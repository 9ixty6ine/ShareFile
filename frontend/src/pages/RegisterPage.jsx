import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Alert, Spinner, Logo } from "../components/UI";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form.email, form.password, form.name);
      navigate("/dashboard");
    } catch (err) {
      const errs = err.response?.data?.errors;
      setError(errs ? errs[0].msg : err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const reqs = [
    { label: "8+ chars", met: form.password.length >= 8 },
    { label: "Uppercase", met: /[A-Z]/.test(form.password) },
    { label: "Number", met: /[0-9]/.test(form.password) },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="fixed bottom-0 right-0 w-96 h-96 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(6,214,160,0.07) 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-sm z-10">
        <div className="flex justify-center mb-8 animate-fade-up">
          <Logo />
        </div>

        <div className="animate-fade-up delay-100 rounded-2xl p-8 relative overflow-hidden"
          style={{ background: "rgba(14,14,31,0.8)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(40px)" }}>

          <div className="absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(124,109,250,0.8), transparent)" }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(124,109,250,0.08) 0%, transparent 70%)" }} />

          <div className="relative">
            <h2 className="heading text-2xl font-bold text-white mb-1">Create account</h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Start sharing securely</p>

            {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError("")} /></div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <input type="text" required className="input pl-10" placeholder="Your name"
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <input type="email" required className="input pl-10" placeholder="you@example.com"
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <input type={showPw ? "text" : "password"} required className="input pl-10 pr-10" placeholder="••••••••"
                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {form.password.length > 0 && (
                  <div className="flex gap-3 mt-2">
                    {reqs.map(r => (
                      <span key={r.label} className="flex items-center gap-1 text-xs transition-all"
                        style={{ color: r.met ? "#06d6a0" : "rgba(255,255,255,0.3)" }}>
                        {r.met ? <Check size={10} /> : <span className="w-2.5 h-2.5 rounded-full border inline-block" style={{ borderColor: "rgba(255,255,255,0.2)" }} />}
                        {r.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2 py-3">
                {loading ? <><Spinner size={15} /> Creating...</> : <>Create account <ArrowRight size={15} /></>}
              </button>
            </form>

            <p className="text-center text-sm mt-6" style={{ color: "rgba(255,255,255,0.35)" }}>
              Already have an account?{" "}
              <Link to="/login" className="font-medium" style={{ color: "#a89dff" }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
