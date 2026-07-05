import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import ErrorLogger from "../errors/ErrorLogger";
import { devError } from "../utils/devLog";

const INITIAL_STATE = { hasError: false, error: null, errorInfo: null };

export default class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { ...INITIAL_STATE };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    devError("WidgetErrorBoundary caught widget render failure:", error, errorInfo);
    this.setState({ errorInfo });

    try {
      ErrorLogger.log(error, "widget_render_crash", "medium", {
        widget: this.props.name || "unknown",
        componentStack: errorInfo?.componentStack || "No component stack",
      }).catch(() => {});
    } catch {
      // ignore logging failures
    }
  }

  handleRetry = () => this.setState({ ...INITIAL_STATE });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="bg-[#121318]/25 border border-red-500/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 select-none h-full min-h-[140px]">
        <AlertTriangle className="text-red-400" size={24} />
        <h4 className="text-xs font-bold text-slate-200">Widget Failed to Load</h4>
        <p className="text-[10px] text-slate-500 max-w-[180px] leading-normal">
          An anomaly was detected while rendering this telemetry unit.
        </p>
        <button
          type="button"
          onClick={this.handleRetry}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-[9px] font-bold uppercase tracking-wider text-slate-300 transition"
        >
          <RefreshCw size={8} />
          Retry
        </button>
      </div>
    );
  }
}
