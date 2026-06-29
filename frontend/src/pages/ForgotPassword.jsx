import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, RefreshCw, KeyRound } from "lucide-react";
import client from "../api/client";
import toast, { Toaster } from "react-hot-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      const res = await client.post("/api/auth/forgot-password", { email });
      if (res.data && res.data.success) {
        setSubmitted(true);
        toast.success("Password reset link sent to your email!");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to submit request.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      <Toaster position="top-right" />
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-[#111319]/80 border border-white/[0.06] rounded-2xl p-6 sm:p-8 backdrop-blur-md relative z-10 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
            <KeyRound size={24} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Forgot Password?</h1>
          <p className="text-xs text-slate-400 mt-2">
            No worries! Enter your email address and we'll dispatch a link to reset your credentials.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs sm:text-sm text-indigo-300 leading-relaxed">
              We have dispatched a secure password reset link to <strong className="text-white">{email}</strong>. Please check your inbox (and spam folder) to proceed.
            </div>
            <button
              onClick={() => setSubmitted(false)}
              className="w-full h-11 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold rounded-xl transition text-slate-300"
            >
              Resend Link
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. name@company.com"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.04] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/10 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending Link...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-white/[0.04] text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft size={14} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
