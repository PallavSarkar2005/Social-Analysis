import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PartyLogo from "./PartyLogo";

/**
 * LeaderHeader component
 * Renders the top header block for the party analytics page.
 * Supports action buttons aligned to the right inside the header container.
 */
export default function LeaderHeader({ groupName, fullName, creatorCount, theme, actions }) {
  return (
    <div
      className="relative rounded-3xl overflow-hidden p-6 sm:p-8 border border-white/[0.06] shadow-2xl"
      style={{ background: `linear-gradient(135deg, ${theme.glowColor} 0%, transparent 60%), #0d0e14` }}
    >
      {/* Watermark symbol */}
      <div className="absolute right-6 top-4 text-7xl opacity-[0.05] select-none pointer-events-none">
        {theme.watermark}
      </div>

      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition mb-6 font-semibold tracking-wide"
      >
        <ArrowLeft size={13} /> Back to Dashboard
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        {/* Left side: Logo + Titles */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <PartyLogo
            party={groupName}
            size={84}
            className="shadow-2xl border border-white/[0.08] select-none bg-slate-900/50 p-1"
          />
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${theme.badge}`}>
                {groupName}
              </span>
              {creatorCount !== undefined && (
                <span className="text-xs text-slate-500 font-medium">
                  {creatorCount} creator{creatorCount !== 1 ? "s" : ""} indexed
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {fullName} Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              Live performance indicators and channel index metrics for all registered {fullName} political creators.
            </p>
          </div>
        </div>

        {/* Right side: Actions inside the header box */}
        {actions && (
          <div className="flex items-center gap-3.5 self-center lg:self-auto flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
