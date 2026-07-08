import {
  buildIntelligenceTimeline,
  buildCareerTimelinePackage,
  mergeDuplicateTimelineEvents,
  normalizeTimelineEvent,
  refineStoredTimeline,
} from "../services/politicalTimelineService.js";

describe("Storytelling political timeline", () => {
  it("merges duplicate birth events into one", () => {
    const pools = mergeDuplicateTimelineEvents([
      { year: "1969", category: "birth", title: "Born", description: "Born in Jabalpur" },
      { year: "1969", category: "birth", title: "Date of Birth", description: "12 March 1969" },
    ]);
    expect(pools.birth).toBeTruthy();
    expect(pools.birth.title).toBe("Birth");
  });

  it("merges duplicate party events into one", () => {
    const pools = mergeDuplicateTimelineEvents([
      { year: "1990", category: "joinedParty", title: "Joined BJP", description: "Joined BJP" },
      { year: "1990", category: "joinedParty", title: "Affiliated with BJP", description: "Affiliated with BJP" },
    ]);
    expect(pools.party).toBeTruthy();
    expect(pools.party.title).toBe("Party Entry");
  });

  it("follows Birth → Education → Party → Elections → Current Position", () => {
    const timeline = buildIntelligenceTimeline({
      biography: {
        dob: "12 March 1969",
        education: "MBBS — Assam Medical College, 1992",
        dateJoinedParty: "1995",
        party: "BJP",
        currentOffice: "Chief Minister of Madhya Pradesh",
        constituency: "Budhni",
      },
      elections: [
        { year: 2003, election: "Assembly Election", constituency: "Budhni", party: "BJP", position: "Winner", margin: 12000, votePct: 52 },
        { year: 2018, election: "Assembly Election", constituency: "Budhni", party: "BJP", position: "Winner", margin: 18000, votePct: 58 },
        { year: 2023, election: "Assembly Election", constituency: "Budhni", party: "BJP", position: "Winner", margin: 22000, votePct: 61 },
      ],
      sources: [{ name: "Wikipedia", url: "https://en.wikipedia.org", confidence: 70 }],
    });

    expect(timeline[0].title).toBe("Birth");
    expect(timeline[1].title).toBe("Education");
    expect(timeline[2].title).toBe("Party Entry");

    const electionEvents = timeline.filter((e) => e.category === "election");
    expect(electionEvents).toHaveLength(3);
    expect(electionEvents[0].election.result).toBe("Won");
    expect(electionEvents[0].election.constituency).toBe("Budhni");
    expect(electionEvents[0].election.margin).toBe(12000);

    expect(timeline[timeline.length - 1].category).toBe("currentOffice");
  });

  it("shows every verified election with won/lost badge", () => {
    const timeline = buildIntelligenceTimeline({
      biography: { dob: "1970", currentOffice: "MLA" },
      elections: [
        { year: 2010, election: "Assembly", constituency: "A", party: "X", position: "Lost" },
        { year: 2015, election: "Assembly", constituency: "A", party: "X", position: "Winner" },
      ],
      sources: [],
    });

    const elections = timeline.filter((e) => e.category === "election");
    expect(elections).toHaveLength(2);
    expect(elections[0].election.result).toBe("Lost");
    expect(elections[1].election.result).toBe("Won");
  });

  it("omits education when unavailable", () => {
    const timeline = buildIntelligenceTimeline({
      biography: { dob: "1970", currentOffice: "Minister" },
      elections: [{ year: 2020, election: "Assembly", constituency: "X", party: "Y", position: "Winner" }],
      sources: [],
    });

    expect(timeline.some((e) => e.title === "Education")).toBe(false);
    expect(timeline[0].title).toBe("Birth");
  });

  it("places appointments chronologically among elections", () => {
    const timeline = buildIntelligenceTimeline({
      biography: {
        dob: "1960",
        currentOffice: "Chief Minister",
        previousPositions: ["2008: Minister of Finance", "2015: Chief Minister"],
      },
      elections: [
        { year: 2005, election: "Assembly", constituency: "A", party: "BJP", position: "Winner" },
        { year: 2010, election: "Assembly", constituency: "A", party: "BJP", position: "Winner" },
      ],
      sources: [],
    });

    const middle = timeline.filter((e) => !["birth", "college", "school", "joinedParty", "currentOffice"].includes(e.category));
    const middleYears = middle.map((e) => Number(e.year));
    expect(middleYears).toEqual([...middleYears].sort((a, b) => a - b));
    expect(timeline[timeline.length - 1].category).toBe("currentOffice");
  });

  it("refines stored timelines for legacy profiles", () => {
    const refined = refineStoredTimeline(
      [
        { year: "1969", category: "birth", title: "Born", description: "Born" },
        { year: "1969", category: "birth", title: "Birth", description: "1969" },
        { year: "1992", category: "college", title: "Education", description: "MBBS" },
        { year: "2023", category: "currentOffice", title: "Chief Minister", description: "CM" },
      ],
      { currentOffice: "Chief Minister" }
    );

    expect(refined.filter((e) => e.title === "Birth")).toHaveLength(1);
    expect(refined[refined.length - 1].category).toBe("currentOffice");
  });

  it("returns empty intelligence metadata for backward compatibility", () => {
    const { timeline, timelineIntelligence } = buildCareerTimelinePackage({
      biography: { dob: "1970", currentOffice: "MP" },
      elections: [],
    });
    expect(timeline.length).toBeGreaterThan(0);
    expect(timelineIntelligence).toEqual({});
  });

  it("normalizes birth events consistently", () => {
    const normalized = normalizeTimelineEvent({
      year: "1980",
      category: "birth",
      title: "Date of Birth",
      description: "1 Jan 1980",
    });
    expect(normalized.title).toBe("Birth");
  });
});
