/**
 * partyThemes.js
 * Single source of truth for all political party color palettes.
 * Every component that renders party-related UI MUST consume this file.
 * Never hardcode party colors anywhere else.
 */

export const PARTY_THEMES = {
  BJP: {
    id: "bjp",
    label: "BJP",
    fullName: "Bharatiya Janata Party",
    logo: "/BJPLogo.jpg",

    // Gradient used on header / hero areas
    gradient: "from-orange-600 via-amber-500 to-orange-700",
    gradientSubtle: "from-orange-500/10 via-amber-500/5 to-transparent",

    // Card & badge accent
    accent: "#f97316",           // orange-500
    accentLight: "#fed7aa",      // orange-200
    accentDark: "#c2410c",       // orange-700

    // Semantic CSS class tokens (Tailwind)
    text: "text-orange-400",
    textLight: "text-orange-300",
    textStrong: "text-orange-500",
    bg: "bg-orange-500/10",
    bgHover: "hover:bg-orange-500/15",
    border: "border-orange-500/30",
    borderHover: "hover:border-orange-400/50",
    shadow: "shadow-orange-500/10",
    badge: "bg-orange-500/15 text-orange-300 border border-orange-500/30",
    button: "bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20",
    ring: "ring-orange-500/40",
    chart: ["#f97316", "#fb923c", "#fdba74", "#c2410c", "#ea580c"],
    skeleton: "bg-orange-900/20",

    // Watermark / decorative element hint
    watermark: "🪷",
    glowColor: "rgba(249,115,22,0.15)",
  },

  Congress: {
    id: "congress",
    label: "Congress",
    fullName: "Indian National Congress",
    logo: "/CongressLogo.jpg",

    gradient: "from-blue-700 via-blue-500 to-green-600",
    gradientSubtle: "from-blue-500/10 via-blue-400/5 to-transparent",

    accent: "#3b82f6",
    accentLight: "#bfdbfe",
    accentDark: "#1d4ed8",

    text: "text-blue-400",
    textLight: "text-blue-300",
    textStrong: "text-blue-500",
    bg: "bg-blue-500/10",
    bgHover: "hover:bg-blue-500/15",
    border: "border-blue-500/30",
    borderHover: "hover:border-blue-400/50",
    shadow: "shadow-blue-500/10",
    badge: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
    button: "bg-blue-700 hover:bg-blue-600 text-white shadow-lg shadow-blue-700/20",
    ring: "ring-blue-500/40",
    chart: ["#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8", "#22c55e"],
    skeleton: "bg-blue-900/20",

    watermark: "✋",
    glowColor: "rgba(59,130,246,0.15)",
  },

  AAP: {
    id: "aap",
    label: "AAP",
    fullName: "Aam Aadmi Party",
    logo: "/AAPLogo.jpg",

    gradient: "from-sky-500 via-cyan-400 to-sky-600",
    gradientSubtle: "from-sky-500/10 via-cyan-400/5 to-transparent",

    accent: "#0ea5e9",
    accentLight: "#bae6fd",
    accentDark: "#0369a1",

    text: "text-sky-400",
    textLight: "text-sky-300",
    textStrong: "text-sky-500",
    bg: "bg-sky-500/10",
    bgHover: "hover:bg-sky-500/15",
    border: "border-sky-500/30",
    borderHover: "hover:border-sky-400/50",
    shadow: "shadow-sky-500/10",
    badge: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
    button: "bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/20",
    ring: "ring-sky-500/40",
    chart: ["#0ea5e9", "#38bdf8", "#7dd3fc", "#0369a1", "#06b6d4"],
    skeleton: "bg-sky-900/20",

    watermark: "🧹",
    glowColor: "rgba(14,165,233,0.15)",
  },

  BJD: {
    id: "bjd",
    label: "BJD",
    fullName: "Biju Janata Dal",
    logo: "/BJDimage.avif",

    gradient: "from-emerald-600 via-green-500 to-emerald-700",
    gradientSubtle: "from-emerald-500/10 via-green-500/5 to-transparent",

    accent: "#10b981",
    accentLight: "#a7f3d0",
    accentDark: "#047857",

    text: "text-emerald-400",
    textLight: "text-emerald-300",
    textStrong: "text-emerald-500",
    bg: "bg-emerald-500/10",
    bgHover: "hover:bg-emerald-500/15",
    border: "border-emerald-500/30",
    borderHover: "hover:border-emerald-400/50",
    shadow: "shadow-emerald-500/10",
    badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    button: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20",
    ring: "ring-emerald-500/40",
    chart: ["#10b981", "#34d399", "#6ee7b7", "#047857", "#a7f3d0"],
    skeleton: "bg-emerald-900/20",

    watermark: "🌿",
    glowColor: "rgba(16,185,129,0.15)",
  },

  SP: {
    id: "sp",
    label: "SP",
    fullName: "Samajwadi Party",
    logo: null,

    gradient: "from-red-600 via-rose-500 to-red-700",
    gradientSubtle: "from-red-500/10 via-rose-400/5 to-transparent",

    accent: "#ef4444",
    accentLight: "#fecaca",
    accentDark: "#b91c1c",

    text: "text-red-400",
    textLight: "text-red-300",
    textStrong: "text-red-500",
    bg: "bg-red-500/10",
    bgHover: "hover:bg-red-500/15",
    border: "border-red-500/30",
    borderHover: "hover:border-red-400/50",
    shadow: "shadow-red-500/10",
    badge: "bg-red-500/15 text-red-300 border border-red-500/30",
    button: "bg-red-700 hover:bg-red-600 text-white shadow-lg shadow-red-700/20",
    ring: "ring-red-500/40",
    chart: ["#ef4444", "#f87171", "#fca5a5", "#b91c1c", "#dc2626"],
    skeleton: "bg-red-900/20",

    watermark: "⚙️",
    glowColor: "rgba(239,68,68,0.15)",
  },

  TMC: {
    id: "tmc",
    label: "TMC",
    fullName: "All India Trinamool Congress",
    logo: null,

    gradient: "from-teal-600 via-teal-400 to-green-600",
    gradientSubtle: "from-teal-500/10 via-teal-400/5 to-transparent",

    accent: "#14b8a6",
    accentLight: "#99f6e4",
    accentDark: "#0f766e",

    text: "text-teal-400",
    textLight: "text-teal-300",
    textStrong: "text-teal-500",
    bg: "bg-teal-500/10",
    bgHover: "hover:bg-teal-500/15",
    border: "border-teal-500/30",
    borderHover: "hover:border-teal-400/50",
    shadow: "shadow-teal-500/10",
    badge: "bg-teal-500/15 text-teal-300 border border-teal-500/30",
    button: "bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/20",
    ring: "ring-teal-500/40",
    chart: ["#14b8a6", "#2dd4bf", "#5eead4", "#0f766e", "#0d9488"],
    skeleton: "bg-teal-900/20",

    watermark: "🌸",
    glowColor: "rgba(20,184,166,0.15)",
  },

  Independent: {
    id: "independent",
    label: "Independent",
    fullName: "Independent",
    logo: null,

    gradient: "from-violet-600 via-purple-500 to-violet-700",
    gradientSubtle: "from-violet-500/10 via-purple-500/5 to-transparent",

    accent: "#8b5cf6",
    accentLight: "#ddd6fe",
    accentDark: "#6d28d9",

    text: "text-violet-400",
    textLight: "text-violet-300",
    textStrong: "text-violet-500",
    bg: "bg-violet-500/10",
    bgHover: "hover:bg-violet-500/15",
    border: "border-violet-500/30",
    borderHover: "hover:border-violet-400/50",
    shadow: "shadow-violet-500/10",
    badge: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
    button: "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20",
    ring: "ring-violet-500/40",
    chart: ["#8b5cf6", "#a78bfa", "#c4b5fd", "#6d28d9", "#7c3aed"],
    skeleton: "bg-violet-900/20",

    watermark: "⭐",
    glowColor: "rgba(139,92,246,0.15)",
  },

  Other: {
    id: "other",
    label: "Other",
    fullName: "Other Parties",
    logo: null,

    gradient: "from-slate-600 via-slate-500 to-slate-700",
    gradientSubtle: "from-slate-500/10 via-slate-400/5 to-transparent",

    accent: "#64748b",
    accentLight: "#cbd5e1",
    accentDark: "#475569",

    text: "text-slate-400",
    textLight: "text-slate-300",
    textStrong: "text-slate-500",
    bg: "bg-slate-500/10",
    bgHover: "hover:bg-slate-500/15",
    border: "border-slate-500/30",
    borderHover: "hover:border-slate-400/50",
    shadow: "shadow-slate-500/10",
    badge: "bg-slate-500/15 text-slate-300 border border-slate-500/30",
    button: "bg-slate-700 hover:bg-slate-600 text-white shadow-lg shadow-slate-700/20",
    ring: "ring-slate-500/40",
    chart: ["#64748b", "#94a3b8", "#cbd5e1", "#475569", "#334155"],
    skeleton: "bg-slate-700/20",

    watermark: "🏛️",
    glowColor: "rgba(100,116,139,0.15)",
  },
};

// Centralized dynamic logo mapping
export const PARTY_LOGOS = {
  BJP: "/BJPLogo.jpg",
  Congress: "/CongressLogo.jpg",
  AAP: "/AAPLogo.jpg",
  BJD: "/BJDimage.avif",
};

/**
 * Get party theme by group/party name (case-insensitive).
 * Falls back to "Other" if not found.
 */
export const getPartyTheme = (name = "") => {
  const key = name.trim();
  // Exact match first
  if (PARTY_THEMES[key]) return PARTY_THEMES[key];
  // Case-insensitive match
  const match = Object.keys(PARTY_THEMES).find(
    (k) => k.toLowerCase() === key.toLowerCase()
  );
  return match ? PARTY_THEMES[match] : PARTY_THEMES.Other;
};

export default PARTY_THEMES;
