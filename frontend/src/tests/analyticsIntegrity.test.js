/**
 * Frontend guard: authenticated analytics must never hardcode sentiment pie values.
 */
import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const profilePath = join(__dirname, "../pages/PoliticalProfile.jsx");

describe("PoliticalProfile analytics integrity", () => {
  const source = readFileSync(profilePath, "utf8");

  test("does not hardcode 33/34/33 sentiment fallback", () => {
    expect(source).not.toMatch(/value:\s*33/);
    expect(source).not.toMatch(/value:\s*34/);
  });

  test("analyzer invalidates analytics query keys after analyze", () => {
    const hooks = readFileSync(
      join(__dirname, "../hooks/useQueries.js"),
      "utf8"
    );
    expect(hooks).toMatch(/queryKey:\s*\[\s*["']analytics["']/);
    // Analyzer onSuccess must invalidate analytics
    const analyzerBlock = hooks.slice(
      hooks.indexOf("useAnalyzer"),
      hooks.indexOf("useSnapshots")
    );
    expect(analyzerBlock).toMatch(/invalidateQueries\(\s*\{\s*queryKey:\s*\[["']analytics["']\]/);
  });

  test("uses InsufficientData for missing verified sentiment", () => {
    expect(source).toMatch(/hasVerifiedSentiment/);
    expect(source).toMatch(/InsufficientData/);
  });

  test("charts consume AnalyticsChart / engine availability", () => {
    expect(source).toMatch(/AnalyticsChart/);
    expect(source).toMatch(/chartAvailability/);
  });
});
