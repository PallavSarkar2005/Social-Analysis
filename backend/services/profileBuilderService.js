import OpenAI from "openai";
import axios from "axios";
import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";
import PoliticalProfile from "../models/PoliticalProfile.js";
import PROFILE_BUILDER_VERSIONS, {
  SECTION_VERSION_KEY,
  applyVersionStamp,
  buildModuleVersionsSnapshot,
  getOutdatedSections,
  getProfileUpgradePlan,
  getStoredVersion,
  needsSchemaMigration,
} from "../config/profileBuilderVersion.js";
import {
  enrichPoliticalProfile,
  buildEmptyProfileShell,
} from "./politicalProfileEnrichmentService.js";
import { buildCareerTimelinePackage } from "./politicalTimelineService.js";
import { buildIntelligenceOverview } from "./overviewEngine.js";
import { generateAiPoliticalSummary } from "./aiPoliticalSummaryService.js";
import { buildRelationshipGraph } from "./relationshipGraphService.js";
import {
  buildElectionIntelligence,
  toLegacyElections,
} from "./electionIntelligenceService.js";
import { buildModuleMeta, buildModuleMetaFromLegacy } from "./sectionMetaService.js";
import { resolveEnrichmentIdentity, resolveAccountParty } from "../providers/shared/politicalIdentityUtils.js";

export { getOutdatedSections, getProfileUpgradePlan, isProfileOutdated } from "../config/profileBuilderVersion.js";

const getAiClient = () => {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No AI API Keys configured on the server.");
  }
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
    client: new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }),
    model: "gpt-4o-mini",
  };
};

const parseGoogleNewsRss = (xmlString) => {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xmlString)) !== null && items.length < 8) {
    const content = match[1];
    const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = content.match(/<link>([\s\S]*?)<\/link>/);
    const pubDateMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const sourceMatch = content.match(/<source[\s\S]*?>([\s\S]*?)<\/source>/);

    let title = titleMatch ? titleMatch[1] : "";
    let url = linkMatch ? linkMatch[1] : "";
    let publishedTime = pubDateMatch ? pubDateMatch[1] : "";
    let source = sourceMatch ? sourceMatch[1] : "News";

    title = title
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, "/");

    const cleanTitle = title.replace(/\s+-\s+[^ -]+$/, "").trim();

    items.push({
      headline: cleanTitle,
      source,
      publishedTime: publishedTime
        ? new Date(publishedTime).toLocaleDateString()
        : new Date().toLocaleDateString(),
      url,
      thumbnail:
        "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=120&auto=format&fit=crop&q=60",
      summary: cleanTitle,
    });
  }
  return items;
};

const NEWS_EXTERNAL_TIMEOUT_MS = 12000;

const defaultNewsSentiment = () => ({
  positive: 33,
  neutral: 34,
  negative: 33,
  keywords: ["Leader", "Elections", "Party"],
  trending: ["Policy updates", "Campaign"],
});

const withNewsTimeout = (promise, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} timed out after ${NEWS_EXTERNAL_TIMEOUT_MS}ms`)),
        NEWS_EXTERNAL_TIMEOUT_MS
      );
    }),
  ]);

const analyzeNewsSentiment = async (headlines, logPrefix = "[NEWS]") => {
  const prompt = `Analyze the political sentiment of these news headlines:
${headlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}

Respond with ONLY a JSON object:
{
  "positive": percentage (integer, e.g. 40),
  "neutral": percentage (integer, e.g. 45),
  "negative": percentage (integer, e.g. 15),
  "keywords": ["array of top 5 keywords"],
  "trending": ["array of top 3 trending political topics"]
}`;

  try {
    const { client, model } = getAiClient();
    const response = await withNewsTimeout(
      client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      "News sentiment AI"
    );
    return JSON.parse(response.choices[0].message.content.trim());
  } catch (error) {
    console.error(`${logPrefix} AI sentiment fallback:`, error.message);
    if (error.stack) console.error(error.stack);
    return defaultNewsSentiment();
  }
};

export const fetchNewsForAccount = async (account, { logPrefix = "[NEWS]" } = {}) => {
  let freshNews = [];

  try {
    const rssUrl = `https://news.google.com/rss/search?hl=en-IN&gl=IN&ceid=IN:en&q=${encodeURIComponent(account.name)}`;
    console.log(`${logPrefix} external RSS start name="${account.name}"`);
    const response = await withNewsTimeout(
      axios.get(rssUrl, { timeout: 10000 }),
      "Google News RSS"
    );
    const xml =
      typeof response.data === "string" ? response.data : String(response.data ?? "");
    freshNews = parseGoogleNewsRss(xml);
    console.log(`${logPrefix} external RSS done count=${freshNews.length}`);
  } catch (error) {
    console.error(`${logPrefix} external RSS failed:`, error.message);
    if (error.stack) console.error(error.stack);
    return null;
  }

  if (freshNews.length === 0) {
    return null;
  }

  let sentiment = defaultNewsSentiment();
  try {
    console.log(`${logPrefix} AI sentiment start`);
    sentiment = await analyzeNewsSentiment(
      freshNews.map((item) => item.headline),
      logPrefix
    );
    console.log(`${logPrefix} AI sentiment done`);
  } catch (error) {
    console.error(`${logPrefix} AI sentiment failed:`, error.message);
    if (error.stack) console.error(error.stack);
  }

  return { news: freshNews, newsSentiment: sentiment };
};

