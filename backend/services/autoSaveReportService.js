import { upsertReport, buildIdentityQuery } from "./reportService.js";
import SavedReport from "../models/SavedReport.js";
import { checkAndIncrementReportLimit } from "../middleware/billingMiddleware.js";
import PROFILE_BUILDER_VERSIONS from "../config/profileBuilderVersion.js";

function politicalKeywords(account, profile) {
  const name = profile?.biography?.fullName || account?.name || "";
  const party = profile?.biography?.party || account?.party || "";
  const state = profile?.biography?.state || account?.state || "";
  return [name, party, state, "political profile", "intelligence"]
    .filter(Boolean)
    .map(String);
}

/**
 * Server-side auto-save helpers for analysis modules.
 * Failures are swallowed so they never break the primary analysis path.
 */

async function upsertWithQuota(userId, payload, { skipQuota = false } = {}) {
  const identity = buildIdentityQuery(userId, payload);
  let existing = identity ? await SavedReport.findOne(identity).select("_id") : null;
  if (
    !existing &&
    payload.type === "political_profile" &&
    payload.accountId
  ) {
    existing = await SavedReport.findOne({
      userId,
      type: "political_profile",
      $or: [
        { accountId: payload.accountId },
        { source: `political_profile:${payload.accountId}` },
      ],
      status: { $ne: "archived" },
    }).select("_id");
  }
  if (!existing && !skipQuota) {
    const limitError = await checkAndIncrementReportLimit(userId);
    if (limitError) {
      console.warn("[autoSaveReport] skipped create — plan limit:", limitError.message);
      return null;
    }
  }
  return upsertReport(userId, payload);
}

function buildPoliticalHubPayload(account, profile, options = {}) {
  const name = profile.biography?.fullName || account.name || "Political Profile";
  const profileId = profile._id;
  const accountId = account._id;
  const confidence = profile.confidenceScore ?? null;
  const summary =
    profile.aiSummary?.overview ||
    profile.aiSummary?.summary ||
    profile.biography?.summary ||
    "";
  const sectionsBuilt =
    Array.isArray(options.sectionsBuilt) && options.sectionsBuilt.length
      ? options.sectionsBuilt
      : ["political_profile"];

  return {
    title: name,
    type: "political_profile",
    source: `political_profile:${accountId}`,
    profileId,
    accountId,
    thumbnail: account.thumbnails?.high?.url || account.thumbnail || "",
    summary: String(summary).slice(0, 2000),
    description: `${profile.biography?.party || account.party || ""} · ${
      profile.biography?.state || account.state || ""
    }`.trim(),
    confidence,
    category: "political",
    tags: [
      profile.biography?.party || account.party,
      profile.biography?.state || account.state,
    ].filter(Boolean),
    searchKeywords: politicalKeywords(account, profile),
    sourceModules: sectionsBuilt,
    engineVersion: String(
      profile.builderVersion ||
        options.engineVersion ||
        PROFILE_BUILDER_VERSIONS.builderVersion
    ),
    analysisVersion: String(
      profile.profileSchemaVersion || PROFILE_BUILDER_VERSIONS.profileSchemaVersion
    ),
    content: {
      kind: "political_profile",
      profileId,
      accountId,
      politicianName: name,
      party: profile.biography?.party || account.party || null,
      state: profile.biography?.state || account.state || null,
      position: profile.biography?.currentPosition || null,
      confidenceScore: confidence,
      sections: sectionsBuilt,
    },
    metadata: {
      politicianName: name,
      party: profile.biography?.party || account.party || null,
      state: profile.biography?.state || account.state || null,
      currentPosition:
        profile.biography?.currentPosition ||
        profile.biography?.currentOffice ||
        null,
      avatar: account.thumbnails?.high?.url || account.thumbnail || null,
      syncStatus: profile.syncStatus || null,
    },
  };
}

export async function autoSavePoliticalProfileReport(account, profile, options = {}) {
  if (!account?.userId || !profile) return null;

  const payload = buildPoliticalHubPayload(account, profile, options);

  try {
    return await upsertWithQuota(account.userId, payload, {
      skipQuota: Boolean(options.skipQuota),
    });
  } catch (err) {
    // Legacy null shareToken unique-index collision — repair and retry once
    if (/E11000.*shareToken/i.test(err.message)) {
      try {
        const { repairShareTokenNulls } = await import("./hubIndexRepair.js");
        await repairShareTokenNulls();
        return await upsertWithQuota(account.userId, payload, { skipQuota: true });
      } catch (retryErr) {
        console.warn("[autoSaveReport] political_profile retry failed:", retryErr.message);
        return null;
      }
    }
    console.warn("[autoSaveReport] political_profile failed:", err.message);
    return null;
  }
}

export async function autoSaveComparisonReport(userId, { creatorA, creatorB, comparison, aiReport }) {
  if (!userId || !creatorA || !creatorB) return null;

  const nameA = creatorA.name || "Creator A";
  const nameB = creatorB.name || "Creator B";
  const idA = creatorA.channelId || creatorA.accountId || creatorA._id || nameA;
  const idB = creatorB.channelId || creatorB.accountId || creatorB._id || nameB;
  const [left, right] = [String(idA), String(idB)].sort();

  try {
    return await upsertWithQuota(userId, {
      title: `${nameA} vs ${nameB}`,
      type: "comparison",
      source: `youtube_compare:${left}:${right}`,
      thumbnail: creatorA.thumbnail || "",
      summary:
        typeof aiReport === "string"
          ? aiReport.slice(0, 2000)
          : String(aiReport?.summary || `Comparison of ${nameA} and ${nameB}`).slice(0, 2000),
      category: "comparison",
      tags: [creatorA.party, creatorB.party].filter(Boolean),
      searchKeywords: [nameA, nameB, "comparison"],
      sourceModules: ["comparison"],
      content: {
        kind: "comparison",
        creatorA: {
          id: idA,
          name: nameA,
          subscribers: creatorA.subscribers,
          party: creatorA.party,
        },
        creatorB: {
          id: idB,
          name: nameB,
          subscribers: creatorB.subscribers,
          party: creatorB.party,
        },
        comparison: comparison || {},
        aiReport: typeof aiReport === "string" ? aiReport.slice(0, 4000) : aiReport,
      },
      metadata: {
        politicianName: `${nameA} vs ${nameB}`,
        winner: comparison?.overallWinner || null,
      },
    });
  } catch (err) {
    console.warn("[autoSaveReport] comparison failed:", err.message);
    return null;
  }
}
