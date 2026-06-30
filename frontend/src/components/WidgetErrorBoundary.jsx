import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("WidgetErrorBoundary caught widget render failure:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#121318]/25 border border-red-500/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 select-none h-full min-h-[140px]">
          <AlertTriangle className="text-red-400" size={24} />
          <h4 className="text-xs font-bold text-slate-200">Widget Failed to Load</h4>
          <p className="text-[10px] text-slate-500 max-w-[180px] leading-normal">
            An anomaly was detected while rendering this telemetry unit.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-[9px] font-bold uppercase tracking-wider text-slate-300 transition"
          >
            <RefreshCw size={8} />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
