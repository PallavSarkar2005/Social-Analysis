import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import ErrorLogger from "./ErrorLogger";
import { devError } from "../utils/devLog";

const INITIAL_STATE = { hasError: false, error: null, errorInfo: null };

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { ...INITIAL_STATE };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    devError("========== REACT CRASH ==========");
    devError(error);
    devError(errorInfo);
    devError(error?.stack);
    devError("=================================");

    this.setState({ errorInfo });

    try {
      ErrorLogger.log(error, "react_render_crash", "critical", {
        componentStack: errorInfo?.componentStack || "No component stack",
      }).catch(() => {});
    } catch {
      // logging must never crash the app
    }
  }

  handleRetry = () => this.setState({ ...INITIAL_STATE });

  renderDevFallback() {
    const { error, errorInfo } = this.state;
    return (
      <div className="min-h-screen bg-[#111] text-white p-8 overflow-auto font-mono text-sm whitespace-pre-wrap">
        <h1 className="text-xl font-bold mb-4">React Crash (Development)</h1>
        <h2 className="text-rose-400 font-semibold mb-2">Error</h2>
        <pre className="mb-4">{error?.message || String(error)}</pre>
        <h2 className="text-rose-400 font-semibold mb-2">Stack</h2>
        <pre className="mb-4">{error?.stack || "No stack trace"}</pre>
        <h2 className="text-rose-400 font-semibold mb-2">Component Stack</h2>
        <pre>{errorInfo?.componentStack || "No component stack"}</pre>
      </div>
    );
  }

  renderProdFallback() {
    return (
      <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center p-6 font-sans select-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-rose-500/5 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
        <div className="relative z-10 max-w-md text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            An unexpected error occurred. You can try again or return to the home page.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
            <button
              type="button"
              onClick={this.handleRetry}
              className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-10 px-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] text-slate-300 text-xs font-semibold"
            >
              Reload Page
            </button>
            <Link
              to="/"
              className="h-10 px-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] text-slate-300 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Home className="w-3.5 h-3.5" /> Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return import.meta.env.DEV ? this.renderDevFallback() : this.renderProdFallback();
  }
}
