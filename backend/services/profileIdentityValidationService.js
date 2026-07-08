import Account from "../models/Account.js";
import PoliticalProfile from "../models/PoliticalProfile.js";
import PROFILE_BUILDER_VERSIONS, {
  getStoredVersion,
  needsEngineMigration,
} from "../config/profileBuilderVersion.js";
import {
  resolveEnrichmentIdentity,
  resolveAccountParty,
  isGenericParty,
  normalizePartyToken,
} from "../providers/shared/politicalIdentityUtils.js";
import {
  classifyWikipediaLink,
  isWikipediaPersonUrl,
} from "../providers/shared/wikipediaValidation.js";
import { namesMatch } from "../providers/shared/scrapeUtils.js";
import { computeConfidenceBreakdown } from "./confidenceEngine.js";
import { scheduleProfileSync } from "./profileBuilderService.js";

const REBUILD_ISSUE_CODES = new Set([
  "identity_name_mismatch",
  "state_mismatch",
  "party_mismatch",
  "wikipedia_election_page",
  "wikipedia_suspect",
  "missing_elections",
  "election_source_missing",
]);

const countElections = (profile = {}) =>
  profile?.electionIntelligence?.length || profile?.elections?.length || 0;

const primaryElectionSource = (profile = {}) => {
  const rows = profile?.electionIntelligence?.length
    ? profile.electionIntelligence
    : profile?.elections || [];
  const sources = [...new Set(rows.map((row) => row?.source).filter(Boolean))];
  if (sources.length > 0) return sources.join(", ");
  const wikiSource = (profile?.sources || []).find((s) => /wikipedia/i.test(s.name || ""));
  if (wikiSource) return wikiSource.name;
  const affidavitSource = (profile?.sources || []).find((s) =>
    /myneta|election commission|eci/i.test(s.name || "")
  );
  if (affidavitSource) return affidavitSource.name;
  return null;
};

