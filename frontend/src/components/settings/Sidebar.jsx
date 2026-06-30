import React from "react";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";

export default function Sidebar({ activeTab, setActiveTab, tabs }) {
  return (
    <aside className="w-full md:w-64 flex-shrink-0 md:sticky md:top-24 self-start space-y-1">
      <div className="bg-[#111319]/40 border border-white/[0.04] backdrop-blur-xl p-2 rounded-2xl md:space-y-1 flex md:flex-col overflow-x-auto md:overflow-visible scrollbar-none">
        {tabs.map((tab) => {
          const IconComponent = Icons[tab.icon] || Icons.Settings;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 select-none whitespace-nowrap outline-none ${
                isActive
                  ? "text-indigo-400 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.02]"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSettingsIndicator"
                  className="absolute inset-0 bg-indigo-500/[0.06] border-l-2 border-indigo-500 rounded-xl"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`relative z-10 ${isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-white"}`}>
                <IconComponent size={16} />
              </span>
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
