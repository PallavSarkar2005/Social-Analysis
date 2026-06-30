/**
 * AppearanceContext.jsx
 *
 * Global appearance state provider.
 * - Authenticated users: preferences fetched from and saved to /api/settings/appearance
 * - Guest users: preferences stored in localStorage only
 * - Applies data-* attributes to <html> which trigger CSS custom property overrides in index.css
 */

import { createContext, useContext, useEffect, useCallback, useReducer, useRef } from "react";
import client from "../api/client";
import toast from "react-hot-toast";

// ── Defaults ────────────────────────────────────────────────────────────────
const DEFAULTS = {
  theme: "dark",
  accent: "indigo",
  fontSize: "medium",
  compact: false,
  animations: "full",
};

const LS_KEY = "si_appearance";

// ── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case "SET":       return { ...state, ...action.payload };
    case "RESET":     return { ...DEFAULTS };
    default:          return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const AppearanceContext = createContext(null);

export function AppearanceProvider({ children }) {
  const [prefs, dispatch] = useReducer(reducer, null, () => {
    // Initialise from localStorage for instant application (no flash)
    try {
      const saved = localStorage.getItem(LS_KEY);
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : { ...DEFAULTS };
    } catch {
      return { ...DEFAULTS };
    }
  });

  const saveTimerRef = useRef(null);
  const isAuthenticatedRef = useRef(false);

  // ── Apply data-* attributes to <html> ──────────────────────────────────────
  const applyToDOM = useCallback((p) => {
    const root = document.documentElement;

    // System theme detection
    let effectiveTheme = p.theme;
    if (p.theme === "system") {
      effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    root.setAttribute("data-theme", effectiveTheme);
    root.setAttribute("data-accent", p.accent);
    root.setAttribute("data-fontsize", p.fontSize);
    root.setAttribute("data-compact", String(p.compact));
    root.setAttribute("data-animations", p.animations);
  }, []);

  // Apply on every prefs change
  useEffect(() => {
    applyToDOM(prefs);
    // Persist to localStorage immediately (works for guests and as backup for auth users)
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(prefs));
    } catch (_) {}
  }, [prefs, applyToDOM]);

  // Listen for system color-scheme change when theme === "system"
  useEffect(() => {
    if (prefs.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyToDOM(prefs);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [prefs, applyToDOM]);

  // ── Load from backend when authenticated ─────────────────────────────────
  const loadFromServer = useCallback(async () => {
    try {
      const res = await client.get("/api/settings/appearance", {
        _skipErrorRedirect: true,
      });
      if (res.data?.success && res.data.data) {
        isAuthenticatedRef.current = true;
        dispatch({ type: "SET", payload: res.data.data });
      }
    } catch (err) {
      // 401 = not logged in — use localStorage only
      if (err?.response?.status !== 401) {
        console.warn("[AppearanceContext] Could not load appearance from server:", err.message);
      }
    }
  }, []);

  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  // ── Debounced save to backend ─────────────────────────────────────────────
  const saveToServer = useCallback((newPrefs) => {
    if (!isAuthenticatedRef.current) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await client.put("/api/settings/appearance", newPrefs, {
          _skipErrorRedirect: true,
        });
      } catch (err) {
        if (err?.response?.status !== 401) {
          toast.error("Could not save appearance preferences.", { id: "appearance-save-err" });
        }
      }
    }, 600);
  }, []);

  // ── Public update function ────────────────────────────────────────────────
  const update = useCallback((partial) => {
    dispatch({ type: "SET", payload: partial });
    const merged = { ...prefs, ...partial };
    saveToServer(merged);
  }, [prefs, saveToServer]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    saveToServer(DEFAULTS);
  }, [saveToServer]);

  return (
    <AppearanceContext.Provider value={{ prefs, update, reset, loadFromServer }}>
      {children}
    </AppearanceContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
export const useAppearance = () => {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used inside <AppearanceProvider>");
  return ctx;
};

export default AppearanceContext;