export const validateProfileIdentity = (account, profile) => {
  const issues = [];
  const accountDoc = account?.toObject?.() || account || {};
  const profileDoc = profile?.toObject?.() || profile || {};
  const biography = profileDoc.biography || {};
  const identity = resolveEnrichmentIdentity({
    ...accountDoc,
    biographyParty: biography.party,
  });
  const partyResolution = resolveAccountParty({
    ...accountDoc,
    biographyParty: biography.party,
  });

  if (
    biography.fullName &&
    accountDoc.name &&
    !namesMatch(biography.fullName, accountDoc.name)
  ) {
    issues.push({
      code: "identity_name_mismatch",
      accountName: accountDoc.name,
      biographyName: biography.fullName,
    });
  }

  if (identity.stateCorrected) {
    issues.push({
      code: "state_mismatch",
      accountState: accountDoc.state,
      resolvedState: identity.state,
    });
  }

  if (identity.stateConflict) {
    issues.push({
      code: "state_signal_conflict",
      message: "Description and tag signals suggest different states",
    });
  }

  const accountParty = normalizePartyToken(accountDoc.party);
  const biographyParty = normalizePartyToken(biography.party);
  if (partyResolution.corrected) {
    issues.push({
      code: "party_mismatch",
      accountParty,
      resolvedParty: partyResolution.party,
      source: partyResolution.source,
    });
  } else if (
    biographyParty &&
    !isGenericParty(accountParty) &&
    !isGenericParty(biographyParty) &&
    accountParty.toLowerCase() !== biographyParty.toLowerCase() &&
    !namesMatch(accountParty, biographyParty)
  ) {
    issues.push({
      code: "party_conflict",
      accountParty,
      biographyParty,
    });
  }

  const wikipediaLink = biography.wikipediaLink || "";
  const wikiClass = classifyWikipediaLink(wikipediaLink, identity.searchName || identity.name);
  if (wikiClass === "election_page") {
    issues.push({ code: "wikipedia_election_page", url: wikipediaLink });
  } else if (wikiClass === "suspect") {
    issues.push({ code: "wikipedia_suspect", url: wikipediaLink });
  }

  const electionsCount = countElections(profileDoc);
  const electionSource = primaryElectionSource(profileDoc);
  if (electionsCount === 0) {
    if (wikiClass === "person") {
      issues.push({ code: "missing_elections", wikipediaLink });
    } else if (wikiClass === "missing" && (profileDoc.sources || []).length > 0) {
      issues.push({ code: "election_source_missing" });
    }
  } else if (!electionSource) {
    issues.push({ code: "election_source_missing", electionsCount });
  }

  const engineOutdated = needsEngineMigration(profileDoc);
  const confidenceBreakdown = computeConfidenceBreakdown({
    facts: profileDoc.facts || [],
    biography,
    sources: profileDoc.sources || [],
    lastVerified: profileDoc.lastVerified,
    electionsCount,
  });

  const manualReview =
    identity.stateConflict ||
    issues.some((issue) => issue.code === "party_conflict") ||
    issues.some((issue) => issue.code === "identity_name_mismatch");

  const needsRebuild =
    engineOutdated ||
    issues.some((issue) => REBUILD_ISSUE_CODES.has(issue.code));

  const accountRepairs = {};
  if (identity.stateCorrected && identity.state && identity.state !== accountDoc.state) {
    accountRepairs.state = identity.state;
  }
  if (partyResolution.corrected && partyResolution.party !== accountDoc.party) {
    accountRepairs.party = partyResolution.party;
  }

  return {
    accountId: String(accountDoc._id || profileDoc.accountId),
    accountName: accountDoc.name,
    identity,
    issues,
    accountRepairs,
    engineOutdated,
    needsRebuild,
    manualReview,
    wikipediaClass: wikiClass,
    electionsCount,
    electionSource,
    confidenceScore: confidenceBreakdown.overall,
    confidenceBreakdown,
    previousConfidenceScore: profileDoc.confidenceScore ?? 0,
  };
};

export const applyProfileIdentityRepairs = async (
  validation,
  { updateConfidence = true, scheduleRebuild = false } = {}
) => {
  const accountId = validation.accountId;
  const result = {
    accountId,
    accountName: validation.accountName,
    accountUpdated: false,
    confidenceUpdated: false,
    rebuildScheduled: false,
    error: null,
  };

  try {
    if (Object.keys(validation.accountRepairs).length > 0) {
      await Account.findByIdAndUpdate(accountId, { $set: validation.accountRepairs });
      result.accountUpdated = true;
      result.accountRepairs = validation.accountRepairs;
    }

    if (updateConfidence) {
      const confidenceDelta = Math.abs(
        validation.confidenceScore - validation.previousConfidenceScore
      );
      if (confidenceDelta >= 1) {
        await PoliticalProfile.findOneAndUpdate(
          { accountId },
          {
            $set: {
              confidenceScore: validation.confidenceScore,
              confidenceBreakdown: validation.confidenceBreakdown,
            },
          }
        );
        result.confidenceUpdated = true;
      }
    }

    if (scheduleRebuild && validation.needsRebuild) {
      scheduleProfileSync(accountId, {
        trigger: "identity_validation",
        logPrefix: "[IDENTITY VALIDATION]",
        force: validation.engineOutdated,
      });
      result.rebuildScheduled = true;
    }
  } catch (error) {
    result.error = error.message;
  }

  return result;
};

const scheduleRebuildQueue = (accountIds, { logPrefix = "[IDENTITY VALIDATION]", delayMs = 2500 } = {}) => {
  accountIds.forEach((accountId, index) => {
    setTimeout(() => {
      scheduleProfileSync(accountId, {
        trigger: "identity_validation",
        logPrefix,
        force: true,
      });
    }, index * delayMs);
  });
};

/**
 * Validate and repair every stored PoliticalProfile in the database.
 */
