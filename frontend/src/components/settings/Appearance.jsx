import React, { useCallback } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Monitor, Sun, Moon, Check, Eye,
  ToggleLeft, ToggleRight, Sliders, Zap, Type, Layout,
} from "lucide-react";
import { useAppearance } from "../../context/AppearanceContext";

const ACCENT_OPTS = [
  { id: "indigo",  label: "Indigo",  hex: "#6366f1", ring: "#818cf8" },
  { id: "emerald", label: "Emerald", hex: "#10b981", ring: "#34d399" },
  { id: "violet",  label: "Violet",  hex: "#8b5cf6", ring: "#a78bfa" },
  { id: "amber",   label: "Amber",   hex: "#f59e0b", ring: "#fcd34d" },
  { id: "rose",    label: "Rose",    hex: "#f43f5e", ring: "#fb7185" },
  { id: "cyan",    label: "Cyan",    hex: "#06b6d4", ring: "#22d3ee" },
  { id: "orange",  label: "Orange",  hex: "#f97316", ring: "#fb923c" },
];

const card = "bg-[#111319]/60 border border-white/[0.05] rounded-2xl p-5 space-y-4 backdrop-blur-sm";
const sectionLabel = "text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em] flex items-center gap-1.5";

export default function Appearance() {
  const { prefs, update } = useAppearance();
  const { theme, accent, fontSize, compact, animations } = prefs;

  // Determine current accent hex for live preview
  const accentHex = ACCENT_OPTS.find((a) => a.id === accent)?.hex || "#6366f1";
  const accentRing = ACCENT_OPTS.find((a) => a.id === accent)?.ring || "#818cf8";

  const handleToggleCompact = useCallback(() => update({ compact: !compact }), [compact, update]);

  // Live preview theme helper
  const previewBg   = theme === "light" ? "#f8fafc" : "#0d0e14";
  const previewCard = theme === "light" ? "#ffffff" : "#12141c";
  const previewText = theme === "light" ? "#0f172a" : "#e2e8f0";
  const previewMut  = theme === "light" ? "#64748b" : "#64748b";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="si-accent-text" size={20} /> Appearance
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          All settings take effect instantly and are saved to your account.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Controls ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Theme Mode */}
          <div className={card}>
            <h3 className={sectionLabel}><Monitor size={11} /> Theme Mode</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "light",  label: "Light",  icon: <Sun  size={15} /> },
                { id: "dark",   label: "Dark",   icon: <Moon size={15} /> },
                { id: "system", label: "System", icon: <Monitor size={15} /> },
              ].map((t) => (
                <motion.button
                  key={t.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => update({ theme: t.id })}
                  className={`h-16 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                    theme === t.id
                      ? "si-accent-bg si-accent-border text-white"
                      : "bg-[#181b24]/60 border-white/[0.06] text-slate-400 hover:border-white/[0.12] hover:text-white"
                  }`}
                >
                  {t.icon}
                  <span className="text-[10px] font-semibold">{t.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div className={card}>
            <h3 className={sectionLabel}><Sliders size={11} /> Accent Color</h3>
            <div className="flex items-center flex-wrap gap-3">
              {ACCENT_OPTS.map((a) => (
                <motion.button
                  key={a.id}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => update({ accent: a.id })}
                  title={a.label}
                  className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: a.hex,
                    boxShadow: accent === a.id ? `0 0 0 3px ${a.ring}, 0 0 14px ${a.hex}55` : "none",
                    outline: accent === a.id ? `2px solid ${a.ring}` : "2px solid transparent",
                    outlineOffset: "2px",
                  }}
                >
                  {accent === a.id && (
                    <Check size={13} className="text-white font-extrabold drop-shadow" />
                  )}
                </motion.button>
              ))}
              <span className="text-xs text-slate-500 ml-1 capitalize">{accent}</span>
            </div>

            {/* Color name strip */}
            <div
              className="h-0.5 rounded-full w-full mt-1 transition-all duration-500"
              style={{ background: `linear-gradient(90deg, ${accentHex}, ${accentRing})` }}
            />
          </div>

          {/* Font Size */}
          <div className={card}>
            <h3 className={sectionLabel}><Type size={11} /> Font Size</h3>
            <div className="bg-[#0d0e14] border border-white/[0.06] p-1 rounded-xl flex gap-1">
              {[
                { id: "small",  label: "Aa", sub: "Small" },
                { id: "medium", label: "Aa", sub: "Medium" },
                { id: "large",  label: "Aa", sub: "Large" },
              ].map((sz) => (
                <button
                  key={sz.id}
                  onClick={() => update({ fontSize: sz.id })}
                  className={`flex-1 py-2.5 rounded-lg transition-all flex flex-col items-center gap-0.5 ${
                    fontSize === sz.id
                      ? "si-accent-bg text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                  style={fontSize === sz.id ? {
                    boxShadow: `0 0 12px rgba(var(--si-accent) / 0.2)`
                  } : {}}
                >
                  <span className={`font-bold leading-none ${
                    sz.id === "small" ? "text-xs" : sz.id === "large" ? "text-lg" : "text-sm"
                  }`}>{sz.label}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{sz.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Compact Mode + Animation Level */}
          <div className={card}>
            <div className="space-y-5 divide-y divide-white/[0.04]">

              {/* Compact Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Layout size={13} className="si-accent-text" /> Compact Mode
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Reduces padding and card spacing — fits more data on screen.
                  </p>
                </div>
                <motion.button
                  onClick={handleToggleCompact}
                  whileTap={{ scale: 0.9 }}
                  className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 flex-shrink-0 ${
                    compact ? "si-accent-bg" : "bg-white/[0.06] border border-white/[0.08]"
                  }`}
                  style={compact ? {
                    backgroundColor: `rgb(var(--si-accent))`,
                    boxShadow: `0 0 10px rgba(var(--si-accent) / 0.35)`
                  } : {}}
                >
                  <motion.div
                    layout
                    className="w-4.5 h-4.5 rounded-full bg-white shadow-md"
                    animate={{ x: compact ? 18 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    style={{ width: 18, height: 18 }}
                  />
                </motion.button>
              </div>

              {/* Animation Level */}
              <div className="flex items-center justify-between pt-5">
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Zap size={13} className="si-accent-text" /> Animation Level
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Controls all Framer Motion transitions and chart animation speeds.
                  </p>
                </div>
                <div className="bg-[#0d0e14] border border-white/[0.06] p-0.5 rounded-xl flex gap-0.5 flex-shrink-0">
                  {[
                    { id: "minimal", label: "Min" },
                    { id: "full",    label: "Full" },
                    { id: "off",     label: "Off" },
                  ].map((anim) => (
                    <button
                      key={anim.id}
                      onClick={() => update({ animations: anim.id })}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                        animations === anim.id
                          ? "text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                      style={animations === anim.id ? {
                        backgroundColor: `rgb(var(--si-accent))`,
                        boxShadow: `0 0 8px rgba(var(--si-accent) / 0.3)`
                      } : {}}
                    >
                      {anim.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Right Column: Live Preview ── */}
        <div className="lg:col-span-1">
          <div className={`${card} !space-y-5 h-full flex flex-col justify-between`}>
            <div className="space-y-4">
              <h3 className={sectionLabel}><Eye size={11} /> Live Preview</h3>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Reflects your selected theme, accent, and spacing in real time.
              </p>

              {/* Simulated card preview */}
              <motion.div
                layout
                className="rounded-xl p-4 space-y-3 border transition-all"
                style={{
                  background: previewCard,
                  borderColor: "rgba(255,255,255,0.06)",
                  padding: compact ? "0.75rem" : "1rem",
                }}
              >
                {/* Fake avatar + title row */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0"
                    style={{ background: accentHex, opacity: 0.9 }}
                  />
                  <div className="space-y-1 flex-1">
                    <div className="h-2 rounded-sm w-24" style={{ background: previewText, opacity: 0.7 }} />
                    <div className="h-1.5 rounded-sm w-14" style={{ background: previewMut, opacity: 0.5 }} />
                  </div>
                </div>

                {/* Fake metric row */}
                <div className="grid grid-cols-3 gap-2">
                  {["12.4K", "94%", "+2.1%"].map((val, i) => (
                    <div
                      key={i}
                      className="rounded-lg p-2 text-center"
                      style={{ background: `${accentHex}18` }}
                    >
                      <div className="text-[10px] font-bold" style={{ color: accentHex }}>{val}</div>
                      <div className="text-[8px] mt-0.5" style={{ color: previewMut, opacity: 0.8 }}>Metric</div>
                    </div>
                  ))}
                </div>

                {/* Fake button */}
                <button
                  className="w-full py-1.5 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider transition-all"
                  style={{ background: accentHex, boxShadow: `0 0 10px ${accentHex}40` }}
                >
                  Accent Button
                </button>
              </motion.div>

              {/* Active settings summary */}
              <div className="space-y-2">
                {[
                  { label: "Theme",      val: theme.charAt(0).toUpperCase() + theme.slice(1) },
                  { label: "Accent",     val: ACCENT_OPTS.find(a => a.id === accent)?.label || accent },
                  { label: "Font",       val: fontSize.charAt(0).toUpperCase() + fontSize.slice(1) },
                  { label: "Compact",    val: compact ? "Enabled" : "Disabled" },
                  { label: "Animations", val: animations.charAt(0).toUpperCase() + animations.slice(1) },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-semibold" style={{ color: accentHex }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reset button */}
            <button
              onClick={() => {
                import("../../context/AppearanceContext").then(({ useAppearance: _ }) => {});
              }}
              className="w-full h-8 px-4 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] text-slate-400 hover:text-white transition text-[10px] font-semibold mt-2"
            >
              Saved automatically ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
