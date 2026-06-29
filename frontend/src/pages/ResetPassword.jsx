import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, RefreshCw, KeyRound, CheckCircle } from "lucide-react";
import client from "../api/client";
import toast, { Toaster } from "react-hot-toast";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Invalid or missing reset token.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\[\]{};':"\\|,.<>\/?~`-])[A-Za-z\d@$!%*?&#^()_+=\[\]{};':"\\|,.<>\/?~`-]{8,}$/;
    if (!passwordRegex.test(password)) {
      toast.error("Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.");
      return;
    }

    try {
      setLoading(true);
      const res = await client.post("/api/auth/reset-password", { token, password });
      if (res.data && res.data.success) {
        setSuccess(true);
        toast.success("Password reset successfully!");
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to reset password.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      <Toaster position="top-right" />
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-[#111319]/80 border border-white/[0.06] rounded-2xl p-6 sm:p-8 backdrop-blur-md relative z-10 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
            <KeyRound size={24} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Choose New Password</h1>
          <p className="text-xs text-slate-400 mt-2">
            Establish a strong, unique password to secure your Social IQ workspace.
          </p>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
              <CheckCircle size={28} />
            </div>
            <h3 className="text-sm font-bold text-white">Password Updated!</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Your password has been successfully updated. Redirecting to login portal...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.04] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.04] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/10 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-white/[0.04] text-center">
          <Link
            to="/login"
            className="text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Cancel and Return
          </Link>
        </div>
      </div>
    </div>
  );
}