export const validateAllProfileIdentities = async ({
  repair = true,
  updateConfidence = true,
  scheduleRebuilds = true,
  logPrefix = "[IDENTITY VALIDATION]",
} = {}) => {
  const profiles = await PoliticalProfile.find({}).lean();
  const accountIds = profiles.map((p) => p.accountId);
  const accounts = await Account.find({ _id: { $in: accountIds } }).lean();
  const accountById = new Map(accounts.map((a) => [String(a._id), a]));

  const report = {
    startedAt: new Date().toISOString(),
    profilesChecked: 0,
    profilesRepaired: 0,
    profilesFailed: 0,
    profilesOrphaned: 0,
    profilesManualReview: 0,
    rebuildsScheduled: 0,
    accountMetadataFixed: 0,
    confidenceRecomputed: 0,
    issueSummary: {},
    repaired: [],
    failed: [],
    orphaned: [],
    manualReview: [],
    engineOutdated: 0,
    rebuildQueue: [],
  };

  console.log(`${logPrefix} Checking ${profiles.length} profiles...`);

  for (const profile of profiles) {
    report.profilesChecked += 1;
    const account = accountById.get(String(profile.accountId));

    if (!account) {
      report.profilesOrphaned += 1;
      report.orphaned.push({
        accountId: String(profile.accountId),
        reason: "account_not_found",
      });
      continue;
    }

    const validation = validateProfileIdentity(account, profile);
    for (const issue of validation.issues) {
      report.issueSummary[issue.code] = (report.issueSummary[issue.code] || 0) + 1;
    }
    if (validation.engineOutdated) report.engineOutdated += 1;

    if (validation.manualReview) {
      report.profilesManualReview += 1;
      report.manualReview.push({
        accountId: validation.accountId,
        accountName: validation.accountName,
        issues: validation.issues,
        wikipediaClass: validation.wikipediaClass,
        electionsCount: validation.electionsCount,
      });
    }

    if (validation.needsRebuild) {
      report.rebuildQueue.push(validation.accountId);
    }

    if (!repair) continue;

    const repairResult = await applyProfileIdentityRepairs(validation, {
      updateConfidence,
      scheduleRebuild: false,
    });
    if (repairResult.error) {
      report.profilesFailed += 1;
      report.failed.push({
        accountId: validation.accountId,
        accountName: validation.accountName,
        error: repairResult.error,
      });
      continue;
    }

    const repaired =
      repairResult.accountUpdated ||
      repairResult.confidenceUpdated ||
      validation.needsRebuild;

    if (repaired) {
      report.profilesRepaired += 1;
      report.repaired.push({
        accountId: validation.accountId,
        accountName: validation.accountName,
        accountRepairs: repairResult.accountRepairs || null,
        confidenceUpdated: repairResult.confidenceUpdated,
        rebuildQueued: validation.needsRebuild,
        issues: validation.issues.map((i) => i.code),
      });
    }

    if (repairResult.accountUpdated) report.accountMetadataFixed += 1;
    if (repairResult.confidenceUpdated) report.confidenceRecomputed += 1;
  }

  if (repair && scheduleRebuilds && report.rebuildQueue.length > 0) {
    scheduleRebuildQueue(report.rebuildQueue, { logPrefix });
    report.rebuildsScheduled = report.rebuildQueue.length;
  }

  report.completedAt = new Date().toISOString();
  report.targetEngineVersion = PROFILE_BUILDER_VERSIONS.profileEngineVersion;

  console.log(`${logPrefix} Report:`, JSON.stringify({
    profilesChecked: report.profilesChecked,
    profilesRepaired: report.profilesRepaired,
    profilesFailed: report.profilesFailed,
    profilesOrphaned: report.profilesOrphaned,
    profilesManualReview: report.profilesManualReview,
    rebuildsScheduled: report.rebuildsScheduled,
    issueSummary: report.issueSummary,
  }));

  return report;
};
