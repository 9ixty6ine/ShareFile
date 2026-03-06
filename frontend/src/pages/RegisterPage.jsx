import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Alert, Spinner } from "../components/UI";

export default function RegisterPage() {
  const [form, setForm] = useState({ name:"", email:"", password:"" });
  const [showPw, setShowPw] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const { register } = useAuth(); const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await register(form.email, form.password, form.name); navigate("/dashboard"); }
    catch (err) { const errs = err.response?.data?.errors; setError(errs ? errs[0].msg : err.response?.data?.error || "Registration failed"); }
    finally { setLoading(false); }
  };

  const reqs = [{ label:"8+ chars", met: form.password.length >= 8 }, { label:"Uppercase", met: /[A-Z]/.test(form.password) }, { label:"Number", met: /[0-9]/.test(form.password) }];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-vault-600/10 rounded-full blur-3xl" /></div>
      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-vault-600 flex items-center justify-center"><Shield size={20} className="text-white" /></div>
          <h1 className="text-2xl font-semibold text-white">SecureVault</h1>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-1">Create account</h2>
          <p className="text-gray-400 text-sm mb-5">Start sharing securely</p>
          {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError("")} /></div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Name</label>
              <div className="relative"><User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" required className="input pl-9" placeholder="Your name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <div className="relative"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="email" required className="input pl-9" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <div className="relative"><Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type={showPw ? "text" : "password"} required className="input pl-9 pr-9" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
              {form.password.length > 0 && <div className="flex gap-3 mt-2">{reqs.map((r) => <span key={r.label} className={`text-xs ${r.met ? "text-green-400" : "text-gray-500"}`}>{r.met ? "âœ“" : "â-‹"} {r.label}</span>)}</div>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {loading ? <><Spinner size={15} /> Creating...</> : "Create account"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">Already have an account? <Link to="/login" className="text-vault-400 hover:text-vault-300 font-medium">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}