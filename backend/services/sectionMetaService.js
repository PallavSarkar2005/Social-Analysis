/**
 * Section-level freshness metadata for intelligence panels.
 */
export const buildSectionMeta = ({
  sources = [],
  lastVerified = null,
  confidenceBreakdown = {},
  timeline = [],
  verifiedFacts = [],
  elections = [],
}) => {
  const sourceCount = sources.filter((s) => (s.confidence ?? 0) > 0 || s.verified).length;
  const verifiedAt = lastVerified ? new Date(lastVerified).toISOString() : null;
  const verifiedDate = lastVerified ? new Date(lastVerified).toISOString().slice(0, 10) : null;

  const base = {
    lastVerified: verifiedDate,
    sourceCount,
    confidence: confidenceBreakdown.overall || 0,
  };

  return {
    profile: { ...base },
    timeline: {
      lastVerified: verifiedDate,
      sourceCount,
      confidence: confidenceBreakdown.biography || confidenceBreakdown.overall || 0,
      eventCount: timeline.length,
    },
    facts: {
      lastVerified: verifiedDate,
      sourceCount,
      confidence: confidenceBreakdown.identity || confidenceBreakdown.overall || 0,
      factCount: verifiedFacts.length,
    },
    elections: {
      lastVerified: verifiedDate,
      sourceCount,
      confidence: confidenceBreakdown.electionHistory || confidenceBreakdown.overall || 0,
      electionCount: elections.length,
    },
    relationships: {
      lastVerified: verifiedDate,
      sourceCount,
      confidence: confidenceBreakdown.biography || confidenceBreakdown.overall || 0,
    },
    ai: {
      lastVerified: verifiedDate,
      sourceCount,
      confidence: confidenceBreakdown.overall || 0,
    },
  };
};

/**
 * Canonical verification sources with match status from scraped data.
 */
export const CANONICAL_VERIFICATION_SOURCES = [
  { key: "lokSabha", label: "Lok Sabha", matchers: ["lok sabha", "sansad"] },
  { key: "rajyaSabha", label: "Rajya Sabha", matchers: ["rajya sabha"] },
  { key: "myneta", label: "MyNeta", matchers: ["myneta"] },
  { key: "eci", label: "Election Commission", matchers: ["election commission", "eci affidavit"] },
  { key: "stateAssembly", label: "State Assembly", matchers: ["state assembly", "legislative assembly"] },
  { key: "government", label: "Government", matchers: ["government", "sansad.in"] },
  { key: "partyWebsite", label: "Party Website", matchers: ["party website", "official party", "bjp", "congress", "aap", "trinamool", "samajwadi", "bahujan"] },
  { key: "wikipedia", label: "Wikipedia", matchers: ["wikipedia"] },
];

export const buildVerificationCatalog = (sources = [], lastVerified = null) => {
  const safeSources = Array.isArray(sources) ? sources : [];
  return CANONICAL_VERIFICATION_SOURCES.map((canonical) => {
    const match = safeSources.find((s) => {
      const name = String(s.name || "").toLowerCase();
      return (canonical.matchers ?? []).some((m) => name.includes(m));
    });

    return {
      key: canonical.key,
      label: canonical.label,
      verified: Boolean(match),
      url: match?.url || null,
      confidence: match?.confidence ?? 0,
      fetchedAt: match?.fetchedAt || null,
      lastVerified: lastVerified ? new Date(lastVerified).toISOString().slice(0, 10) : null,
    };
  }).filter((entry) => entry.verified);
};
