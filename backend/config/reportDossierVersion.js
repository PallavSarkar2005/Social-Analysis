/**
 * Political Intelligence Report (dossier) template version.
 * Bump when section layout / assembly rules change — triggers auto-upgrade of stored dossiers.
 */
export const REPORT_DOSSIER_TEMPLATE_VERSION = 12;

export const REPORT_DOSSIER_SECTIONS = [
  "cover",
  "executiveSummary",
  "politicalProfile",
  "careerTimeline",
  "electionHistory",
  "influenceIntelligence",
  "geographicInfluence",
  "newsSentiment",
  "aiInsights",
  "evidenceSources",
  "metadata",
];

export default {
  REPORT_DOSSIER_TEMPLATE_VERSION,
  REPORT_DOSSIER_SECTIONS,
};
