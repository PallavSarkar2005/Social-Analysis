import React from "react";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import ErrorLogger from "../../errors/ErrorLogger";
import { devError } from "../../utils/devLog";

const INITIAL_STATE = { hasError: false, error: null };

/**
 * Page-scoped boundary for Political Profile.
 * Prevents profile render failures from escalating to the global Error Boundary.
 */
export default class ProfileContentBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { ...INITIAL_STATE };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    devError("[ProfileContentBoundary] profile render crash:", error, errorInfo);
    try {
      ErrorLogger.log(error, "profile_render_crash", "high", {
        creatorId: this.props.creatorId || "unknown",
        componentStack: errorInfo?.componentStack || "No component stack",
      }).catch(() => {});
    } catch {
      // logging must never throw
    }
  }

  handleRetry = () => this.setState({ ...INITIAL_STATE });

  render() {
    if (!this.state.hasError) return this.props.children;

    const message =
      this.state.error?.message || "This political profile failed to render.";

    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-white/[0.08] bg-[#121318]/40 p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Profile temporarily unavailable</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            We could not display this leader&apos;s intelligence dossier. The failure has been
            logged. You can retry or return to the dashboard.
          </p>
          {import.meta.env.DEV && (
            <pre className="text-left text-[10px] text-rose-300/90 bg-black/30 rounded-xl p-3 overflow-auto max-h-40 whitespace-pre-wrap">
              {message}
            </pre>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
            <button
              type="button"
              onClick={this.handleRetry}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white inline-flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
            <Link
              to="/dashboard"
              className="h-9 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.06] text-xs font-bold text-slate-300 inline-flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
