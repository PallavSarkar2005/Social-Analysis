import React from "react";
import ErrorLogger from "./ErrorLogger";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Generate correlation logs and write to database activity logs
    ErrorLogger.log(error, "react_render_crash", "critical", {
      componentStack: errorInfo?.componentStack || "No component stack",
    }).then((telemetry) => {
      // Store in session storage to display Request ID on error screen
      sessionStorage.setItem("latest_error_telemetry", JSON.stringify(telemetry));
      
      // Determine redirection path based on crash type
      const errStr = (error?.message || "").toLowerCase();
      if (errStr.includes("auth") || errStr.includes("token") || errStr.includes("unauthorized")) {
        window.location.href = "/error/401";
      } else if (errStr.includes("forbidden") || errStr.includes("permission")) {
        window.location.href = "/error/403";
      } else if (errStr.includes("network") || errStr.includes("timeout") || errStr.includes("fetch")) {
        window.location.href = "/error/network";
      } else {
        window.location.href = "/error/500";
      }
    });
  }

  render() {
    if (this.state.hasError) {
      // Return a blank loading/skeleton while the app redirects to the dedicated error view
      return (
        <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
          <span className="text-xs font-semibold text-slate-500 tracking-wider">Intercepting workspace exception...</span>
        </div>
      );
    }

    return this.props.children;
  }
}
