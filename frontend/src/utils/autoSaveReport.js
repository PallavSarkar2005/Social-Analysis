import { upsertReport } from "../api/reportApi";
import { devError } from "./devLog";

/**
 * Quietly upsert a report into the Intelligence Hub.
 * Never throws to the UI — failures are logged only.
 *
 * @param {object} payload - SavedReport create/upsert fields
 * @returns {Promise<object|null>}
 */
export async function autoSaveReport(payload) {
  if (!payload?.title || !(payload.type || payload.reportType) || !payload.source) {
    return null;
  }
  if (payload.content === undefined || payload.content === null) {
    return null;
  }

  try {
    const res = await upsertReport(payload);
    if (res?.skipped || res?.success === false) {
      devError("[autoSaveReport] skipped:", res?.reason || res?.message || res);
      return null;
    }
    return res;
  } catch (err) {
    // Quota / network failures should not break analysis UX
    devError("[autoSaveReport]", err?.response?.data || err.message || err);
    return null;
  }
}

/**
 * Build a political profile hub payload (references + slim content).
 */
export function buildPoliticalProfileReportPayload({
  profile,
  account,
  biography = {},
  confidenceScore,
  aiSummary,
  sections = [],
  engineVersion = "",
  analysisVersion = "",
}) {
  const name = biography.fullName || account?.name || "Political Profile";
  const profileId = profile?._id || profile?.id || null;
  const accountId = account?._id || account?.id || null;
  const summaryText =
    typeof aiSummary === "string"
      ? aiSummary
      : aiSummary?.overview || aiSummary?.summary || biography.summary || "";

  return {
    title: name,
    type: "political_profile",
    source: `political_profile:${accountId || profileId || name}`,
    profileId,
    accountId,
    thumbnail:
      account?.thumbnails?.high?.url ||
      account?.thumbnails?.medium?.url ||
      account?.thumbnail ||
      "",
    summary: String(summaryText || "").slice(0, 2000),
    description: `${biography.party || account?.party || ""} · ${biography.state || account?.state || ""}`.trim(),
    confidence: confidenceScore ?? profile?.confidenceScore ?? null,
    category: "political",
    tags: [biography.party || account?.party, biography.state || account?.state]
      .filter(Boolean)
      .map(String),
    searchKeywords: [name, biography.party, biography.state, "political profile"]
      .filter(Boolean)
      .map(String),
    sourceModules: sections.length
      ? sections
      : ["political_profile", "elections", "influence", "news"],
    engineVersion: String(engineVersion || profile?.builderVersion || ""),
    analysisVersion: String(analysisVersion || profile?.profileSchemaVersion || ""),
    content: {
      kind: "political_profile",
      profileId,
      accountId,
      politicianName: name,
      party: biography.party || account?.party || null,
      state: biography.state || account?.state || null,
      position: biography.currentPosition || null,
      confidenceScore: confidenceScore ?? profile?.confidenceScore ?? null,
      sections,
    },
    metadata: {
      politicianName: name,
      party: biography.party || account?.party || null,
      state: biography.state || account?.state || null,
      avatar: account?.thumbnails?.high?.url || account?.thumbnail || null,
    },
  };
}

export function buildComparisonReportPayload({ creatorA, creatorB, comparison, aiReport }) {
  const nameA = creatorA?.name || "Creator A";
  const nameB = creatorB?.name || "Creator B";
  const idA = creatorA?.channelId || creatorA?.accountId || creatorA?._id || nameA;
  const idB = creatorB?.channelId || creatorB?.accountId || creatorB?._id || nameB;
  const [left, right] = [String(idA), String(idB)].sort();

  return {
    title: `${nameA} vs ${nameB}`,
    type: "comparison",
    source: `youtube_compare:${left}:${right}`,
    thumbnail: creatorA?.thumbnail || creatorA?.thumbnails?.high?.url || "",
    summary:
      typeof aiReport === "string"
        ? aiReport.slice(0, 2000)
        : String(aiReport?.summary || aiReport?.overview || `Comparison of ${nameA} and ${nameB}`).slice(
            0,
            2000
          ),
    category: "comparison",
    tags: [creatorA?.party, creatorB?.party].filter(Boolean),
    searchKeywords: [nameA, nameB, "comparison"],
    sourceModules: ["comparison"],
    content: {
      kind: "comparison",
      creatorA: {
        id: idA,
        name: nameA,
        subscribers: creatorA?.subscribers,
        party: creatorA?.party,
      },
      creatorB: {
        id: idB,
        name: nameB,
        subscribers: creatorB?.subscribers,
        party: creatorB?.party,
      },
      comparison: comparison || {},
      aiReport: typeof aiReport === "string" ? aiReport.slice(0, 4000) : aiReport,
    },
    metadata: {
      politicianName: `${nameA} vs ${nameB}`,
      winner: comparison?.overallWinner || null,
      thumbnail: creatorA?.thumbnail || null,
    },
  };
}

export function buildAiInsightReportPayload({
  sessionId,
  title,
  history = [],
  context = {},
}) {
  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const summary = String(lastAssistant?.content || "").slice(0, 2000);

  return {
    title: title || lastUser?.content?.slice(0, 80) || "AI Strategy",
    type: "ai_insight",
    source: `ai_session:${sessionId || "default"}`,
    summary,
    category: "ai",
    tags: ["ai", "strategy"],
    searchKeywords: ["ai", "strategy", title].filter(Boolean),
    sourceModules: ["ai"],
    content: {
      kind: "ai_insight",
      sessionId,
      messageCount: history.length,
      lastUserMessage: lastUser?.content || "",
      lastAssistantMessage: summary,
      context,
      // Keep a truncated transcript (avoid bloating Mongo)
      transcript: history.slice(-12).map((m) => ({
        role: m.role,
        content: String(m.content || "").slice(0, 1500),
      })),
    },
    metadata: {
      sessionId,
      messageCount: history.length,
    },
  };
}

export function buildModuleReportPayload({
  type,
  title,
  source,
  profileId,
  accountId,
  politicianName,
  summary,
  confidence,
  thumbnail,
  content,
  modules = [],
  tags = [],
}) {
  return {
    title,
    type,
    source,
    profileId: profileId || null,
    accountId: accountId || null,
    summary: String(summary || "").slice(0, 2000),
    confidence: confidence ?? null,
    thumbnail: thumbnail || "",
    category: type,
    tags,
    searchKeywords: [politicianName, type, ...tags].filter(Boolean),
    sourceModules: modules.length ? modules : [type],
    content,
    metadata: {
      politicianName: politicianName || null,
      avatar: thumbnail || null,
    },
  };
}
