import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Shield, User, Mail, Lock, Eye, EyeOff, Tag, X, UserPlus } from "lucide-react";
import { Button } from "../components/ui/index";
import axios from "axios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000/api";

export function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();

  function handleClose() {
    const bg = location.state?.background;
    navigate(bg ? bg.pathname + (bg.search ?? "") : "/");
  }
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [linked, setLinked] = useState(false);

  const [form, setForm] = useState({
    fullName: "", email: "", username: "", password: "", confirmPassword: "",
    afpsn: "", rankCode: "", lastName: "", firstName: "", middleName: "", sex: "", mobileTelNo: "",
  });

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/register`, {
        fullName: form.fullName, email: form.email, username: form.username,
        password: form.password, afpsn: form.afpsn, rankCode: form.rankCode,
        lastName: form.lastName, firstName: form.firstName, middleName: form.middleName || undefined,
        sex: form.sex || undefined, mobileTelNo: form.mobileTelNo || undefined,
      });
      setSuccess(true);
      setLinked(res.data.linked ?? false);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Registration failed. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-[480px] pointer-events-auto max-h-[90vh] flex flex-col">

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-[rgb(var(--card-bg))] border border-white/10 flex items-center justify-center text-ink3 hover:text-ink transition-colors shadow-lg"
          >
            <X size={14} />
          </button>

          {/* Header */}
          <div className="text-center mb-4 shrink-0">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 mb-2 shadow-lg">
              <Shield size={20} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-white">Reservist Registration</h1>
            <p className="text-white/50 text-xs mt-0.5">Create your account to access the system</p>
          </div>

          {/* Success state */}
          {success ? (
            <div className="bg-[rgb(var(--card-bg))] rounded-2xl shadow-card-lg p-8 border border-white/10 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 mb-4 shadow-lg mx-auto">
                <UserPlus size={24} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-ink mb-2">Registration Submitted!</h2>
              <p className="text-ink3 text-sm mb-6">
                {linked
                  ? "Your account has been linked to your existing military record and is pending approval."
                  : "Your account is pending approval by the system administrator."}
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={handleClose} className="h-9 px-4 rounded-xl border border-[rgb(var(--border))] text-ink text-sm font-semibold hover:bg-[rgb(var(--subtle))] transition-colors">
                  Back to Home
                </button>
                <button onClick={() => navigate("/login")} className="h-9 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold">
                  Go to Login
                </button>
              </div>
            </div>
          ) : (
            /* Scrollable form card */
            <div className="bg-[rgb(var(--card-bg))] rounded-2xl shadow-card-lg border border-white/10 overflow-y-auto">
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">

                  <p className="text-2xs font-bold text-ink3 uppercase tracking-wider">Account Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink2 mb-1">Full Name *</label>
                      <div className="relative">
                        <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
                        <input value={form.fullName} onChange={e => set("fullName", e.target.value)} required placeholder="Juan dela Cruz"
                          className="w-full h-9 pl-8 pr-3 bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] rounded-xl text-xs text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink2 mb-1">Username *</label>
                      <div className="relative">
                        <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
                        <input value={form.username} onChange={e => set("username", e.target.value)} required placeholder="juandc"
                          className="w-full h-9 pl-8 pr-3 bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] rounded-xl text-xs text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink2 mb-1">Email *</label>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
                      <input type="email" value={form.email} onChange={e => set("email", e.target.value)} required placeholder="you@email.com"
                        className="w-full h-9 pl-8 pr-3 bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] rounded-xl text-xs text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink2 mb-1">Password *</label>
                      <div className="relative">
                        <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
                        <input type={showPass ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} required placeholder="Min 8 chars"
                          className="w-full h-9 pl-8 pr-9 bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] rounded-xl text-xs text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                        <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink2">
                          {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink2 mb-1">Confirm Password *</label>
                      <div className="relative">
                        <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
                        <input type="password" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} required placeholder="Re-enter"
                          className="w-full h-9 pl-8 pr-3 bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] rounded-xl text-xs text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-[rgb(var(--border))]" />

                  <p className="text-2xs font-bold text-ink3 uppercase tracking-wider">Military Information</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink2 mb-1">AFPSN *</label>
                      <input value={form.afpsn} onChange={e => set("afpsn", e.target.value)} required placeholder="SK-R00-000000"
                        className="w-full h-9 px-3 bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] rounded-xl text-xs text-ink font-mono placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink2 mb-1">Rank *</label>
                      <input value={form.rankCode} onChange={e => set("rankCode", e.target.value)} required placeholder="PVT, CPL, SGT..."
                        className="w-full h-9 px-3 bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] rounded-xl text-xs text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink2 mb-1">Last Name *</label>
                      <input value={form.lastName} onChange={e => set("lastName", e.target.value)} required placeholder="Dela Cruz"
                        className="w-full h-9 px-3 bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] rounded-xl text-xs text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink2 mb-1">First Name *</label>
                      <input value={form.firstName} onChange={e => set("firstName", e.target.value)} required placeholder="Juan"
                        className="w-full h-9 px-3 bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] rounded-xl text-xs text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink2 mb-1">Middle Name</label>
                      <input value={form.middleName} onChange={e => set("middleName", e.target.value)} placeholder="Optional"
                        className="w-full h-9 px-3 bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] rounded-xl text-xs text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink2 mb-1">Sex</label>
                      <select value={form.sex} onChange={e => set("sex", e.target.value)}
                        className="w-full h-9 px-3 bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400">
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink2 mb-1">Mobile No.</label>
                      <input value={form.mobileTelNo} onChange={e => set("mobileTelNo", e.target.value)} placeholder="09XX-XXX-XXXX"
                        className="w-full h-9 px-3 bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] rounded-xl text-xs text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                    </div>
                  </div>

                  {error && (
                    <div className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-semibold">
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full h-10 text-sm" loading={loading}>
                    {loading ? "Submitting..." : "Create Account"}
                  </Button>

                  <p className="text-center text-xs text-ink3">
                    Already have an account?{" "}
                    <Link to="/login" state={{ background: location.state?.background ?? location }} className="text-blue-500 font-semibold hover:underline">Sign in</Link>
                  </p>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
