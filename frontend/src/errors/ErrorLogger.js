import client from "../api/client";

class ErrorLogger {
  static generateId() {
    return "req-" + Math.random().toString(36).substring(2, 10);
  }

  static async log(error, type = "client_error", severity = "medium", extraContext = {}) {
    const requestId = this.generateId();
    const timestamp = new Date().toISOString();
    
    // Read user information from localStorage
    let userId = "Guest";
    try {
      const userStr = localStorage.getItem("socialiq_user");
      if (userStr) {
        const parsed = JSON.parse(userStr);
        userId = parsed._id || parsed.id || "Guest";
      }
    } catch (e) {}

    const telemetry = {
      requestId,
      timestamp,
      userId,
      route: window.location.pathname,
      browser: navigator.userAgent,
      os: navigator.platform,
      networkStatus: navigator.onLine ? "online" : "offline",
      errorMessage: error?.message || String(error),
      errorStack: error?.stack || "No stack trace available",
      severity,
      ...extraContext,
    };

    console.error(`[Error Boundary - ${requestId}]`, telemetry);

    // Save silently to the backend database activity logs
    try {
      await client.post("/api/activity/log", {
        action: `err_${type}`,
        details: telemetry,
      });
    } catch (err) {
      console.warn("Telemetry endpoint failed to capture log:", err.message);
    }

    return telemetry;
  }
}

export default ErrorLogger;
