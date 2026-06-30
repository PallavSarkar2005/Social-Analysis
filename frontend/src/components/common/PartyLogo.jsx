import React, { useState } from "react";
import { motion } from "framer-motion";
import { getPartyTheme } from "../../config/partyThemes";

/**
 * PartyLogo component
 * Renders the official party logo at high resolution.
 * 
 * Quality Principles:
 * - Strictly preserves original logo colors/brightness/blend modes (no CSS filters, overlays, or blend modes).
 * - Displays with object-fit: contain.
 * - Dynamic fallback placeholder if the image fails to load or does not exist.
 * - Uniform premium background container with standard padding to prevent clipping.
 */
export default function PartyLogo({ party = "Independent", size = 40, className = "" }) {
  const theme = getPartyTheme(party);
  const logoSrc = theme.logo;
  const [imgError, setImgError] = useState(false);

  // If we have a logo source and it hasn't errored out
  if (logoSrc && !imgError) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{
          y: -1.5,
          scale: 1.02,
          boxShadow: "0 6px 16px rgba(0, 0, 0, 0.25)"
        }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className={`relative flex-shrink-0 select-none flex items-center justify-center overflow-hidden rounded-xl bg-[#15161c] p-1 border border-white/[0.06] shadow-sm ${className}`}
        style={{
          width: size,
          height: size,
        }}
      >
        <img
          src={logoSrc}
          alt={`${party} logo`}
          className="w-full h-full object-contain object-center"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </motion.div>
    );
  }

  // Graceful, professional text-based fallback badge
  return (
    <div
      className={`rounded-xl flex items-center justify-center font-bold uppercase tracking-wider select-none text-white border ${theme.badge} bg-white/[0.02] ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, size * 0.28),
      }}
    >
      {theme.label.substring(0, 3)}
    </div>
  );
}