const clampScore = (value, max = 100) =>
  Math.min(max, Math.max(0, Math.round(value)));

const buildOverviewSection = async (account) => {
  const enriched = await enrichPoliticalProfile(account);
  if (!enriched.enrichmentSuccess) {
    return {
      biography: {
        fullName: account.name || null,
        state: account.state || null,
        party: account.party || null,
      },
      elections: [],
      sources: [],
      confidenceScore: 0,
      lastVerified: null,
      timeline: [],
      enrichmentSuccess: false,
    };
  }

  return {
    biography: enriched.biography,
    facts: enriched.facts ?? [],
    verifiedFacts: enriched.verifiedFacts ?? [],
    fieldProvenance: enriched.fieldProvenance ?? {},
    fieldConflicts: enriched.fieldConflicts ?? [],
    elections: enriched.elections ?? [],
    electionIntelligence: enriched.electionIntelligence ?? [],
    relationships: enriched.relationships ?? { nodes: [], edges: [] },
    politicalStatistics: enriched.politicalStatistics ?? [],
    sectionMeta: enriched.sectionMeta ?? {},
    verificationCatalog: enriched.verificationCatalog ?? [],
    sources: enriched.sources ?? [],
    confidenceScore: enriched.confidenceScore ?? 0,
    confidenceBreakdown: enriched.confidenceBreakdown ?? {},
    lastVerified: enriched.lastVerified,
    timeline: enriched.timeline ?? [],
    enrichmentSuccess: true,
  };
};

const buildTimelineSection = (profile, overviewData = null) => {
  const biography = overviewData?.biography || profile?.biography || {};
  const elections = overviewData?.elections || profile?.elections || [];
  const sources = overviewData?.sources || profile?.sources || [];
  const rawTimeline = overviewData?.rawTimeline || [];
  const facts = overviewData?.facts || profile?.facts || [];
  const storedTimeline = profile?.timeline || [];

  const { timeline, timelineIntelligence } = buildCareerTimelinePackage({
    biography,
    rawTimeline,
    elections,
    sources,
    facts,
    storedTimeline,
  });

  return { timeline, timelineIntelligence };
};

const buildFactsSection = (overviewData, profile) => ({
  facts: overviewData?.facts ?? profile?.facts ?? [],
  verifiedFacts: overviewData?.verifiedFacts ?? profile?.verifiedFacts ?? [],
  fieldProvenance: overviewData?.fieldProvenance ?? profile?.fieldProvenance ?? {},
  fieldConflicts: overviewData?.fieldConflicts ?? profile?.fieldConflicts ?? [],
  confidenceBreakdown: overviewData?.confidenceBreakdown ?? profile?.confidenceBreakdown ?? {},
  sectionMeta: overviewData?.sectionMeta ?? profile?.sectionMeta ?? {},
  verificationCatalog: overviewData?.verificationCatalog ?? profile?.verificationCatalog ?? [],
});

const buildElectionsSection = (overviewData, profile) => ({
  elections: overviewData?.elections ?? profile?.elections ?? [],
  electionIntelligence: overviewData?.electionIntelligence ?? profile?.electionIntelligence ?? [],
});

const buildRelationshipsSection = (overviewData, profile) => {
  if (overviewData?.relationships?.nodes) {
    return {
      relationships: {
        nodes: overviewData.relationships.nodes ?? [],
        edges: overviewData.relationships.edges ?? [],
      },
    };
  }
  return {
    relationships: buildRelationshipGraph({
      biography: profile?.biography ?? {},
      facts: profile?.facts ?? [],
      elections: profile?.electionIntelligence ?? profile?.elections ?? [],
    }),
  };
};

