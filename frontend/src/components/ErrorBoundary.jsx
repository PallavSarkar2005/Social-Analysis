import React from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
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
            The SocialIQ interface encountered an unexpected rendering error. This has been logged and is being reviewed.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs text-white transition flex items-center gap-2 shadow-lg shadow-indigo-600/15"
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
