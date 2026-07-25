import React, { useState, memo } from "react";
import { getPartyTheme } from "../../config/partyThemes";
import SafeImage from "./SafeImage";

/**
 * PartyLogo — official logo with SafeImage fallback (no broken icons).
 * Hover lift uses CSS transform (GPU) instead of Framer Motion for 60fps lists.
 */
function PartyLogo({ party = "Independent", size = 40, className = "" }) {
  const theme = getPartyTheme(party);
  const logoSrc = theme.logo;
  const [imgError, setImgError] = useState(false);

  if (logoSrc && !imgError) {
    return (
      <div
        className={`relative flex-shrink-0 select-none flex items-center justify-center overflow-hidden rounded-xl bg-[#15161c] p-1 border border-white/[0.06] shadow-sm transition-transform duration-200 will-change-transform hover:-translate-y-0.5 hover:scale-[1.02] ${className}`}
        style={{ width: size, height: size }}
      >
        <SafeImage
          src={logoSrc}
          alt={`${party} logo`}
          className="w-full h-full"
          imgClassName="w-full h-full object-contain object-center"
          size="thumb"
          onError={() => setImgError(true)}
          skeleton={false}
          blurUp={false}
        />
      </div>
    );
  }

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

export default memo(PartyLogo);