const buildOverviewCardsSection = (account, profile, overviewData) => {
  const cards = buildIntelligenceOverview({
    biography: overviewData?.biography || profile?.biography || {},
    account,
    elections: overviewData?.elections || profile?.elections || [],
    electionIntelligence:
      overviewData?.electionIntelligence || profile?.electionIntelligence || [],
    confidenceBreakdown:
      overviewData?.confidenceBreakdown || profile?.confidenceBreakdown || {},
    influence: profile?.influence || {},
    timeline: overviewData?.timeline || profile?.timeline || [],
    lastVerified: overviewData?.lastVerified || profile?.lastVerified || null,
  });
  return {
    intelligenceOverview: cards,
    politicalStatistics:
      overviewData?.politicalStatistics || profile?.politicalStatistics || [],
  };
};

const buildInfluenceSection = (account, snapshots = []) => {
  const subscribers = Number(account.subscribers || 0);
  const views = Number(account.views || 0);
  const engagement = Number(account.engagement || 0);

  let audienceGrowth = 0;
  if (snapshots.length >= 2) {
    const oldest = snapshots[0];
    const latest = snapshots[snapshots.length - 1];
    const baseFollowers = Number(oldest.followers || 0);
    const latestFollowers = Number(latest.followers || 0);
    if (baseFollowers > 0) {
      audienceGrowth =
        Math.round(((latestFollowers - baseFollowers) / baseFollowers) * 1000) /
        10;
    }
  }

  const logSubs = Math.log10(Math.max(subscribers, 1));
  const logViews = Math.log10(Math.max(views, 1));

  return {
    influence: {
      nationalReach: clampScore(logSubs * 20),
      regionalReach: clampScore(logSubs * 16),
      digitalInfluence: clampScore(logSubs * 14 + engagement * 2),
      audienceGrowth,
      engagementScore: clampScore(engagement * 10),
      visibilityScore: clampScore(logViews * 8),
      trustScore: clampScore(40 + engagement * 3),
      followerQualityScore: clampScore(engagement * 8 + logSubs * 5),
      explanation: `Derived from ${subscribers.toLocaleString()} subscribers, ${views.toLocaleString()} views, and ${engagement}% engagement across stored telemetry.`,
    },
  };
};

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
];

const buildReachSection = (account, profile) => {
  const homeState =
    account.state || profile?.biography?.state || "Unknown State";
  const subscribers = Number(account.subscribers || 0);
  const baseInfluence = clampScore(Math.log10(Math.max(subscribers, 1)) * 18);

  const geographicReach = [
    {
      state: homeState,
      concentration: 55,
      influenceScore: baseInfluence,
    },
  ];

  for (const state of INDIAN_STATES) {
    if (state === homeState || geographicReach.length >= 6) continue;
    geographicReach.push({
      state,
      concentration: Math.max(2, Math.round(12 - geographicReach.length * 2)),
      influenceScore: clampScore(baseInfluence * 0.35),
    });
  }

  return {
    geographicReach,
    audienceAnalytics: {
      ageGroups: {
        "18-24": 25,
        "25-34": 40,
        "35-44": 20,
        "45+": 15,
      },
      gender: {
        male: 75,
        female: 24,
        other: 1,
      },
      devices: {
        mobile: 85,
        desktop: 12,
        tablet: 3,
      },
      languages: {
        Hindi: 50,
        English: 25,
        Regional: 25,
      },
      peakWatchTime: "7 PM - 10 PM",
      topCities: ["Mumbai", "Delhi", homeState !== "Unknown State" ? homeState : "Bangalore"],
      topCountries: ["India", "United States", "UAE"],
      returningPct: 45,
      newPct: 55,
    },
  };
};

const buildAiInsightsSection = async (account, profile) => {
  const { summary, insights } = await generateAiPoliticalSummary({
    verifiedFacts: profile.verifiedFacts || [],
    elections: profile.elections || [],
    politicalStatistics: profile.politicalStatistics || [],
  });
  return { aiInsights: insights, aiSummary: summary };
};

const rebuildElectionsFromStored = (profile, overviewData = null) => {
  if (overviewData?.electionIntelligence?.length || overviewData?.elections?.length) {
    return buildElectionsSection(overviewData, profile);
  }

  const providerElections = [];
  if (Array.isArray(profile?.elections) && profile.elections.length > 0) {
    providerElections.push(profile.elections);
  }
  if (Array.isArray(profile?.electionIntelligence) && profile.electionIntelligence.length > 0) {
    providerElections.push(profile.electionIntelligence);
  }

  const electionIntelligence = buildElectionIntelligence(
    providerElections,
    profile?.biography ?? {},
    profile?.sources ?? []
  );

  return {
    elections: toLegacyElections(electionIntelligence),
    electionIntelligence,
  };
};

