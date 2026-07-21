import {
  buildSearchKeywords,
  compareEngineVersions,
  isUpdateAvailable,
  attachUpdateAvailable,
} from "../services/reportSyncService.js";
import PROFILE_BUILDER_VERSIONS from "../config/profileBuilderVersion.js";

describe("reportSyncService keywords", () => {
  test("dedupes politician name, party, state", () => {
    const keywords = buildSearchKeywords({
      name: "Mohan Yadav",
      party: "BJP",
      state: "Madhya Pradesh",
      tags: ["BJP", "bjp"],
      extras: ["political"],
    });
    expect(keywords).toEqual(
      expect.arrayContaining(["Mohan Yadav", "BJP", "Madhya Pradesh", "political"])
    );
    expect(keywords.filter((k) => k.toLowerCase() === "bjp")).toHaveLength(1);
  });
});

describe("reportSyncService updateAvailable", () => {
  test("compareEngineVersions detects stale reports", () => {
    expect(compareEngineVersions("2", 3)).toBe(true);
    expect(compareEngineVersions(3, 3)).toBe(false);
    expect(compareEngineVersions("3", 2)).toBe(false);
  });

  test("isUpdateAvailable only for profile-linked types", () => {
    expect(
      isUpdateAvailable({ type: "political_profile", engineVersion: "1" }, 3)
    ).toBe(true);
    expect(
      isUpdateAvailable({ type: "comparison", engineVersion: "1" }, 3)
    ).toBe(false);
    expect(
      isUpdateAvailable(
        { type: "political_profile", engineVersion: String(PROFILE_BUILDER_VERSIONS.builderVersion) },
        PROFILE_BUILDER_VERSIONS.builderVersion
      )
    ).toBe(false);
  });

  test("attachUpdateAvailable stamps latestEngineVersion", () => {
    const attached = attachUpdateAvailable({
      _id: "507f1f77bcf86cd799439011",
      type: "election",
      engineVersion: "0",
      visibility: "private",
    });
    expect(attached.updateAvailable).toBe(true);
    expect(attached.latestEngineVersion).toBe(
      String(PROFILE_BUILDER_VERSIONS.builderVersion)
    );
    expect(attached.reportType).toBe("election");
  });
});
