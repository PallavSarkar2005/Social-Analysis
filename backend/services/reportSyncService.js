import SavedReport from "../models/SavedReport.js";
import PoliticalProfile from "../models/PoliticalProfile.js";
import Account from "../models/Account.js";
import PROFILE_BUILDER_VERSIONS from "../config/profileBuilderVersion.js";
import {
  writeAuditLog,
  getOwnedReport,
  serializeReportOwner,
  upsertReport,
} from "./reportService.js";
import { autoSavePoliticalProfileReport } from "./autoSaveReportService.js";

const PROFILE_LINKED_TYPES = new Set([
  "political_profile",
  "election",
  "influence",
  "news_sentiment",
  "timeline",
  "analysis",
]);

/**
 * Build searchable keywords from politician identity + tags.
 */
export function buildSearchKeywords({
  name,
  party,
  state,
  tags = [],
  extras = [],
} = {}) {
  const parts = [
    name,
    party,
    state,
    ...tags,
    ...extras,
    name && party ? `${name} ${party}` : null,
    name && state ? `${name} ${state}` : null,
  ];
  const seen = new Set();
  const out = [];
  for (const raw of parts) {
    if (raw == null) continue;
    const value = String(raw).trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export function compareEngineVersions(reportEngine, latestEngine) {
  const a = Number(reportEngine);
  const b = Number(latestEngine);
  if (Number.isNaN(a) || Number.isNaN(b)) {
    return String(reportEngine || "") !== String(latestEngine || "");
  }
  return a < b;
}

/**
 * True when a newer profile/analysis engine exists than the report stamp.
 */
export function isUpdateAvailable(report, latestEngine = PROFILE_BUILDER_VERSIONS.builderVersion) {
  if (!report) return false;
  if (!PROFILE_LINKED_TYPES.has(report.type)) return false;
  return compareEngineVersions(report.engineVersion, latestEngine);
}

export function attachUpdateAvailable(report) {
  if (!report) return null;
  const latest = PROFILE_BUILDER_VERSIONS.builderVersion;
  const obj =
    typeof report.toObject === "function"
      ? report.toObject({ virtuals: true })
      : { ...report };
  obj.reportType = obj.type;
  obj.id = obj._id;
  obj.latestEngineVersion = String(latest);
  obj.updateAvailable = isUpdateAvailable(obj, latest);
  obj.isShared =
    Boolean(obj.shareToken) && obj.visibility !== "private" && !obj.shareRevokedAt;
  return obj;
}

function titleForType(type, name) {
  // Hub titles are politician name only — type is shown via badge / documentType.
  switch (type) {
    case "political_profile":
    case "election":
    case "influence":
    case "news_sentiment":
    case "timeline":
      return name;
    default:
      return null;
  }
}

/**
 * Refresh metadata on all reports linked to a profile/account after rebuild.
 * Does NOT create new reports or duplicate content — in-place update only.
 */
export async function syncAssociatedReportsMetadata(account, profile, options = {}) {
  if (!account?.userId || !profile?._id) {
    return { updated: 0 };
  }

  const name = profile.biography?.fullName || account.name || "Political Profile";
  const party = profile.biography?.party || account.party || "";
  const state = profile.biography?.state || account.state || "";
  const thumbnail =
    account.thumbnails?.high?.url ||
    account.thumbnails?.medium?.url ||
    account.thumbnail ||
    "";
  const confidence =
    profile.confidenceScore != null ? profile.confidenceScore : null;
  const summaryFromDossier = Array.isArray(options.dossierSummary)
    ? options.dossierSummary.join(" ")
    : "";
  const summary = String(
    summaryFromDossier ||
      profile.aiSummary?.overview ||
      profile.aiSummary?.summary ||
      profile.biography?.summary ||
      ""
  ).slice(0, 2000);

  const engineVersion = String(
    profile.builderVersion ?? PROFILE_BUILDER_VERSIONS.builderVersion
  );
  const analysisVersion = String(
    profile.profileSchemaVersion ?? PROFILE_BUILDER_VERSIONS.profileSchemaVersion
  );

  const keywords = buildSearchKeywords({
    name,
    party,
    state,
    tags: [party, state].filter(Boolean),
    extras: options.extraKeywords || ["political", "profile"],
  });

  const filter = {
    userId: account.userId,
    $or: [{ profileId: profile._id }, { accountId: account._id }],
  };

  const reports = await SavedReport.find(filter);
  let updated = 0;

  for (const report of reports) {
    const nextTitle = titleForType(report.type, name);
    const mergedKeywords = buildSearchKeywords({
      name,
      party,
      state,
      tags: [...(report.tags || []), ...(report.searchKeywords || [])],
      extras: keywords,
    });

    const prevEngine = report.engineVersion;
    report.thumbnail = thumbnail || report.thumbnail;
    if (confidence != null) report.confidence = confidence;
    if (summary && (report.type === "political_profile" || !report.summary)) {
      report.summary = summary;
    }
    if (nextTitle) report.title = nextTitle;
    report.engineVersion = engineVersion;
    report.analysisVersion = analysisVersion;
    report.searchKeywords = mergedKeywords;
    report.metadata = {
      ...(report.metadata && typeof report.metadata === "object" ? report.metadata : {}),
      politicianName: name,
      party: party || null,
      state: state || null,
      avatar: thumbnail || null,
      lastSyncedFromProfileAt: new Date().toISOString(),
    };
    if (report.profileId == null) report.profileId = profile._id;
    if (report.accountId == null) report.accountId = account._id;
    report.version = (report.version || 1) + 1;

    // Refresh slim content identity fields without cloning full profile dumps
    if (report.content && typeof report.content === "object") {
      report.content = {
        ...report.content,
        profileId: profile._id,
        accountId: account._id,
        politicianName: name,
        party: party || null,
        state: state || null,
        confidenceScore: confidence,
      };
      report.markModified("content");
    }

    await report.save();

    // Rebuild dossier so legacy reports pick up cleaned timeline / evidence / elections
    try {
      const { ensureReportDossier } = await import("./reportDossierService.js");
      await ensureReportDossier(report, { force: true, allowNetwork: false });
    } catch (err) {
      console.warn("[reports] sync dossier rebuild failed:", err.message);
    }

    await writeAuditLog({
      userId: account.userId,
      reportId: report._id,
      action: "updated",
      metadata: {
        sync: "profile_rebuild",
        previousEngineVersion: prevEngine,
        engineVersion,
      },
    });
    updated += 1;
  }

  return { updated };
}

/**
 * One-click regeneration: rebuild profile then refresh associated reports.
 */
export async function regenerateReportFromSource(reportId, userId) {
  const report = await getOwnedReport(reportId, userId);
  if (!report) return { error: "not_found" };

  if (!PROFILE_LINKED_TYPES.has(report.type)) {
    return { error: "unsupported_type" };
  }

  let account = null;
  if (report.accountId) {
    account = await Account.findOne({ _id: report.accountId, userId });
  }
  if (!account && report.profileId) {
    const profile = await PoliticalProfile.findById(report.profileId);
    if (profile?.accountId) {
      account = await Account.findOne({ _id: profile.accountId, userId });
    }
  }
  if (!account) {
    return { error: "no_source" };
  }

  // Dynamic import avoids circular dependency with profileBuilderService
  const { buildProfile } = await import("./profileBuilderService.js");
  const buildResult = await buildProfile(account._id, {
    logPrefix: "[REPORT REGENERATE]",
    trigger: "report_regenerate",
  });

  const profile = buildResult?.profile;
  if (profile) {
    await autoSavePoliticalProfileReport(account, profile, {
      sectionsBuilt: buildResult.sectionsBuilt || [],
      skipQuota: true,
    });
    await syncAssociatedReportsMetadata(account, profile, {
      extraKeywords: buildResult.sectionsBuilt || [],
    });
  }

  const refreshed = await SavedReport.findOne({ _id: reportId, userId });
  if (refreshed) {
    try {
      const { ensureReportDossier } = await import("./reportDossierService.js");
      await ensureReportDossier(refreshed, { force: true });
    } catch (err) {
      console.warn("[reports] regenerate dossier rebuild failed:", err.message);
    }
  }

  await writeAuditLog({
    userId,
    reportId,
    action: "regenerated",
    metadata: {
      buildSuccess: Boolean(buildResult?.success),
      sectionsBuilt: buildResult?.sectionsBuilt || [],
    },
  });

  return {
    report: refreshed,
    build: {
      success: Boolean(buildResult?.success),
      action: buildResult?.action,
      sectionsBuilt: buildResult?.sectionsBuilt || [],
    },
  };
}

/**
 * Helper used by auto-save to keep keywords consistent.
 */
export function keywordsForPoliticalIdentity(account, profile) {
  const name = profile?.biography?.fullName || account?.name || "";
  const party = profile?.biography?.party || account?.party || "";
  const state = profile?.biography?.state || account?.state || "";
  return buildSearchKeywords({
    name,
    party,
    state,
    tags: [party, state].filter(Boolean),
    extras: ["political profile", "intelligence"],
  });
}

export { serializeReportOwner, upsertReport, PROFILE_LINKED_TYPES };
