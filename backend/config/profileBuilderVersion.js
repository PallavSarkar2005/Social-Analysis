/**
 * Single source of truth for PoliticalProfile builder and upgrade versions.
 *
 * Bump guidance:
 * - profileSchemaVersion: MongoDB document shape / moduleMeta migration only (no content rebuild)
 * - profileEngineVersion: orchestration logic changes (may trigger targeted section rebuilds)
 * - moduleVersion: module descriptor schema (moduleMeta shape)
 * - *Version section fields: rebuild only that section's content
 * - builderVersion: legacy compatibility stamp; does NOT force full rebuild when
 *   BUILDER_VERSION_FORCES_FULL_REBUILD is false
 */
export const PROFILE_BUILDER_VERSIONS = {
  profileSchemaVersion: 1,
  profileEngineVersion: 2,
  moduleVersion: 1,
  builderVersion: 3,
  overviewVersion: 4,
  timelineVersion: 6,
  factsVersion: 2,
  electionVersion: 3,
  relationshipVersion: 2,
  aiVersion: 3,
  influenceVersion: 1,
  reachVersion: 1,
  newsVersion: 1,
};

/** When false, a builderVersion bump alone will not rebuild every section. */
export const BUILDER_VERSION_FORCES_FULL_REBUILD = false;

export const PROFILE_META_VERSION_FIELDS = [
  "profileSchemaVersion",
  "profileEngineVersion",
  "moduleVersion",
];

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
  "newsVersion",
];

export const PROFILE_ALL_VERSION_FIELDS = [
  ...PROFILE_META_VERSION_FIELDS,
  ...PROFILE_VERSION_FIELDS,
];

export const PROFILE_BUILD_SECTIONS = [
  "overview",
  "facts",
  "timeline",
  "elections",
  "relationships",
  "news",
  "ai",
  "influence",
  "reach",
];

export const SECTION_VERSION_KEY = {
  overview: "overviewVersion",
  facts: "factsVersion",
  timeline: "timelineVersion",
  elections: "electionVersion",
  relationships: "relationshipVersion",
  news: "newsVersion",
  ai: "aiVersion",
  influence: "influenceVersion",
  reach: "reachVersion",
};

/** Sections to rebuild when profileEngineVersion is behind. */
export const ENGINE_UPGRADE_SECTIONS = ["overview", "facts", "timeline", "elections"];

export const MODULE_CACHE_TTL_MS = {
  overview: 30 * 24 * 60 * 60 * 1000,
  timeline: 30 * 24 * 60 * 60 * 1000,
  elections: 30 * 24 * 60 * 60 * 1000,
  verification: 30 * 24 * 60 * 60 * 1000,
  relationships: 30 * 24 * 60 * 60 * 1000,
  news: 30 * 60 * 1000,
  sentiment: 30 * 60 * 1000,
  youtube: 6 * 60 * 60 * 1000,
  influence: 6 * 60 * 60 * 1000,
  aiSummary: 7 * 24 * 60 * 60 * 1000,
};

export const getStoredVersion = (profile, field) => profile?.[field] ?? 0;

export const isNewsCacheExpired = (profile, now = Date.now()) => {
  if (!profile?.news?.length) return true;
  const lastSynced = profile?.lastSynced ? new Date(profile.lastSynced).getTime() : 0;
  return now - lastSynced > MODULE_CACHE_TTL_MS.news;
};

/**
 * Returns section keys whose stored content version is behind the application version.
 */
export const getOutdatedSections = (profile, { force = false, now = Date.now() } = {}) => {
  if (force || !profile) return [...PROFILE_BUILD_SECTIONS];

  if (
    BUILDER_VERSION_FORCES_FULL_REBUILD &&
    getStoredVersion(profile, "builderVersion") < PROFILE_BUILDER_VERSIONS.builderVersion
  ) {
    return [...PROFILE_BUILD_SECTIONS];
  }

  const outdated = new Set();

  for (const section of PROFILE_BUILD_SECTIONS) {
    const versionKey = SECTION_VERSION_KEY[section];
    if (
      versionKey &&
      getStoredVersion(profile, versionKey) < PROFILE_BUILDER_VERSIONS[versionKey]
    ) {
      outdated.add(section);
    }
  }

  if (getStoredVersion(profile, "profileEngineVersion") < PROFILE_BUILDER_VERSIONS.profileEngineVersion) {
    for (const section of ENGINE_UPGRADE_SECTIONS) {
      outdated.add(section);
    }
  }

  if (isNewsCacheExpired(profile, now)) {
    outdated.add("news");
  }

  return [...outdated];
};

export const needsSchemaMigration = (profile) =>
  !profile ||
  getStoredVersion(profile, "profileSchemaVersion") < PROFILE_BUILDER_VERSIONS.profileSchemaVersion ||
  getStoredVersion(profile, "moduleVersion") < PROFILE_BUILDER_VERSIONS.moduleVersion;

export const needsEngineMigration = (profile) =>
  !profile ||
  getStoredVersion(profile, "profileEngineVersion") < PROFILE_BUILDER_VERSIONS.profileEngineVersion;

/**
 * Upgrade plan used by background sync — incremental, idempotent, restart-safe.
 */
export const getProfileUpgradePlan = (profile, { force = false, now = Date.now() } = {}) => {
  const outdatedSections = getOutdatedSections(profile, { force, now });
  const schemaMigration = needsSchemaMigration(profile);
  const engineMigration = needsEngineMigration(profile);

  const needsBuilderStamp =
    Boolean(profile) &&
    getStoredVersion(profile, "builderVersion") < PROFILE_BUILDER_VERSIONS.builderVersion;

  const needsWork =
    force ||
    !profile ||
    schemaMigration ||
    engineMigration ||
    needsBuilderStamp ||
    outdatedSections.length > 0;

  return {
    needsWork,
    schemaMigration,
    engineMigration,
    outdatedSections,
    isCurrent: Boolean(profile) && !needsWork,
    storedVersions: PROFILE_ALL_VERSION_FIELDS.reduce((acc, field) => {
      acc[field] = getStoredVersion(profile, field);
      return acc;
    }, {}),
    targetVersions: { ...PROFILE_BUILDER_VERSIONS },
  };
};

export const isProfileOutdated = (profile) => getProfileUpgradePlan(profile).needsWork;

export const buildModuleVersionsSnapshot = (sectionsBuilt = []) => {
  const snapshot = {};
  for (const section of sectionsBuilt) {
    const versionKey = SECTION_VERSION_KEY[section];
    if (versionKey) {
      snapshot[section] = PROFILE_BUILDER_VERSIONS[versionKey];
    }
  }
  return snapshot;
};

export const applyVersionStamp = (sectionsBuilt = []) => {
  const versions = {
    builderVersion: PROFILE_BUILDER_VERSIONS.builderVersion,
    profileSchemaVersion: PROFILE_BUILDER_VERSIONS.profileSchemaVersion,
    profileEngineVersion: PROFILE_BUILDER_VERSIONS.profileEngineVersion,
    moduleVersion: PROFILE_BUILDER_VERSIONS.moduleVersion,
    lastBuiltAt: new Date(),
  };

  for (const section of sectionsBuilt) {
    const versionKey = SECTION_VERSION_KEY[section];
    if (versionKey) {
      versions[versionKey] = PROFILE_BUILDER_VERSIONS[versionKey];
    }
  }

  return versions;
};

export default PROFILE_BUILDER_VERSIONS;
