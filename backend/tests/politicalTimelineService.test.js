import {
  buildIntelligenceTimeline,
  buildCareerTimelinePackage,
  cleanBirthDescription,
  cleanTimelineDescription,
  cleanTimelineTitle,
  collapseSemanticDuplicates,
  formatReadableDate,
  mergeDuplicateTimelineEvents,
  normalizeTimelineEvent,
  polishTimelineEventsForDisplay,
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
    expect(pools.party.category).toBe("joinedParty");
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
    expect(timeline[2].title).toMatch(/^Joined BJP$/i);

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

  it("merges duplicate assembly election milestones from different providers", () => {
    const timeline = buildIntelligenceTimeline({
      biography: {
        dob: "1970",
        currentOffice: "Chief Minister of Madhya Pradesh",
        party: "BJP",
      },
      elections: [
        {
          year: 2013,
          election: "Madhya Pradesh Legislative Assembly",
          constituency: "Ujjain South",
          party: "BJP",
          position: "Winner",
          votes: 70000,
          votePct: 52,
          margin: 12000,
          opponent: "Opponent",
        },
      ],
      storedTimeline: [
        {
          year: "2013",
          category: "election",
          title: "Madhya Pradesh Legislative Assembly",
          description: "Elected",
          source: "Wikipedia",
        },
        {
          year: "2013",
          category: "position",
          title: "Madhya Pradesh Legislative Assembly — Elected MLA",
          description: "Constituency: Ujjain South · Party: BJP",
          source: "Lok Sabha",
        },
        {
          year: "2013",
          category: "election",
          title: "Madhya Pradesh Legislative Assembly",
          description: "Duplicate",
          source: "Election Commission",
        },
        {
          year: "2023",
          category: "position",
          title: "Chief Minister of Madhya Pradesh",
          description: "Assumed office",
        },
      ],
      sources: [],
    });

    const assembly2013 = timeline.filter(
      (e) => String(e.year) === "2013" && /assembly|mla|won/i.test(`${e.title} ${e.category}`)
    );
    expect(assembly2013.length).toBe(1);
    expect(assembly2013[0].title).toMatch(/Won.*Legislative Assembly/i);
    expect(assembly2013[0].description).toMatch(/Ujjain South/i);
    expect(assembly2013[0].verifiedBy?.length || 0).toBeGreaterThanOrEqual(1);
  });

  it("never repeats identical milestones for the same year", () => {
    const timeline = polishTimelineEventsForDisplay([
      { year: "2013", category: "election", title: "Madhya Pradesh Legislative Assembly", description: "" },
      {
        year: "2013",
        category: "election",
        title: "Madhya Pradesh Legislative Assembly — Elected MLA",
        description: "Constituency: Ujjain South",
      },
      { year: "2013", category: "election", title: "Madhya Pradesh Legislative Assembly", description: "Duplicate" },
    ]);
    expect(timeline).toHaveLength(1);
    expect(timeline[0].description).toMatch(/Ujjain South/i);
  });

  it("allows distinct milestones in the same year", () => {
    const timeline = buildIntelligenceTimeline({
      biography: { dob: "1970", currentOffice: "Cabinet Minister" },
      elections: [
        {
          year: 2023,
          election: "Madhya Pradesh Legislative Assembly",
          constituency: "Ujjain South",
          party: "BJP",
          position: "Winner",
          votes: 1,
          margin: 1,
          votePct: 1,
          opponent: "A",
        },
      ],
      storedTimeline: [
        {
          year: "2023",
          category: "position",
          title: "Appointed Cabinet Minister",
          description: "Health portfolio",
        },
      ],
      sources: [],
    });
    const y2023 = timeline.filter((e) => String(e.year) === "2023");
    expect(y2023.length).toBeGreaterThanOrEqual(2);
    expect(y2023.some((e) => /won|re-elected|assembly/i.test(e.title))).toBe(true);
    expect(y2023.some((e) => /cabinet minister/i.test(e.title))).toBe(true);
  });

  it("cleans mangled birth dates and keeps birth once", () => {
    expect(formatReadableDate("1965-03-25")).toBe("25 March 1965");
    expect(cleanBirthDescription("(-03-25) 25 March 1965 · (-03-25) 25 March 1965", { year: 1965 })).toBe(
      "25 March 1965"
    );
    expect(
      cleanBirthDescription("1965-03-25", {
        year: 1965,
        place: "Ujjain, Madhya Pradesh, India",
      })
    ).toBe("25 March 1965\nUjjain, Madhya Pradesh, India");

    const wikiDump = [
      "19 July 1974",
      "Rekha Jindal ( ) 19 July 1974 (age 51) Julana, Haryana , India",
      "Rekha Jindal ( 19 July 1974 ) 19 July 1974 (age 51) Julana, Haryana , India",
      "Rekha Jindal 19 July (age 51) Julana, Haryana , India",
    ].join("\n");
    expect(cleanBirthDescription(wikiDump, { year: 1974, name: "Rekha Jindal" })).toBe(
      "19 July 1974\nJulana, Haryana, India"
    );
    expect(polishTimelineEventsForDisplay([{ year: "1974", category: "birth", title: "Birth", description: wikiDump }])[0].description).toBe(
      "19 July 1974\nJulana, Haryana, India"
    );

    const timeline = buildIntelligenceTimeline({
      biography: {
        dob: "1965-03-25",
        birthPlace: "Ujjain, Madhya Pradesh, India",
        currentOffice: "MLA",
      },
      facts: [
        { type: "Birth", year: "1965", value: "1965-03-25", description: "(-03-25) 25 March 1965" },
        { type: "Birth", year: "1965", value: "25 March 1965" },
      ],
      elections: [],
      sources: [],
    });
    const births = timeline.filter((e) => e.category === "birth" || e.title === "Birth");
    expect(births).toHaveLength(1);
    expect(births[0].description).toMatch(/25 March 1965/);
    expect(births[0].description).toMatch(/Ujjain/);
    expect(births[0].description).not.toMatch(/-03-25/);
    expect(births[0].description.match(/25 March 1965/g) || []).toHaveLength(1);
  });

  it("collapses multi-source duplicates while remaining chronological", () => {
    const collapsed = collapseSemanticDuplicates([
      { year: "2018", category: "election", title: "Assembly Election", description: "A", source: "Wikipedia" },
      {
        year: "2018",
        category: "election",
        title: "Won Assembly Election",
        description: "Constituency: Ujjain South · Party: BJP",
        source: "ECI",
      },
      { year: "1965", category: "birth", title: "Birth", description: "25 March 1965" },
      { year: "2023", category: "position", title: "Became Chief Minister", description: "" },
    ]);
    expect(collapsed.filter((e) => String(e.year) === "2018")).toHaveLength(1);
    const years = collapsed.map((e) => Number(e.year));
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });

  it("labels subsequent assembly wins as Re-elected MLA", () => {
    const timeline = buildIntelligenceTimeline({
      biography: { dob: "1970", currentOffice: "MLA" },
      elections: [
        {
          year: 2013,
          election: "Madhya Pradesh Legislative Assembly",
          constituency: "Ujjain South",
          party: "BJP",
          position: "Winner",
          votes: 1,
          margin: 1,
          votePct: 1,
          opponent: "A",
        },
        {
          year: 2018,
          election: "Madhya Pradesh Legislative Assembly",
          constituency: "Ujjain South",
          party: "BJP",
          position: "Winner",
          votes: 1,
          margin: 1,
          votePct: 1,
          opponent: "B",
        },
        {
          year: 2023,
          election: "Madhya Pradesh Legislative Assembly",
          constituency: "Ujjain South",
          party: "BJP",
          position: "Winner",
          votes: 1,
          margin: 1,
          votePct: 1,
          opponent: "C",
        },
      ],
      sources: [],
    });

    const elections = timeline.filter((e) => e.category === "election");
    expect(elections).toHaveLength(3);
    expect(elections[0].title).toMatch(/^Won /);
    expect(elections[1].title).toBe("Re-elected MLA");
    expect(elections[2].title).toBe("Re-elected MLA");
  });

  it("strips repeated years and redundant description text for display", () => {
    expect(cleanTimelineTitle("Joined BJP in 2001", 2001)).toBe("Joined BJP");
    expect(cleanTimelineDescription("Joined BJP in 2001", { title: "Joined BJP", year: 2001 })).toBe("");
    expect(
      cleanTimelineDescription("Constituency: Ujjain · Party: BJP", {
        title: "Won MLA election",
        year: 2014,
      })
    ).toBe("Constituency: Ujjain · Party: BJP");

    const polished = polishTimelineEventsForDisplay([
      {
        year: 1969,
        category: "birth",
        title: "Birth",
        description: "Born on 12 March 1969",
        date: "1969",
      },
      {
        year: 2001,
        category: "joinedParty",
        title: "Joined BJP in 2001",
        description: "Joined BJP in 2001",
        source: "Wikipedia",
      },
      {
        year: 2014,
        category: "election",
        title: "Won MLA Election",
        description: "Constituency: Ujjain",
        source: "ECI",
      },
    ]);
    const party = polished.find((e) => e.category === "joinedParty");
    const election = polished.find((e) => e.category === "election");
    const birth = polished.find((e) => e.category === "birth");
    expect(party.title).toBe("Joined BJP");
    expect(party.description).toBe("");
    expect(election.description).toBe("Constituency: Ujjain");
    expect(birth.description).toMatch(/12\s*March\s*1969/i);
    expect(birth.date).toBeNull();
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
