import React, { useState } from "react";

// Inline simplified representation of India state SVG paths for clean, reliable rendering
const STATE_PATHS = [
  // Assam (North East)
  { id: "IN-AS", name: "Assam", path: "M 230 110 L 260 105 L 280 115 L 290 130 L 270 145 L 250 140 L 235 125 Z" },
  // Delhi / North
  { id: "IN-DL", name: "Delhi", path: "M 118 90 L 123 90 L 123 95 L 118 95 Z" },
  // Uttar Pradesh
  { id: "IN-UP", name: "Uttar Pradesh", path: "M 110 95 L 150 95 L 175 120 L 155 145 L 120 130 L 105 110 Z" },
  // Gujarat
  { id: "IN-GJ", name: "Gujarat", path: "M 35 130 L 70 120 L 80 145 L 60 170 L 40 160 L 30 145 Z" },
  // Maharashtra
  { id: "IN-MH", name: "Maharashtra", path: "M 65 170 L 105 170 L 125 190 L 115 220 L 80 215 L 60 190 Z" },
  // Bihar
  { id: "IN-BR", name: "Bihar", path: "M 175 120 L 205 120 L 205 140 L 175 145 Z" },
  // West Bengal
  { id: "IN-WB", name: "West Bengal", path: "M 205 140 L 220 140 L 215 190 L 200 180 L 195 155 Z" },
  // Karnataka
  { id: "IN-KA", name: "Karnataka", path: "M 75 220 L 95 225 L 90 270 L 70 265 L 68 240 Z" },
  // Tamil Nadu
  { id: "IN-TN", name: "Tamil Nadu", path: "M 90 270 L 110 270 L 105 315 L 85 310 L 88 285 Z" },
  // Rajasthan
  { id: "IN-RJ", name: "Rajasthan", path: "M 60 90 L 100 85 L 110 115 L 75 135 L 50 125 Z" },
  // Jammu & Kashmir / Ladakh
  { id: "IN-JK", name: "Jammu & Kashmir", path: "M 95 30 L 115 35 L 125 60 L 95 65 L 85 45 Z" },
  // Madhya Pradesh
  { id: "IN-MP", name: "Madhya Pradesh", path: "M 90 135 L 130 132 L 150 160 L 105 170 L 80 145 Z" },
  // Andhra Pradesh / Telangana
  { id: "IN-AP", name: "Andhra Pradesh", path: "M 115 200 L 135 190 L 135 250 L 100 260 L 105 225 Z" },
];

export default function IndiaMap({ data = [], activeState = "" }) {
  const [hoveredState, setHoveredState] = useState(null);

  // Map data values
  const getHighlightInfo = (stateName) => {
    // If exact name matches or "other" matches
    const stateData = data.find((item) => item.state.toLowerCase() === stateName.toLowerCase());
    if (stateData) return stateData;

    // Fallback default structure
    const isActive = activeState.toLowerCase() === stateName.toLowerCase();
    return {
      state: stateName,
      concentration: isActive ? 60 : 5,
      influenceScore: isActive ? 80 : 25,
      isHomeState: isActive,
    };
  };

  return (
    <div className="relative w-full h-[320px] bg-[#121318]/30 border border-white/[0.06] rounded-2xl p-4 flex flex-col justify-between overflow-hidden shadow-sm">
      <div className="z-10">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Geographic Footprint</h4>
        <p className="text-[10px] text-slate-500 mt-0.5">Follower concentration & state influence index</p>
      </div>

      <div className="flex-1 w-full flex items-center justify-center relative">
        <svg
          viewBox="0 0 320 340"
          className="w-full h-full max-h-[260px] select-none filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
        >
          <g fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1">
            {STATE_PATHS.map((state) => {
              const info = getHighlightInfo(state.name);
              const isHovered = hoveredState?.id === state.id;
              const isHome = info.isHomeState || state.name.toLowerCase() === activeState?.toLowerCase();

              // Calculate fill color based on concentration
              // Higher concentration = brighter indigo/purple gradient
              let fillVal = "rgba(255, 255, 255, 0.02)";
              if (isHome) {
                fillVal = "rgba(99, 102, 241, 0.25)"; // Indigo-500/25
              } else if (info.concentration > 30) {
                fillVal = "rgba(139, 92, 246, 0.20)"; // Purple-500/20
              } else if (info.concentration > 10) {
                fillVal = "rgba(139, 92, 246, 0.12)"; // Purple-500/12
              } else if (info.concentration > 0) {
                fillVal = "rgba(139, 92, 246, 0.05)"; // Purple-500/5
              }

              if (isHovered) {
                fillVal = isHome ? "rgba(99, 102, 241, 0.45)" : "rgba(139, 92, 246, 0.35)";
              }

              return (
                <path
                  key={state.id}
                  d={state.path}
                  fill={fillVal}
                  stroke={isHovered ? "#818cf8" : isHome ? "rgba(99, 102, 241, 0.6)" : "rgba(255,255,255,0.08)"}
                  strokeWidth={isHovered ? 1.5 : 1}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredState({ id: state.id, name: state.name, info })}
                  onMouseLeave={() => setHoveredState(null)}
                />
              );
            })}
          </g>
        </svg>

        {/* Floating Interactive Tooltip */}
        {hoveredState && (
          <div className="absolute bottom-2 left-2 z-20 bg-[#161822] border border-white/[0.08] backdrop-blur-md rounded-xl p-3 text-left shadow-xl flex flex-col space-y-1 animate-in fade-in zoom-in-95 duration-100 min-w-[130px]">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-xs font-bold text-white">{hoveredState.name}</span>
              {hoveredState.info.isHomeState && (
                <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-1 rounded-sm uppercase tracking-wider font-extrabold ml-auto">Home</span>
              )}
            </div>
            <div className="flex justify-between items-center text-[10px] pt-1 border-t border-white/[0.04]">
              <span className="text-slate-400">Share of Audience</span>
              <span className="font-bold text-white">{hoveredState.info.concentration}%</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400">Influence Score</span>
              <span className="font-bold text-indigo-400">{hoveredState.info.influenceScore}/100</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[9px] text-slate-500 border-t border-white/[0.04] pt-2 z-10">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-indigo-500/35 border border-indigo-500/50" />
          <span>Home State</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-purple-500/20 border border-purple-500/30" />
          <span>High Reach (&gt;30%)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-white/[0.02] border border-white/[0.08]" />
          <span>Low Reach (&lt;5%)</span>
        </div>
      </div>
    </div>
  );
}
