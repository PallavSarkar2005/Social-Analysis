import {
  validateProfileIdentity,
} from "../services/profileIdentityValidationService.js";
import {
  resolveEnrichmentIdentity,
  resolveAccountParty,
} from "../providers/shared/politicalIdentityUtils.js";
import { classifyWikipediaLink } from "../providers/shared/wikipediaValidation.js";

describe("profile identity validation", () => {
  it("flags wrong state and schedules repair metadata", () => {
    const account = {
      _id: "acc1",
      name: "Dr Example Leader",
      state: "Assam",
      party: "Independent",
      group: "BJP",
      description: "Official Channel of Madhya Pradesh Chief Minister Example Leader.",
      recentVideos: [],
    };
    const profile = {
      accountId: "acc1",
      biography: {
        fullName: "Dr Example Leader",
        state: "Assam",
        wikipediaLink: "https://en.wikipedia.org/wiki/2014_Indian_general_election",
      },
      elections: [],
      electionIntelligence: [],
      sources: [{ name: "Wikipedia", confidence: 30 }],
      confidenceScore: 20,
      profileEngineVersion: 1,
    };

    const result = validateProfileIdentity(account, profile);
    expect(result.identity.state).toBe("Madhya Pradesh");
    expect(result.accountRepairs.state).toBe("Madhya Pradesh");
    expect(result.accountRepairs.party).toBe("BJP");
    expect(result.issues.some((i) => i.code === "wikipedia_election_page")).toBe(true);
    expect(result.needsRebuild).toBe(true);
    expect(result.engineOutdated).toBe(true);
  });

  it("detects missing elections on valid person wikipedia page", () => {
    const account = {
      _id: "acc2",
      name: "Mohan Yadav",
      state: "Madhya Pradesh",
      party: "BJP",
      description: "",
      recentVideos: [],
    };
    const profile = {
      accountId: "acc2",
      biography: {
        fullName: "Mohan Yadav",
        wikipediaLink: "https://en.wikipedia.org/wiki/Mohan_Yadav",
      },
      elections: [],
      profileEngineVersion: 2,
    };

    const result = validateProfileIdentity(account, profile);
    expect(classifyWikipediaLink(profile.biography.wikipediaLink, "Mohan Yadav")).toBe("person");
    expect(result.issues.some((i) => i.code === "missing_elections")).toBe(true);
    expect(result.needsRebuild).toBe(true);
  });

  it("resolveEnrichmentIdentity never uses hardcoded politician names", () => {
    const identity = resolveEnrichmentIdentity({
      _id: "x",
      name: "Random Creator",
      state: "Kerala",
      party: "Independent",
      group: "Other",
      description: "Cooking channel based in Kerala.",
      recentVideos: [],
    });
    expect(identity.state).toBe("Kerala");
    expect(identity.stateCorrected).toBe(false);
    expect(resolveAccountParty({ party: "Independent", group: "Other" }).corrected).toBe(false);
  });
});
