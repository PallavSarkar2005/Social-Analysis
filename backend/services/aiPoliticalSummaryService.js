import OpenAI from "openai";

const getAiClient = () => {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (process.env.GROQ_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      }),
      model: "llama-3.3-70b-versatile",
    };
  }
  return {
    client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    model: "gpt-4o-mini",
  };
};

const SECTION_KEYS = [
  "politicalJourney",
  "majorAchievements",
  "electionPerformance",
  "currentRole",
  "publicProfile",
];

const buildFactsContext = ({ verifiedFacts = [], elections = [], politicalStatistics = [] }) => {
  const lines = ["VERIFIED FACTS (use ONLY these — do not invent):"];
  for (const fact of verifiedFacts) {
    const altNote =
      fact.conflict && fact.alternatives?.length
        ? ` [conflict: alternatives=${fact.alternatives.map((a) => a.value).join("; ")}]`
        : "";
    lines.push(
      `- ${fact.label}: ${fact.value} (confidence: ${fact.confidence}%, sources: ${(fact.verifiedBy || []).join(", ")})${altNote}`
    );
  }
  if (elections.length > 0) {
    lines.push("\nELECTION RECORDS:");
    for (const e of elections.slice(0, 8)) {
      lines.push(
        `- ${e.year} ${e.election}: ${e.constituency}, ${e.party}, ${e.position || "contested"}`
      );
    }
  }
  if (politicalStatistics.length > 0) {
    lines.push("\nPOLITICAL STATISTICS:");
    for (const stat of politicalStatistics) {
      lines.push(`- ${stat.label}: ${stat.value}`);
    }
  }
  return lines.join("\n");
};

const buildFallbackSummary = ({ verifiedFacts = [], elections = [], politicalStatistics = [] }) => {
  const party = verifiedFacts.find((f) => f.key === "party")?.value;
  const office = verifiedFacts.find((f) => f.key === "currentOffice")?.value;
  const constituency = verifiedFacts.find((f) => f.key === "constituency")?.value;

  const summary = {};
  const journey = [];
  if (party) journey.push(`Affiliated with ${party}.`);
  if (office) journey.push(`Currently holds ${office}.`);
  if (constituency) journey.push(`Represents ${constituency}.`);
  summary.politicalJourney =
    journey.length > 0 ? journey.join(" ") : "Insufficient verified data for political journey summary.";

  summary.majorAchievements = office
    ? `Serving as ${office}${constituency ? ` for ${constituency}` : ""}.`
    : "No verified achievement records available.";

  if (elections.length > 0) {
    const wins = elections.filter((e) => /winner|won/i.test(e.position || "")).length;
    summary.electionPerformance = `Contested ${elections.length} recorded election(s) with ${wins} documented win(s).`;
  } else {
    summary.electionPerformance = "No verified election records available.";
  }

  summary.currentRole = office || "Current role not documented in verified sources.";
  summary.publicProfile =
    politicalStatistics.find((s) => s.key === "yearsInPolitics")?.value
      ? `Political career spanning ${politicalStatistics.find((s) => s.key === "yearsInPolitics").value} years per verified records.`
      : "Public profile details limited to verified public records.";

  return summary;
};

/**
 * Generate structured AI political summary using only verified facts.
 */
export const generateAiPoliticalSummary = async ({
  verifiedFacts = [],
  elections = [],
  politicalStatistics = [],
}) => {
  const fallback = buildFallbackSummary({ verifiedFacts, elections, politicalStatistics });
  const aiConfig = getAiClient();
  if (!aiConfig || verifiedFacts.length === 0) {
    return { summary: fallback, insights: Object.values(fallback).filter(Boolean) };
  }

  const context = buildFactsContext({ verifiedFacts, elections, politicalStatistics });

  const prompt = `You are a political intelligence analyst. Generate a factual summary using ONLY the verified facts below.
NEVER hallucinate or invent information. If data is missing, state that clearly.
Respond with ONLY a JSON object with these keys (each value is 1-2 sentences):
${SECTION_KEYS.map((k) => `"${k}"`).join(", ")}

${context}`;

  try {
    const { client, model } = aiConfig;
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content.trim());
    const summary = {};
    for (const key of SECTION_KEYS) {
      summary[key] = parsed[key] || fallback[key] || "";
    }
    return { summary, insights: Object.values(summary).filter(Boolean) };
  } catch (error) {
    console.error("[AI SUMMARY]", error.message);
    return { summary: fallback, insights: Object.values(fallback).filter(Boolean) };
  }
};