const buildSchemaMigrationPayload = (profile, account, snapshots = []) => {
  const moduleMeta = buildModuleMetaFromLegacy(profile || {}, {
    account,
    snapshotCount: snapshots.length,
  });

  return {
    profileSchemaVersion: PROFILE_BUILDER_VERSIONS.profileSchemaVersion,
    profileEngineVersion: PROFILE_BUILDER_VERSIONS.profileEngineVersion,
    moduleVersion: PROFILE_BUILDER_VERSIONS.moduleVersion,
    moduleMeta,
    moduleVersions: {
      ...(profile?.moduleVersions || {}),
      ...buildModuleVersionsSnapshot(
        Object.keys(SECTION_VERSION_KEY).filter((key) => {
          const versionKey = SECTION_VERSION_KEY[key];
          return (profile?.[versionKey] ?? 0) >= (PROFILE_BUILDER_VERSIONS[versionKey] ?? 0);
        })
      ),
    },
  };
};

const resolveSyncStatus = (sectionErrors, sectionsBuilt) => {
  if (sectionErrors.length > 0 && sectionsBuilt.length === 0) return "failed";
  if (sectionErrors.length > 0) return "partial";
  return "ready";
};

const syncAccountBiographyFields = (profile, account) => ({
  biography: {
    ...(profile?.biography?.toObject?.() || profile?.biography || {}),
    fullName: account.name || profile?.biography?.fullName || null,
    state: account.state || profile?.biography?.state || null,
    party: account.party || profile?.biography?.party || null,
  },
});

const resolveAccountById = async (accountId) => {
  if (!accountId) return null;
  return Account.findById(accountId);
};

const loadBuildContext = async (account) => {
  const snapshots = await Snapshot.find({ account: account._id })
    .sort({ capturedAt: 1 })
    .lean();
  return { snapshots };
};

const formatDuration = (ms) => `${ms}ms`;

const logSectionStart = (logPrefix, sectionName, accountId) => {
  console.log(`${logPrefix} [${sectionName}] start accountId=${accountId}`);
};

const logSectionSuccess = (logPrefix, sectionName, accountId, startedAt) => {
  console.log(
    `${logPrefix} [${sectionName}] done accountId=${accountId} duration=${formatDuration(Date.now() - startedAt)}`
  );
};

const logSectionError = (logPrefix, sectionName, accountId, startedAt, error) => {
  console.error(
    `${logPrefix} [${sectionName}] FAILED accountId=${accountId} duration=${formatDuration(Date.now() - startedAt)}`
  );
  console.error(`${logPrefix} [${sectionName}] error: ${error?.message || "unknown error"}`);
  if (error?.stack) {
    console.error(error.stack);
  }
};

/**
 * Run a profile build section in isolation — failures log and return emptyResult
 * without aborting the overall build.
 */
const runBuildSection = async (
  sectionName,
  accountId,
  logPrefix,
  fn,
  emptyResult = {}
) => {
  const startedAt = Date.now();
  logSectionStart(logPrefix, sectionName, accountId);
  try {
    const data = await fn();
    logSectionSuccess(logPrefix, sectionName, accountId, startedAt);
    return { success: true, data };
  } catch (error) {
    logSectionError(logPrefix, sectionName, accountId, startedAt, error);
    return { success: false, data: emptyResult, error };
  }
};

const emptyOverviewFallback = (account) => ({
  biography: {
    fullName: account.name || null,
    state: account.state || null,
    party: account.party || null,
  },
  facts: [],
  verifiedFacts: [],
  fieldProvenance: {},
  fieldConflicts: [],
  elections: [],
  electionIntelligence: [],
  relationships: { nodes: [], edges: [] },
  politicalStatistics: [],
  sectionMeta: {},
  verificationCatalog: [],
  sources: [],
  confidenceScore: 0,
  confidenceBreakdown: {},
  lastVerified: null,
  timeline: [],
  enrichmentSuccess: false,
});

const applyOverviewCoreFields = (updatePayload, biographySync, overviewData) => {
  updatePayload.biography = {
    ...biographySync.biography,
    ...(overviewData?.biography || {}),
  };
  updatePayload.elections = overviewData?.elections ?? [];
  updatePayload.electionIntelligence = overviewData?.electionIntelligence ?? [];
  updatePayload.sources = overviewData?.sources ?? [];
  updatePayload.confidenceScore = overviewData?.confidenceScore ?? 0;
  updatePayload.confidenceBreakdown = overviewData?.confidenceBreakdown ?? {};
  updatePayload.facts = overviewData?.facts ?? [];
  updatePayload.verifiedFacts = overviewData?.verifiedFacts ?? [];
  updatePayload.fieldProvenance = overviewData?.fieldProvenance ?? {};
  updatePayload.fieldConflicts = overviewData?.fieldConflicts ?? [];
  updatePayload.sectionMeta = overviewData?.sectionMeta ?? {};
  updatePayload.verificationCatalog = overviewData?.verificationCatalog ?? [];
  if (overviewData?.lastVerified) {
    updatePayload.lastVerified = overviewData.lastVerified;
  }
};

