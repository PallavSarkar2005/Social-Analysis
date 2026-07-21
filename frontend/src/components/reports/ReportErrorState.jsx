import { AlertTriangle, WifiOff, ShieldOff, RefreshCw } from "lucide-react";

function resolveErrorKind(error, offline) {
  if (offline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return "offline";
  }
  const status = error?.response?.status || error?.status;
  if (status === 401 || status === 403) return "permission";
  return "api";
}

const COPY = {
  offline: {
    Icon: WifiOff,
    title: "You appear offline",
    body: "Reconnect to load your Intelligence Hub from MongoDB.",
  },
  permission: {
    Icon: ShieldOff,
    title: "Permission denied",
    body: "You can only access reports you own. Sign in again if this persists.",
  },
  api: {
    Icon: AlertTriangle,
    title: "Could not load reports",
    body: "The reports API failed. Retry to pull the latest registry.",
  },
};

export default function ReportErrorState({ error, offline = false, onRetry }) {
  const kind = resolveErrorKind(error, offline);
  const { Icon, title, body } = COPY[kind];

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] text-center px-6 py-16">
      <Icon className="w-10 h-10 text-rose-400" />
      <div>
        <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
        <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto">{body}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition inline-flex items-center gap-2"
        >
          <RefreshCw size={13} />
          Retry
        </button>
      )}
    </div>
  );
}
