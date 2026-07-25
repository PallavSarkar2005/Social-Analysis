import { describe, it, expect } from "vitest";
import {
  collapseRepeatedWords,
  polishTimelineTitle,
  sanitizeTimelineEventForDisplay,
  dedupeTimelineEvents,
} from "../utils/timelineText";

describe("timelineText sanitizer", () => {
  it("collapses repeated words", () => {
    expect(collapseRepeatedWords("Won Won Won Re")).toBe("Won Re");
    expect(collapseRepeatedWords("Election Election")).toBe("Election");
  });

  it("repairs mangled election titles", () => {
    expect(polishTimelineTitle("Won Won Won Re")).toBe("Won Re-election");
    expect(polishTimelineTitle("Won Parliamentary")).toBe("Won Parliamentary Election");
    expect(polishTimelineTitle("Won India Lok Sabha Election")).toBe(
      "Won the Indian Lok Sabha Election"
    );
    expect(polishTimelineTitle("Re-elected MP")).toBe("Re-elected as Member of Parliament");
    expect(polishTimelineTitle("Re-elected MLA")).toBe("Re-elected as MLA");
  });

  it("repairs person-name titles when election context exists", () => {
    const withContext = sanitizeTimelineEventForDisplay({
      year: "2014",
      category: "election",
      title: "Yogi Adityanath",
      description: "Party: BJP",
      election: { year: "2014", type: "Yogi Adityanath", party: "BJP", result: "Won" },
    });
    expect(withContext).toBeTruthy();
    expect(withContext.title).not.toBe("Yogi Adityanath");
    expect(withContext.title).toMatch(/election|won/i);
  });

  it("deduplicates identical year+title events", () => {
    const out = dedupeTimelineEvents([
      { year: "2014", title: "Won Election", description: "" },
      { year: "2014", title: "Won Election", description: "Constituency: Gorakhpur" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].description).toMatch(/Gorakhpur/);
  });
});