/** Per-account in-memory mutex — prevents duplicate concurrent builds. */
const buildLocks = new Map();

const runBuildProfile = async (
  accountId,
  { logPrefix = "[PROFILE BUILDER]", force = false, trigger = "manual" } = {}
) => {
  const account = await resolveAccountById(accountId);
  if (!account) {
    return { success: false, reason: "account_not_found" };
  }

  const accountIdStr = String(account._id);
  let profile = await PoliticalProfile.findOne({ accountId: account._id });
  const { snapshots } = await loadBuildContext(account);
  const upgradePlan = getProfileUpgradePlan(profile, { force });
  const outdatedSections = [...upgradePlan.outdatedSections];

  if (!upgradePlan.needsWork) {
    const versionStamp = {};
    if (getStoredVersion(profile, "builderVersion") < PROFILE_BUILDER_VERSIONS.builderVersion) {
      versionStamp.builderVersion = PROFILE_BUILDER_VERSIONS.builderVersion;
    }
    profile = await PoliticalProfile.findOneAndUpdate(
      { accountId: account._id },
      {
        $set: {
          ...syncAccountBiographyFields(profile, account),
          ...versionStamp,
          lastSynced: new Date(),
          syncStatus: profile?.syncStatus === "building" ? "ready" : profile?.syncStatus || "ready",
        },
      },
      { new: true }
    );
    return { success: true, action: versionStamp.builderVersion ? "stamped" : "skipped", profile, account, upgradePlan };
  }

  const buildStartedAt = Date.now();
  const migrationOnly =
    outdatedSections.length === 0 &&
    (upgradePlan.schemaMigration ||
      upgradePlan.engineMigration ||
      getStoredVersion(profile, "builderVersion") < PROFILE_BUILDER_VERSIONS.builderVersion);

  if (migrationOnly) {
    const migrationPayload = {
      ...buildSchemaMigrationPayload(profile, account, snapshots),
      builderVersion: PROFILE_BUILDER_VERSIONS.builderVersion,
    };
    profile = await PoliticalProfile.findOneAndUpdate(
      { accountId: account._id },
      {
        $set: {
          ...migrationPayload,
          syncStatus: "ready",
          syncTrigger: trigger,
          lastSyncCompletedAt: new Date(),
          lastSyncAttemptAt: new Date(),
        },
      },
      { new: true, upsert: !profile }
    );
    return {
      success: true,
      action: "migrated",
      profile,
      account,
      sectionsBuilt: [],
      sectionErrors: [],
      upgradePlan,
    };
  }

  console.log(
    `${logPrefix} Upgrade start accountId=${accountIdStr} name="${account.name}" sections=[${outdatedSections.join(", ")}]`
  );

  await PoliticalProfile.findOneAndUpdate(
    { accountId: account._id },
    {
      $set: {
        syncStatus: "building",
        syncTrigger: trigger,
        lastSyncAttemptAt: new Date(),
        syncProgress: {
          completed: 0,
          total: outdatedSections.length,
          currentSection: outdatedSections[0] || null,
          startedAt: new Date().toISOString(),
        },
      },
    },
    { upsert: !profile }
  );

  profile = await PoliticalProfile.findOne({ accountId: account._id });

  const biographySync = syncAccountBiographyFields(profile, account);
  const updatePayload = { ...biographySync, lastSynced: new Date() };
  const sectionsBuilt = [];
  const sectionErrors = [];
  let overviewData = null;
  let completedSections = 0;

  const bumpProgress = async (currentSection) => {
    completedSections += 1;
    await PoliticalProfile.findOneAndUpdate(
      { accountId: account._id },
      {
        $set: {
          syncProgress: {
            completed: completedSections,
            total: outdatedSections.length,
            currentSection,
            startedAt: new Date(buildStartedAt).toISOString(),
          },
        },
      }
    );
  };

  if (upgradePlan.schemaMigration) {
    Object.assign(updatePayload, buildSchemaMigrationPayload(profile, account, snapshots));
  }

  if (outdatedSections.includes("overview")) {
    const overviewResult = await runBuildSection(
      "buildOverview",
      accountIdStr,
      logPrefix,
      () => buildOverviewSection(account),
      emptyOverviewFallback(account)
    );
    if (!overviewResult.success) {
      sectionErrors.push({ section: "buildOverview", error: overviewResult.error });
    }
    overviewData = overviewResult.data;
    applyOverviewCoreFields(updatePayload, biographySync, overviewData);

    const correctedState =
      overviewData?.biography?.state || resolveEnrichmentIdentity(account).state;
    const partyResolution = resolveAccountParty({
      ...account.toObject?.() || account,
      biographyParty: overviewData?.biography?.party,
    });
    const accountRepairs = {};
    if (
      correctedState &&
      correctedState !== "Unknown State" &&
      correctedState !== account.state
    ) {
      accountRepairs.state = correctedState;
    }
    if (partyResolution.corrected && partyResolution.party !== account.party) {
      accountRepairs.party = partyResolution.party;
    }
    if (Object.keys(accountRepairs).length > 0) {
      await Account.findByIdAndUpdate(account._id, { $set: accountRepairs });
      Object.assign(account, accountRepairs);
    }

    const statisticsResult = await runBuildSection(
      "buildPoliticalStatistics",
      accountIdStr,
      logPrefix,
      () => buildOverviewCardsSection(account, profile, overviewData),
      { intelligenceOverview: [], politicalStatistics: [] }
    );
    if (!statisticsResult.success) {
      sectionErrors.push({ section: "buildPoliticalStatistics", error: statisticsResult.error });
    }
    Object.assign(updatePayload, statisticsResult.data);

    sectionsBuilt.push("overview", "facts");
    await bumpProgress("overview");
  }

  if (outdatedSections.includes("facts") && !sectionsBuilt.includes("facts")) {
    const factsResult = await runBuildSection(
      "buildFacts",
      accountIdStr,
      logPrefix,
      () => buildFactsSection(overviewData, profile),
      {
        facts: [],
        verifiedFacts: [],
        fieldProvenance: {},
        fieldConflicts: [],
        confidenceBreakdown: {},
        sectionMeta: {},
        verificationCatalog: [],
      }
    );
    if (!factsResult.success) {
      sectionErrors.push({ section: "buildFacts", error: factsResult.error });
    }
    Object.assign(updatePayload, factsResult.data);
    sectionsBuilt.push("facts");
    await bumpProgress("facts");
  }

  if (outdatedSections.includes("timeline")) {
    const timelineResult = await runBuildSection(
      "buildTimeline",
      accountIdStr,
      logPrefix,
      () => buildTimelineSection(profile, overviewData),
      { timeline: [], timelineIntelligence: {} }
    );
    if (!timelineResult.success) {
      sectionErrors.push({ section: "buildTimeline", error: timelineResult.error });
    }
    updatePayload.timeline = timelineResult.data.timeline ?? overviewData?.timeline ?? profile?.timeline ?? [];
    updatePayload.timelineIntelligence =
      timelineResult.data.timelineIntelligence ?? profile?.timelineIntelligence ?? {};
    sectionsBuilt.push("timeline");
    await bumpProgress("timeline");
  }

  if (outdatedSections.includes("elections")) {
    const electionResult = await runBuildSection(
      "buildElectionIntelligence",
      accountIdStr,
      logPrefix,
      () =>
        rebuildElectionsFromStored(
          { ...(profile?.toObject?.() || profile || {}), ...updatePayload },
          overviewData
        ),
      { elections: [], electionIntelligence: [] }
    );
    if (!electionResult.success) {
      sectionErrors.push({ section: "buildElectionIntelligence", error: electionResult.error });
    }
    Object.assign(updatePayload, electionResult.data);
    sectionsBuilt.push("elections");
    await bumpProgress("elections");
  }

  if (outdatedSections.includes("relationships")) {
    const relationshipResult = await runBuildSection(
      "buildRelationshipGraph",
      accountIdStr,
      logPrefix,
      () =>
        buildRelationshipsSection(overviewData, {
          ...(profile?.toObject?.() || profile || {}),
          ...updatePayload,
        }),
      { relationships: { nodes: [], edges: [] } }
    );
    if (!relationshipResult.success) {
      sectionErrors.push({ section: "buildRelationshipGraph", error: relationshipResult.error });
    }
    Object.assign(updatePayload, relationshipResult.data);
    sectionsBuilt.push("relationships");
    await bumpProgress("relationships");
  }

  if (outdatedSections.includes("news")) {
    const newsResult = await runBuildSection(
      "buildNews",
      accountIdStr,
      logPrefix,
      async () => {
        const newsData = await fetchNewsForAccount(account, { logPrefix });
        if (!newsData) {
          return {
            news: profile?.news ?? [],
            newsSentiment: profile?.newsSentiment ?? null,
          };
        }
        return newsData;
      },
      { news: profile?.news ?? [], newsSentiment: profile?.newsSentiment ?? null }
    );
    if (!newsResult.success) {
      sectionErrors.push({ section: "buildNews", error: newsResult.error });
    }
    if (newsResult.data?.news) {
      updatePayload.news = newsResult.data.news;
      updatePayload.newsSentiment = newsResult.data.newsSentiment;
    }
    sectionsBuilt.push("news");
    await bumpProgress("news");
  }

  if (outdatedSections.includes("influence")) {
    const influenceResult = await runBuildSection(
      "buildInfluence",
      accountIdStr,
      logPrefix,
      () => buildInfluenceSection(account, snapshots),
      { influence: {} }
    );
    if (!influenceResult.success) {
      sectionErrors.push({ section: "buildInfluence", error: influenceResult.error });
    }
    Object.assign(updatePayload, influenceResult.data);
    sectionsBuilt.push("influence");
    await bumpProgress("influence");
  }

  if (outdatedSections.includes("reach")) {
    const reachResult = await runBuildSection(
      "buildReach",
      accountIdStr,
      logPrefix,
      () => buildReachSection(account, profile),
      { geographicReach: [], audienceAnalytics: {} }
    );
    if (!reachResult.success) {
      sectionErrors.push({ section: "buildReach", error: reachResult.error });
    }
    Object.assign(updatePayload, reachResult.data);
    sectionsBuilt.push("reach");
    await bumpProgress("reach");
  }

  if (outdatedSections.includes("ai")) {
    const workingProfile = { ...(profile?.toObject?.() || profile || {}), ...updatePayload };
    const aiResult = await runBuildSection(
      "buildAISummary",
      accountIdStr,
      logPrefix,
      () => buildAiInsightsSection(account, workingProfile),
      { aiInsights: [], aiSummary: {} }
    );
    if (!aiResult.success) {
      sectionErrors.push({ section: "buildAISummary", error: aiResult.error });
    }
    updatePayload.aiInsights = aiResult.data.aiInsights ?? [];
    updatePayload.aiSummary = aiResult.data.aiSummary ?? {};
    sectionsBuilt.push("ai");
    await bumpProgress("ai");
  }

  const uniqueSectionsBuilt = [...new Set(sectionsBuilt)];
  Object.assign(updatePayload, applyVersionStamp(uniqueSectionsBuilt));
  updatePayload.moduleVersions = {
    ...(profile?.moduleVersions || {}),
    ...buildModuleVersionsSnapshot(uniqueSectionsBuilt),
  };

  const workingForMeta = { ...(profile?.toObject?.() || profile || {}), ...updatePayload };
  updatePayload.moduleMeta = buildModuleMeta({
    profile: workingForMeta,
    account,
    snapshotCount: snapshots.length,
  });
  updatePayload.syncStatus = resolveSyncStatus(sectionErrors, uniqueSectionsBuilt);
  updatePayload.syncTrigger = trigger;
  updatePayload.lastSyncCompletedAt = new Date();
  updatePayload.lastSyncAttemptAt = new Date();
  updatePayload.syncProgress = {
    completed: outdatedSections.length,
    total: outdatedSections.length,
    currentSection: null,
    finishedAt: new Date().toISOString(),
  };

  if (upgradePlan.schemaMigration || needsSchemaMigration(profile)) {
    updatePayload.profileSchemaVersion = PROFILE_BUILDER_VERSIONS.profileSchemaVersion;
    updatePayload.profileEngineVersion = PROFILE_BUILDER_VERSIONS.profileEngineVersion;
    updatePayload.moduleVersion = PROFILE_BUILDER_VERSIONS.moduleVersion;
  }

  try {
    if (!profile) {
      profile = await PoliticalProfile.create({
        ...buildEmptyProfileShell(account),
        ...updatePayload,
        accountId: account._id,
      });
    } else {
      profile = await PoliticalProfile.findOneAndUpdate(
        { accountId: account._id },
        { $set: updatePayload },
        { new: true }
      );
    }
  } catch (persistError) {
    logSectionError(logPrefix, "databasePersist", accountIdStr, buildStartedAt, persistError);
    if (!profile) {
      try {
        profile = await PoliticalProfile.create(buildEmptyProfileShell(account));
      } catch (shellError) {
        logSectionError(logPrefix, "databasePersistFallback", accountIdStr, buildStartedAt, shellError);
        throw shellError;
      }
    }
    sectionErrors.push({ section: "databasePersist", error: persistError });
    await PoliticalProfile.findOneAndUpdate(
      { accountId: account._id },
      { $set: { syncStatus: "failed", lastSyncAttemptAt: new Date() } }
    );
  }

  if (sectionErrors.length > 0) {
    console.warn(
      `${logPrefix} Upgrade completed with ${sectionErrors.length} section error(s) accountId=${accountIdStr} sections=[${sectionErrors.map((e) => e.section).join(", ")}] duration=${formatDuration(Date.now() - buildStartedAt)}`
    );
  } else {
    console.log(
      `${logPrefix} Upgraded ${account.name} accountId=${accountIdStr} sections=[${uniqueSectionsBuilt.join(", ")}] duration=${formatDuration(Date.now() - buildStartedAt)}`
    );
  }

  return {
    success: sectionErrors.length === 0,
    action: sectionErrors.length === 0 ? "updated" : "partial",
    profile,
    account,
    sectionsBuilt: uniqueSectionsBuilt,
    sectionErrors,
    upgradePlan,
  };
};

