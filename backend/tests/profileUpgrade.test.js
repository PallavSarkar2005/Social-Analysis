import {
  PROFILE_BUILDER_VERSIONS,
  getOutdatedSections,
  getProfileUpgradePlan,
} from "../config/profileBuilderVersion.js";

describe("Profile upgrade versioning", () => {
  const currentProfile = {
    profileSchemaVersion: PROFILE_BUILDER_VERSIONS.profileSchemaVersion,
    profileEngineVersion: PROFILE_BUILDER_VERSIONS.profileEngineVersion,
    moduleVersion: PROFILE_BUILDER_VERSIONS.moduleVersion,
    builderVersion: PROFILE_BUILDER_VERSIONS.builderVersion,
    overviewVersion: PROFILE_BUILDER_VERSIONS.overviewVersion,
    timelineVersion: PROFILE_BUILDER_VERSIONS.timelineVersion,
    factsVersion: PROFILE_BUILDER_VERSIONS.factsVersion,
    electionVersion: PROFILE_BUILDER_VERSIONS.electionVersion,
    relationshipVersion: PROFILE_BUILDER_VERSIONS.relationshipVersion,
    aiVersion: PROFILE_BUILDER_VERSIONS.aiVersion,
    influenceVersion: PROFILE_BUILDER_VERSIONS.influenceVersion,
    reachVersion: PROFILE_BUILDER_VERSIONS.reachVersion,
    newsVersion: PROFILE_BUILDER_VERSIONS.newsVersion,
    news: [{ headline: "Cached story", source: "News" }],
    lastSynced: new Date(),
  };

  it("detects legacy profiles as needing work", () => {
    const legacy = { builderVersion: 0, overviewVersion: 0, aiVersion: 0 };
    const plan = getProfileUpgradePlan(legacy);
    expect(plan.needsWork).toBe(true);
    expect(plan.outdatedSections.length).toBeGreaterThan(0);
  });

  it("marks current profiles as up to date", () => {
    const plan = getProfileUpgradePlan(currentProfile);
    expect(plan.isCurrent).toBe(true);
    expect(plan.needsWork).toBe(false);
    expect(plan.outdatedSections).toEqual([]);
  });

  it("rebuilds only AI when aiVersion is behind", () => {
    const outdatedAi = {
      ...currentProfile,
      aiVersion: PROFILE_BUILDER_VERSIONS.aiVersion - 1,
    };
    expect(getOutdatedSections(outdatedAi)).toEqual(["ai"]);
  });

  it("rebuilds only elections when electionVersion is behind", () => {
    const outdatedElections = {
      ...currentProfile,
      electionVersion: PROFILE_BUILDER_VERSIONS.electionVersion - 1,
    };
    expect(getOutdatedSections(outdatedElections)).toEqual(["elections"]);
  });

  it("rebuilds only timeline when timelineVersion is behind", () => {
    const outdatedTimeline = {
      ...currentProfile,
      timelineVersion: PROFILE_BUILDER_VERSIONS.timelineVersion - 1,
    };
    expect(getOutdatedSections(outdatedTimeline)).toEqual(["timeline"]);
  });

  it("rebuilds only news when newsVersion is behind", () => {
    const outdatedNews = {
      ...currentProfile,
      newsVersion: PROFILE_BUILDER_VERSIONS.newsVersion - 1,
    };
    expect(getOutdatedSections(outdatedNews)).toEqual(["news"]);
  });

  it("does not force full rebuild when only builderVersion is behind", () => {
    const outdatedBuilder = {
      ...currentProfile,
      builderVersion: PROFILE_BUILDER_VERSIONS.builderVersion - 1,
    };
    expect(getOutdatedSections(outdatedBuilder)).toEqual([]);
    expect(getProfileUpgradePlan(outdatedBuilder).needsWork).toBe(true);
  });

  it("flags schema migration without content sections when only schema version is behind", () => {
    const schemaLegacy = {
      ...currentProfile,
      profileSchemaVersion: 0,
      moduleVersion: 0,
    };
    const plan = getProfileUpgradePlan(schemaLegacy);
    expect(plan.schemaMigration).toBe(true);
    expect(plan.outdatedSections).toEqual([]);
    expect(plan.needsWork).toBe(true);
  });
});
