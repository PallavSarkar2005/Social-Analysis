import {
  generateMarkdown,
  generateJSON,
} from "../services/exportService.js";
import {
  getSharedReportByToken,
  normalizeReportType,
} from "../services/reportService.js";

describe("exportService markdown + json", () => {
  const sample = {
    _id: "507f1f77bcf86cd799439011",
    title: "Leader — Political Profile",
    type: "political_profile",
    source: "political_profile:acc",
    summary: "Strong digital presence",
    confidence: 82,
    tags: ["BJP"],
    content: { kind: "political_profile", accountId: "acc" },
    metadata: { politicianName: "Leader" },
    createdAt: new Date("2026-01-01"),
  };

  test("generateMarkdown includes title and content fence", () => {
    const md = generateMarkdown(sample);
    expect(md).toContain("# Leader — Political Profile");
    expect(md).toContain("## Summary");
    expect(md).toContain("```json");
    expect(md).toContain("political_profile");
  });

  test("generateJSON is valid and includes core fields", () => {
    const parsed = JSON.parse(generateJSON(sample));
    expect(parsed.title).toBe(sample.title);
    expect(parsed.type).toBe("political_profile");
    expect(parsed.content.kind).toBe("political_profile");
  });
});

describe("share token access control", () => {
  test("rejects short tokens", async () => {
    const result = await getSharedReportByToken("abc");
    expect(result.error).toBe("invalid");
  });

  test("normalizeReportType still accepts hub types used in exports", () => {
    expect(normalizeReportType("political_profile")).toBe("political_profile");
    expect(normalizeReportType("ai_insight")).toBe("ai_insight");
  });
});
