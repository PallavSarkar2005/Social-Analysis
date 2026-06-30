import React, { useState } from "react";
import { Sparkles, Monitor, Sun, Moon, Check, Eye, ToggleLeft, ToggleRight, Layout, Sliders } from "lucide-react";
import toast from "react-hot-toast";

export default function Appearance() {
  const [theme, setTheme] = useState("dark");
  const [accent, setAccent] = useState("indigo");
  const [fontSize, setFontSize] = useState("medium");
  const [compact, setCompact] = useState(false);
  const [sidebarStyle, setSidebarStyle] = useState("floating");
  const [density, setDensity] = useState("normal");
  const [animations, setAnimations] = useState("full");

  const accents = [
    { id: "indigo", color: "bg-indigo-500", border: "border-indigo-400" },
    { id: "emerald", color: "bg-emerald-500", border: "border-emerald-400" },
    { id: "violet", color: "bg-violet-500", border: "border-violet-400" },
    { id: "amber", color: "bg-amber-500", border: "border-amber-400" },
    { id: "rose", color: "bg-rose-500", border: "border-rose-400" },
  ];

  const handleApply = () => {
    toast.success("Appearance settings updated locally!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="text-indigo-400" size={20} /> Appearance
        </h2>
        <p className="text-xs text-slate-400 mt-1">Personalize the styling telemetry, color accents, layout density, and animations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customizer settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Theme selection */}
          <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Monitor size={12} /> Theme Selection
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "light", label: "Light Mode", icon: <Sun size={14} /> },
                { id: "dark", label: "Dark Mode", icon: <Moon size={14} /> },
                { id: "auto", label: "System Sync", icon: <Monitor size={14} /> },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`h-16 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                    theme === t.id
                      ? "bg-indigo-500/[0.04] border-indigo-500 text-indigo-400"
                      : "bg-[#181b24]/40 border-white/[0.06] text-slate-400 hover:border-white/[0.1] hover:text-white"
                  }`}
                >
                  {t.icon}
                  <span className="text-[10px] font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Accent & Font Density */}
          <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-6">
            {/* Color Accent */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sliders size={12} /> Color Accent
              </h3>
              <div className="flex items-center gap-3">
                {accents.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setAccent(acc.id)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      accent === acc.id
                        ? `${acc.border} border-white scale-110 shadow-lg`
                        : "border-transparent opacity-75 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full ${acc.color} flex items-center justify-center`}>
                      {accent === acc.id && <Check size={10} className="text-black font-extrabold" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Density & Compact Toggles */}
            <div className="divide-y divide-white/[0.04] space-y-4 pt-2">
              <div className="flex items-center justify-between pt-4 first:pt-0">
                <div className="space-y-1 pr-4">
                  <h4 className="text-xs font-semibold text-white">Compact Mode</h4>
                  <p className="text-[10px] text-slate-400">Reduce spacing and padding variables to fit more charts on screen.</p>
                </div>
                <button
                  onClick={() => setCompact(!compact)}
                  className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 ${
                    compact ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                      compact ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-1 pr-4">
                  <h4 className="text-xs font-semibold text-white">Font Size</h4>
                  <p className="text-[10px] text-slate-400">Adjust the dashboard text hierarchy rendering scale.</p>
                </div>
                <div className="bg-[#181b24] border border-white/[0.06] p-0.5 rounded-lg flex gap-1">
                  {["small", "medium", "large"].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setFontSize(sz)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition ${
                        fontSize === sz
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-1 pr-4">
                  <h4 className="text-xs font-semibold text-white">Animations Level</h4>
                  <p className="text-[10px] text-slate-400">Manage framer-motion transitions and chart render durations.</p>
                </div>
                <select
                  value={animations}
                  onChange={(e) => setAnimations(e.target.value)}
                  className="h-9 px-3 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="full">Full Transitions</option>
                  <option value="minimal">Minimal Loaders</option>
                  <option value="off">None (No Animations)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-1">
          <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-6 flex flex-col justify-between h-full">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Eye size={12} /> Live Preview
              </h3>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                See a preview of how UI cards look with your selected theme and accent options.
              </p>

              <div className="bg-[#090a0f] p-4 rounded-xl border border-white/[0.06] space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <div className="h-2 w-16 bg-white/[0.08] rounded" />
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="h-3 w-full bg-white/[0.06] rounded-md" />
                  <div className="h-2 w-3/4 bg-white/[0.04] rounded-md" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="h-4 w-10 bg-white/[0.06] rounded-md" />
                  <button
                    type="button"
                    className={`h-5 px-2.5 rounded text-[8px] font-bold text-white flex items-center justify-center uppercase tracking-wider ${
                      accent === "indigo" ? "bg-indigo-600" :
                      accent === "emerald" ? "bg-emerald-600" :
                      accent === "violet" ? "bg-violet-600" :
                      accent === "amber" ? "bg-amber-600" : "bg-rose-600"
                    }`}
                  >
                    Button
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleApply}
              className="w-full h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-2 text-xs font-semibold shadow-lg shadow-indigo-600/20 pt-1 mt-6"
            >
              Apply Theme Specs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
