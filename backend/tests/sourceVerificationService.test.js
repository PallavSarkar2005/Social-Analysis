import {
  urlMatchesIdentity,
  textMatchesIdentity,
  verifySource,
  filterVerifiedEvidenceSources,
} from "../services/sourceVerificationService.js";

describe("sourceVerificationService", () => {
  const identity = {
    name: "Mohan Yadav",
    state: "Madhya Pradesh",
    party: "BJP",
    constituency: "Ujjain South",
    office: "Chief Minister",
  };

  test("accepts Wikipedia URL for the same politician", () => {
    const result = urlMatchesIdentity(
      "https://en.wikipedia.org/wiki/Mohan_Yadav",
      identity
    );
    expect(result.matchedIdentity).toBe(true);
  });

  test("rejects Wikipedia URL for a different politician", () => {
    const result = urlMatchesIdentity(
      "https://en.wikipedia.org/wiki/Narendra_Modi",
      identity
    );
    expect(result.matchedIdentity).toBe(false);
    expect(result.reason).toBe("wikipedia_name_mismatch");
  });

  test("rejects generic Lok Sabha listing URL", () => {
    const result = urlMatchesIdentity("https://sansad.in/ls/member", identity);
    expect(result.matchedIdentity).toBe(false);
  });

  test("rejects wrong politician Lok Sabha page via content probe", async () => {
    const fetchImpl = async () => ({
      ok: true,
      statusCode: 200,
      finalUrl: "https://sansad.in/ls/member/someone-else",
      body: "<html><title>Member Profile — Other Person</title><body>Other Person MP from Delhi</body></html>",
    });

    const verified = await verifySource(
      {
        name: "Lok Sabha",
        url: "https://sansad.in/ls/member/12345",
        confidence: 80,
      },
      identity,
      { fetchImpl, allowNetwork: true }
    );

    expect(verified.matchedIdentity).toBe(false);
    expect(verified.verified).toBe(false);
    expect(verified.url).toBe("");
  });

  test("accepts matching Wikipedia after successful probe", async () => {
    const fetchImpl = async () => ({
      ok: true,
      statusCode: 200,
      finalUrl: "https://en.wikipedia.org/wiki/Mohan_Yadav",
      body: "<html><title>Mohan Yadav</title><body>Mohan Yadav is the Chief Minister of Madhya Pradesh</body></html>",
    });

    const verified = await verifySource(
      {
        name: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Mohan_Yadav",
        confidence: 90,
      },
      identity,
      { fetchImpl, allowNetwork: true }
    );

    expect(verified.verified).toBe(true);
    expect(verified.matchedIdentity).toBe(true);
    expect(verified.url).toContain("Mohan_Yadav");
    expect(verified.statusCode).toBe(200);
  });

  test("rejects unreachable URLs", async () => {
    const fetchImpl = async () => ({
      ok: false,
      statusCode: 404,
      finalUrl: "https://en.wikipedia.org/wiki/Mohan_Yadav",
      body: "Not Found",
    });

    const verified = await verifySource(
      {
        name: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Mohan_Yadav",
      },
      identity,
      { fetchImpl, allowNetwork: true }
    );

    expect(verified.verified).toBe(false);
    expect(verified.url).toBe("");
  });

  test("textMatchesIdentity requires politician name tokens", () => {
    expect(textMatchesIdentity("Mohan Yadav Chief Minister Madhya Pradesh", identity)).toBe(true);
    expect(textMatchesIdentity("Completely unrelated politician page", identity)).toBe(false);
  });

  test("filterVerifiedEvidenceSources keeps only verified identity matches", () => {
    const filtered = filterVerifiedEvidenceSources([
      { name: "Wikipedia", verified: true, matchedIdentity: true, confidence: 90 },
      { name: "Lok Sabha", verified: false, matchedIdentity: false, confidence: 80 },
      { name: "YouTube", verified: true, matchedIdentity: true, confidence: 50 },
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Wikipedia");
  });
});
