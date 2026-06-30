import React from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Gather telemetry details
    let userId = "Guest";
    try {
      const savedUserStr = localStorage.getItem("socialiq_user");
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        userId = savedUser?._id || savedUser?.id || "Guest";
      }
    } catch (e) {}

    const telemetry = {
      timestamp: new Date().toISOString(),
      route: window.location.pathname,
      userId,
      browser: navigator.userAgent,
      errorMessage: error.message || String(error),
      errorStack: error.stack || "No stack trace available",
      componentStack: errorInfo?.componentStack || "No component stack available",
    };

    console.error("ErrorBoundary caught an unhandled rendering error:", telemetry);
    // In production, send to monitoring service like Sentry/LogRocket:
    // Sentry.captureException(error, { extra: telemetry });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mb-6 animate-pulse">
            <ShieldAlert size={40} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
            Something went wrong in this workspace
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            The SocialIQ interface encountered an unexpected rendering error. This has been logged and is being reviewed by the engineering team.
          </p>

          {/* Expanded Debug Panel */}
          <div className="w-full max-w-xl bg-slate-950/60 border border-white/[0.04] rounded-xl p-4 mb-6 text-left font-mono text-[10px] text-slate-400 overflow-x-auto max-h-48 space-y-2 select-text custom-scrollbar">
            <div><span className="text-indigo-400">Timestamp:</span> {new Date().toISOString()}</div>
            <div><span className="text-indigo-400">Route:</span> {window.location.pathname}</div>
            <div><span className="text-indigo-400">Browser:</span> {navigator.userAgent}</div>
            <div><span className="text-red-400">Exception:</span> {this.state.error?.toString()}</div>
            {this.state.errorInfo && (
              <div>
                <span className="text-indigo-400">Stack Trace:</span>
                <pre className="mt-1 text-slate-500 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
              </div>
            )}
          </div>

          <button
            onClick={() => window.location.reload()}
            className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs text-white transition flex items-center gap-2 shadow-lg shadow-indigo-600/15 cursor-pointer"
          >
            <RefreshCw size={14} />
            Reload Workspace
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
