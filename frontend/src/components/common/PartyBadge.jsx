import React from "react";
import { getPartyTheme } from "../../config/partyThemes";

/**
 * PartyBadge component
 * Renders a consistent, styled badge for a political party with exact theme colors.
 */
export default function PartyBadge({ party = "Independent", className = "" }) {
  const theme = getPartyTheme(party);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${theme.badge} ${className}`}
    >
      {theme.label}
    </span>
  );
}
