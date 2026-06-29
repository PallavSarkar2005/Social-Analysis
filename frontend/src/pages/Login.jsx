import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, LogIn, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, googleLogin, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Load saved email on mount if "Remember Me" was previously enabled
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
    const savedEmail = localStorage.getItem("socialiq_remember_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    // Load Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "placeholder-client-id.apps.googleusercontent.com",
          callback: handleGoogleLoginResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          { theme: "dark", size: "large", width: "100%" }
        );
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [isAuthenticated, navigate]);

  const handleGoogleLoginResponse = async (response) => {
    try {
      setLoading(true);
      const res = await googleLogin(response.credential);
      if (res.success) {
        toast.success("Successfully logged in via Google!");
        navigate("/dashboard");
      } else {
        toast.error(res.message || "Google Authentication failed");
      }
    } catch (err) {
      toast.error("An error occurred during Google sign-in.");
    } finally {
      setLoading(false);
    }
  };

  const triggerDevGoogleLogin = async () => {
    try {
      setLoading(true);
      const res = await googleLogin("dummy-developer-token");
      if (res.success) {
        toast.success("Logged in with Developer Google Identity!");
        navigate("/dashboard");
      } else {
        toast.error(res.message);
      }
    } catch (e) {
      toast.error("Developer bypass failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const res = await login(email, password, rememberMe);
      if (res.success) {
        // Save or remove email from localStorage
        if (rememberMe) {
          localStorage.setItem("socialiq_remember_email", email);
        } else {
          localStorage.removeItem("socialiq_remember_email");
        }
        toast.success("Successfully logged in!");
        navigate("/dashboard");
      } else {
        toast.error(res.message || "Invalid credentials");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
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

      <div className="w-full max-w-md bg-[#111319]/85 backdrop-blur-xl border border-white/[0.08] p-8 rounded-2xl shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-4 shadow-inner">
            <ShieldCheck size={26} />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Welcome back to Social IQ
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Sign in to access your analytics dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
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
                disabled={authLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 pl-10 pr-11 bg-white/[0.02] border border-white/[0.08] rounded-xl focus:outline-none focus:border-indigo-500 text-sm transition"
                required
                disabled={authLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                disabled={authLoading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember Me checkbox */}
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/10 bg-white/[0.02] text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-600"
                disabled={authLoading}
              />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading || authLoading}
            className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-semibold rounded-xl text-white transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:translate-y-[1px] cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : authLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Initializing telemetry...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">or continue with</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Google GIS rendering anchor */}
          <div id="google-signin-btn" className="w-full overflow-hidden rounded-xl" />
          
          {/* Simulated Google Button (Bypass for sandboxes/development fallback) */}
          <button
            type="button"
            onClick={triggerDevGoogleLogin}
            disabled={loading || authLoading}
            className="w-full h-11 bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.06] hover:text-white text-slate-300 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.114 2.78-1.4 3.63v3.02h2.2c1.3-1.2 2.05-3 2.05-5.5z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.89-3.02c-1.08.72-2.48 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.12C3.26 21.27 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.27a7.18 7.18 0 010-4.54V6.61H1.29a11.94 11.94 0 000 10.78l3.98-3.12z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 7.31 0 3.26 2.73 1.29 6.61l3.98 3.12c.95-2.85 3.6-4.98 6.73-4.98z"
              />
            </svg>
            Google Identity (Dev-Bypass)
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-xs text-slate-400">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 group transition"
            >
              Sign Up
              <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
