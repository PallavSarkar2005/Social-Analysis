import {
  inferStateFromText,
  resolveEnrichmentIdentity,
  resolveAccountState,
  stripHonorifics,
} from "../providers/shared/politicalIdentityUtils.js";
import { fetchWikipediaProfile } from "../providers/wikipediaScraperProvider.js";

describe("political identity utils", () => {
  it("stripHonorifics removes Dr prefix", () => {
    expect(stripHonorifics("Dr Mohan Yadav")).toBe("Mohan Yadav");
  });

  it("inferStateFromText reads Madhya Pradesh from channel description", () => {
    const text =
      "Official Channel of Madhya Pradesh's Chief Minister Dr Mohan Yadav.";
    expect(inferStateFromText(text)).toBe("Madhya Pradesh");
  });

  it("resolveEnrichmentIdentity corrects wrong account state from description", () => {
    const identity = resolveEnrichmentIdentity({
      _id: "abc",
      name: "Dr Mohan Yadav",
      state: "Assam",
      party: "BJP",
      description:
        "Official Channel of Madhya Pradesh's Chief Minister Dr Mohan Yadav.",
      recentVideos: [],
    });

    expect(identity.state).toBe("Madhya Pradesh");
    expect(identity.searchName).toBe("Mohan Yadav");
    expect(identity.stateCorrected).toBe(true);
  });

  it("resolveAccountState prefers description over manual selection", () => {
    const state = resolveAccountState({
      description:
        "Official Channel of Madhya Pradesh's Chief Minister Dr Mohan Yadav.",
      selectedState: "Assam",
      recentVideos: [],
    });
    expect(state).toBe("Madhya Pradesh");
  });
});

describe("Wikipedia election extraction", () => {
  it("returns election records for Mohan Yadav", async () => {
    const result = await fetchWikipediaProfile({
      name: "Dr Mohan Yadav",
      searchName: "Mohan Yadav",
      state: "Madhya Pradesh",
      party: "BJP",
    });

    expect(result.success).toBe(true);
    expect(result.source.url).toMatch(/Mohan_Yadav/i);
    expect(result.data.elections.length).toBeGreaterThanOrEqual(3);
    expect(
      result.data.elections.some(
        (row) => row.year === 2013 && /Ujjain/i.test(row.constituency || "")
      )
    ).toBe(true);
  }, 30000);
});
