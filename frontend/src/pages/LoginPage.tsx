// src/pages/LoginPage.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Eye, EyeOff, Lock, Mail, ChevronLeft } from "lucide-react";
import { authApi } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/ui/index";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import type { User } from "../types";

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("admin@h12rcdg.mil.ph");
  const [password, setPassword] = useState("Admin@12345");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await authApi.login(email, password);
      setAuth(res.data.user as User, res.data.token as string);
      navigate("/dashboard");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: unknown } } };
      const errData = e?.response?.data?.error;
      setError(typeof errData === "string" ? errData : "Invalid email or password.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--sidebar-bg))] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl"/>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl"/>
      </div>

      <div className="absolute top-4 left-4 z-10">
        <Link to="/" className="flex items-center gap-1 text-white/50 hover:text-white/80 text-xs transition-colors">
          <ChevronLeft size={14} /> Home
        </Link>
      </div>
      <div className="absolute top-4 right-4 z-10"><ThemeToggle /></div>

      <div className="relative w-full max-w-[380px]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 mb-4 shadow-lg">
            <Shield size={28} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">H12RCDG</h1>
          <p className="text-white/50 text-sm mt-1">Reservist Management System</p>
        </div>

        {/* Card */}
        <div className="bg-[rgb(var(--card-bg))] rounded-2xl shadow-card-lg p-8 border border-white/10">
          <h2 className="text-base font-bold text-ink mb-1">Welcome back</h2>
          <p className="text-xs text-ink3 mb-6">Sign in to your account to continue</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink2 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3"/>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="user@h12rcdg.mil.ph" required autoComplete="email"
                  className="w-full h-10 pl-9 pr-4 bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] rounded-xl text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink2 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3"/>
                <input
                  type={showPass?"text":"password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  className="w-full h-10 pl-9 pr-10 bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] rounded-xl text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-colors"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink2 transition-colors">
                  {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-semibold">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-10 text-sm" loading={loading}>
              {loading ? "Signing in…" : "Sign in →"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-white/40 mt-5">
          Reservist? <Link to="/signup" className="text-blue-400 font-semibold hover:underline">Create an account</Link>
        </p>
        <p className="text-center text-2xs text-white/25 mt-2">
          RESTRICTED SYSTEM · AUTHORIZED PERSONNEL ONLY
        </p>
      </div>
    </div>
  );
}
