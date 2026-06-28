import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, User, UserPlus, ArrowRight, ShieldCheck, Eye, EyeOff, Check, X } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Password Complexity Validation Helpers
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecialChar = /[@$!%*?&#^()_+=\[\]{};':"\\|,.<>\/?~`-]/.test(password);

  const calculateStrength = () => {
    let score = 0;
    if (!password) return { score, label: "None", color: "bg-slate-800" };
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++; // length bonus
    if (hasNumber) score++;
    if (hasUppercase) score++;
    if (hasSpecialChar) score++;

    if (score <= 2) return { score, label: "Weak", color: "bg-rose-500" };
    if (score <= 3) return { score, label: "Fair", color: "bg-amber-500" };
    if (score === 4) return { score, label: "Good", color: "bg-yellow-500" };
    return { score, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = calculateStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    if (!hasMinLength || !hasNumber || !hasUppercase || !hasSpecialChar) {
      toast.error("Please satisfy all password complexity requirements.");
      return;
    }

    try {
      setLoading(true);
      const res = await register(name, email, password);
      if (res.success) {
        toast.success("Successfully registered! Workspace ready.");
        navigate("/dashboard");
      } else {
        toast.error(res.message || "Registration failed. Try again.");
      }
    } catch (err) {
      toast.error("An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <Toaster position="top-right" />
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <div className="w-full max-w-md bg-[#111319]/85 backdrop-blur-xl border border-white/[0.08] p-8 rounded-2xl shadow-2xl relative z-10 my-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-4 shadow-inner">
            <ShieldCheck size={26} />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Create an Account
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Get started with Social IQ analytics engine
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full h-11 pl-10 pr-4 bg-white/[0.02] border border-white/[0.08] rounded-xl focus:outline-none focus:border-indigo-500 text-sm transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 pl-10 pr-4 bg-white/[0.02] border border-white/[0.08] rounded-xl focus:outline-none focus:border-indigo-500 text-sm transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••• (Min 8 chars)"
                className="w-full h-11 pl-10 pr-11 bg-white/[0.02] border border-white/[0.08] rounded-xl focus:outline-none focus:border-indigo-500 text-sm transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Password Strength Meter */}
          {password && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Password Strength:</span>
                <span className={`font-semibold ${
                  strength.label === "Weak" ? "text-rose-400" :
                  strength.label === "Fair" ? "text-amber-400" :
                  strength.label === "Good" ? "text-yellow-400" :
                  "text-emerald-400"
                }`}>{strength.label}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${strength.color}`}
                  style={{ width: `${(strength.score / 5) * 100}%` }}
                />
              </div>

              {/* Requirements Checklist */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1.5 text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  {hasMinLength ? <Check size={12} className="text-emerald-400" /> : <X size={12} className="text-rose-400" />}
                  <span className={hasMinLength ? "text-slate-300" : "text-slate-500"}>8+ characters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasNumber ? <Check size={12} className="text-emerald-400" /> : <X size={12} className="text-rose-400" />}
                  <span className={hasNumber ? "text-slate-300" : "text-slate-500"}>At least one number</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasUppercase ? <Check size={12} className="text-emerald-400" /> : <X size={12} className="text-rose-400" />}
                  <span className={hasUppercase ? "text-slate-300" : "text-slate-500"}>One uppercase letter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasSpecialChar ? <Check size={12} className="text-emerald-400" /> : <X size={12} className="text-rose-400" />}
                  <span className={hasSpecialChar ? "text-slate-300" : "text-slate-500"}>One special char</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-semibold rounded-xl text-white transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:translate-y-[1px] pt-1 cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <UserPlus size={16} />
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/[0.06] text-center">
          <p className="text-xs text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 group transition"
            >
              Sign In
              <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