/**
 * Queue-ready sync entry point. Cron, on-demand, and future workers call this.
 */
export const syncProfileAccount = (accountId, options = {}) =>
  buildProfile(accountId, {
    logPrefix: "[PROFILE SYNC]",
    trigger: "cron",
    ...options,
  });

const scheduledSyncKeys = new Set();

/**
 * Non-blocking background upgrade — safe to call on every API read.
 */
export const scheduleProfileSync = (accountId, options = {}) => {
  const key = String(accountId);
  if (scheduledSyncKeys.has(key)) return;
  scheduledSyncKeys.add(key);

  setImmediate(() => {
    scheduledSyncKeys.delete(key);
    syncProfileAccount(accountId, {
      trigger: "on_demand",
      logPrefix: "[PROFILE SYNC]",
      ...options,
    }).catch((err) => {
      console.warn(`[PROFILE SYNC] Background upgrade failed for ${key}:`, err.message);
    });
  });
};

/**
 * Version-aware upgrade pass for all accounts with stored profiles and active accounts.
 */
export const syncAllProfileAccounts = async ({
  logPrefix = "[PROFILE UPGRADE]",
  force = false,
} = {}) => {
  const startedAt = Date.now();
  const [profiles, activeAccounts] = await Promise.all([
    PoliticalProfile.find({}).select("accountId").lean(),
    Account.find({ isActive: true, platform: "youtube" }).select("_id").lean(),
  ]);

  const accountIds = new Set([
    ...profiles.map((p) => String(p.accountId)),
    ...activeAccounts.map((a) => String(a._id)),
  ]);

  const stats = {
    processed: 0,
    updated: 0,
    migrated: 0,
    skipped: 0,
    partial: 0,
    failed: 0,
    total: accountIds.size,
  };

  console.log(`${logPrefix} Starting version-aware upgrade for ${stats.total} accounts...`);

  for (const accountId of accountIds) {
    stats.processed += 1;
    try {
      const result = await syncProfileAccount(accountId, { logPrefix, force, trigger: "cron" });

      if (result.reason === "account_not_found") {
        stats.failed += 1;
      } else if (result.action === "migrated") {
        stats.migrated += 1;
      } else if (result.action === "updated") {
        stats.updated += 1;
      } else if (result.action === "partial") {
        stats.partial += 1;
      } else if (result.action === "skipped") {
        stats.skipped += 1;
      } else {
        stats.failed += 1;
      }
    } catch (error) {
      stats.failed += 1;
      console.error(`${logPrefix} Failed account ${accountId}:`, error.message);
    }
  }

  const runtimeMs = Date.now() - startedAt;
  console.log(
    `${logPrefix} Complete — processed=${stats.processed} updated=${stats.updated} migrated=${stats.migrated} partial=${stats.partial} skipped=${stats.skipped} failed=${stats.failed} total=${stats.total} runtime=${runtimeMs}ms`
  );

  return { ...stats, runtimeMs };
};

