import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, TrendingUp, TrendingDown, Clock, Activity } from "lucide-react";
import LeaderAvatar from "./LeaderAvatar";
import PartyBadge from "./PartyBadge";
import MetricItem from "./MetricItem";

/**
 * CreatorCard component
 * Renders individual creator cards with complete layout refactoring:
 * - Top Row: Avatar (consistent size, lazy loaded, proper fit), Name, PartyBadge, State, and Growth Badge.
 * - Middle Row: Subscribers, Total Views, Video Count, and Engagement Rate (evenly spaced).
 * - Bottom Row: Last Synced, Status, and Actions.
 * Integrates smooth Framer Motion spring animations and hover glow/elevation.
 */
export default function CreatorCard({ creator, theme, actions }) {
  const growth = creator.growth || 0;
  const lastSyncDate = creator.lastSync ? new Date(creator.lastSync).toLocaleDateString() : "N/A";
  const navigate = useNavigate();

  const handleCardClick = (e) => {
    // Prevent navigating if user clicks on interactive controls like select, button, trash, or anchor tags
    if (e.target.closest("button") || e.target.closest("select") || e.target.closest("input") || e.target.closest("a") || e.target.closest("option")) {
      return;
    }
    navigate(`/profile/${creator._id || creator.id}`);
  };
  
  // Format numbers cleanly
  const fmt = (n) => {
    if (n == null || isNaN(n)) return "0";
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return String(Math.round(n));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={handleCardClick}
      className={`bg-[#0d0e14]/65 border ${theme.border} hover:border-indigo-500/40 rounded-2xl p-5 space-y-6 overflow-hidden group transition-all backdrop-blur-sm shadow-xl flex flex-col justify-between cursor-pointer`}
    >
      {/* Top Row: Avatar, Name, Party, State, Growth Badge */}
      <div className="flex items-start justify-between gap-3 relative">
        <Link to={`/profile/${creator._id || creator.id}`} className="flex items-center gap-3.5 min-w-0 hover:opacity-90 group/title cursor-pointer">
          <LeaderAvatar creator={creator} size={52} className="border-indigo-500/10 ring-1 ring-white/[0.04] group-hover/title:border-indigo-500/30 transition-all" />
          <div className="min-w-0 space-y-1">
            <h4 className="text-sm sm:text-base font-bold text-white truncate tracking-tight select-none group-hover/title:text-indigo-400 transition-colors">
              {creator.name}
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              <PartyBadge party={creator.party} />
              {creator.state && (
                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-0.5 select-none">
                  <MapPin size={10} className="text-slate-500" />
                  {creator.state}
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Growth badge */}
        <div className={`flex-shrink-0 text-[10px] font-bold flex items-center gap-0.5 px-2.5 py-1 rounded-lg ${
          growth > 0 ? "bg-emerald-500/10 text-emerald-400" :
          growth < 0 ? "bg-red-500/10 text-red-400" : "bg-white/[0.04] text-slate-400"
        }`}>
          {growth > 0 ? <TrendingUp size={11} /> : growth < 0 ? <TrendingDown size={11} /> : null}
          {growth > 0 ? "+" : ""}{growth.toFixed(1)}%
        </div>
      </div>

      {/* Middle Row: Subscribers, Views, Videos, Engagement */}
      <div className="grid grid-cols-4 gap-2 border-t border-b border-white/[0.05] py-4 bg-white/[0.01] rounded-lg px-2">
        <MetricItem label="Subscribers" value={fmt(creator.subscribers)} />
        <MetricItem label="Total Views" value={fmt(creator.totalViews)} />
        <MetricItem label="Videos" value={fmt(creator.totalVideos)} />
        <MetricItem label="Engagement" value={`${(creator.engagementRate || 0).toFixed(2)}%`} />
      </div>

      {/* Bottom Row: Last Synced, Status, Actions */}
      <div className="flex items-center justify-between gap-4 text-[10px] text-slate-500 pt-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Clock size={11} className="text-slate-600" />
            <span>{lastSyncDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity size={11} className="text-emerald-500" />
            <span className="text-emerald-500 font-semibold">Active</span>
          </div>
        </div>
        
        {actions && (
          <div className="flex items-center gap-2 relative z-10">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
}
