/**
 * Single source of truth for PoliticalProfile builder versions.
 * Bump a section version when its build logic changes to trigger targeted rebuilds.
 * Bump builderVersion to force a full profile rebuild across all sections.
 */
export const PROFILE_BUILDER_VERSIONS = {
  builderVersion: 3,
  overviewVersion: 3,
  timelineVersion: 3,
  factsVersion: 2,
  electionVersion: 2,
  relationshipVersion: 2,
  aiVersion: 3,
  influenceVersion: 1,
  reachVersion: 1,
};

export const PROFILE_VERSION_FIELDS = [
  "builderVersion",
  "overviewVersion",
  "timelineVersion",
  "factsVersion",
  "electionVersion",
  "relationshipVersion",
  "aiVersion",
  "influenceVersion",
  "reachVersion",
];

export default PROFILE_BUILDER_VERSIONS;