/**
 * Build missing or outdated profile sections for an account.
 * Idempotent — safe to call multiple times; skips sections already at current version.
 * Concurrent calls for the same account share one in-flight build Promise.
 */
export const buildProfile = async (accountId, options = {}) => {
  const lockKey = String(accountId);
  if (buildLocks.has(lockKey)) {
    return buildLocks.get(lockKey);
  }

  const buildPromise = runBuildProfile(accountId, options).finally(() => {
    buildLocks.delete(lockKey);
  });

  buildLocks.set(lockKey, buildPromise);
  return buildPromise;
};

/**
 * Force a full rebuild of every profile section regardless of stored versions.
 */
export const rebuildProfile = (accountId, options = {}) =>
  buildProfile(accountId, { ...options, force: true });

/**
 * Upgrade every stored profile using version-aware incremental sync.
 * Pass force: true only for administrative full rebuilds.
 */
export const rebuildAllProfiles = async ({
  logPrefix = "[PROFILE UPGRADE]",
  force = false,
} = {}) => syncAllProfileAccounts({ logPrefix, force });

/**
 * @deprecated Request path must not refresh news. Schedules background sync instead.
 */
export const refreshNewsIfStale = async (account, profile, { logPrefix = "[NEWS]" } = {}) => {
  console.log(`${logPrefix} read-only — scheduling background news sync`);
  scheduleProfileSync(account._id, { logPrefix, trigger: "news" });
  return profile;
};
