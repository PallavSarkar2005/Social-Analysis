import OpenAI from "openai";
import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";
import Content from "../models/Content.js";
import PoliticalProfile from "../models/PoliticalProfile.js";
import { sanitizeBiographyForResponse, sanitizeVerifiedFactsForResponse, sanitizeSourcesForResponse } from "../services/politicalProfileEnrichmentService.js";
import { sanitizeTimelineForResponse, sanitizeTimelineIntelligenceForResponse } from "../services/politicalTimelineService.js";
import { scheduleProfileSync } from "../services/profileBuilderService.js";
import { deriveModules, deriveModuleDataFlags, buildModuleMetaFromLegacy } from "../services/sectionMetaService.js";

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

// Helper to resolve Account by ID or YouTube Channel ID (accountId)
const resolveAccount = async (idOrChannelId) => {
  if (!idOrChannelId) return null;
  if (idOrChannelId.match(/^[0-9a-fA-F]{24}$/)) {
    const acc = await Account.findById(idOrChannelId);
    if (acc) return acc;
  }
  return await Account.findOne({ accountId: idOrChannelId });
};

export const getOrCreateProfileForAccount = async (account) => {
  scheduleProfileSync(account._id, { trigger: "on_demand" });
  return PoliticalProfile.findOne({ accountId: account._id }).lean();
};

const buildAccountShellBiography = (account) => ({
  fullName: account.name || null,
  state: account.state || null,
  party: account.party || null,
  constituency: null,
  currentPosition: null,
});

const buildProfileReadResponse = (account, profile) => {
  const moduleMeta =
    profile?.moduleMeta && Object.keys(profile.moduleMeta).length > 0
      ? profile.moduleMeta
      : profile
        ? buildModuleMetaFromLegacy(profile, { account })
        : {};
  const modules = deriveModules(moduleMeta);
  const moduleData = deriveModuleDataFlags(moduleMeta);
  const syncStatus = profile?.syncStatus || (profile ? "ready" : "pending");
  const building = !profile || syncStatus === "pending" || syncStatus === "building";

  return {
    _id: profile?._id || null,
    id: profile?._id || null,
    account,
    syncStatus: building ? "building" : syncStatus,
    syncProgress: profile?.syncProgress || {
      completed: 0,
      total: 0,
      currentSection: null,
    },
    modules,
    moduleMeta,
    moduleData,
    biography: profile
      ? sanitizeBiographyForResponse(profile.biography)
      : buildAccountShellBiography(account),
    verifiedFacts: profile
      ? sanitizeVerifiedFactsForResponse(profile.verifiedFacts)
      : [],
    fieldProvenance: profile?.fieldProvenance || {},
    timeline: profile ? sanitizeTimelineForResponse(profile.timeline) : [],
    timelineIntelligence: profile
      ? sanitizeTimelineIntelligenceForResponse(profile.timelineIntelligence)
      : sanitizeTimelineIntelligenceForResponse(),
    sources: profile ? sanitizeSourcesForResponse(profile.sources) : [],
    confidenceScore: profile?.confidenceScore ?? 0,
    confidenceBreakdown: profile?.confidenceBreakdown || {},
    intelligenceOverview: Array.isArray(profile?.intelligenceOverview)
      ? profile.intelligenceOverview
      : [],
    politicalStatistics: Array.isArray(profile?.politicalStatistics)
      ? profile.politicalStatistics
      : [],
    relationships: {
      nodes: Array.isArray(profile?.relationships?.nodes)
        ? profile.relationships.nodes
        : [],
      edges: Array.isArray(profile?.relationships?.edges)
        ? profile.relationships.edges.map((edge) => ({
            ...edge,
            relation: edge?.relation || "related",
          }))
        : [],
    },
    fieldConflicts: Array.isArray(profile?.fieldConflicts) ? profile.fieldConflicts : [],
    sectionMeta: profile?.sectionMeta || {},
    verificationCatalog: Array.isArray(profile?.verificationCatalog)
      ? profile.verificationCatalog
      : [],
    lastVerified: profile?.lastVerified || profile?.lastSynced || null,
    lastSynced: profile?.lastSynced || null,
    profileSchemaVersion: profile?.profileSchemaVersion ?? 0,
    profileEngineVersion: profile?.profileEngineVersion ?? 0,
    moduleVersion: profile?.moduleVersion ?? 0,
    builderVersion: profile?.builderVersion ?? 0,
    building,
  };
};

const loadProfileForRead = async (creatorId) => {
  const account = await resolveAccount(creatorId);
  if (!account) return null;

  const profile = await PoliticalProfile.findOne({ accountId: account._id }).lean();
  scheduleProfileSync(account._id, { trigger: "on_demand" });

  return buildProfileReadResponse(account, profile);
};

const logProfileEnter = (handler, creatorId) => {
  console.log(`ENTER ${handler}`);
  console.log(`[PROFILE API] ENTER ${handler} creatorId=${creatorId}`);
};

const logProfileSuccess = (handler, creatorId, startedAt) => {
  console.log(`SUCCESS ${handler}`);
  console.log(
    `[PROFILE API] EXIT ${handler} creatorId=${creatorId} duration=${Date.now() - startedAt}ms`
  );
};

const logProfileError = (handler, creatorId, error) => {
  console.error(`FAILED ${handler}`, error);
  console.error(`[PROFILE API] ERROR ${handler} creatorId=${creatorId}: ${error.message}`);
  if (error.stack) console.error(error.stack);
};

// 1. GET /api/profile/:creatorId
export const getProfile = async (req, res, next) => {
  const startedAt = Date.now();
  const { creatorId } = req.params;
  logProfileEnter("getProfile", creatorId);
  try {
    const result = await loadProfileForRead(creatorId);
    if (!result) return res.status(404).json({ success: false, message: "Profile not found" });

    res.json({
      success: true,
      data: result,
    });
    logProfileSuccess("getProfile", creatorId, startedAt);
  } catch (error) {
    logProfileError("getProfile", creatorId, error);
    next(error);
  }
};

// 2. GET /api/profile/:creatorId/timeline
export const getTimeline = async (req, res, next) => {
  const startedAt = Date.now();
  const { creatorId } = req.params;
  logProfileEnter("getTimeline", creatorId);
  try {
    const result = await loadProfileForRead(creatorId);
    if (!result) return res.status(404).json({ success: false, message: "Profile not found" });

    res.json({
      success: true,
      data: result.timeline,
      timelineIntelligence: result.timelineIntelligence,
    });
    logProfileSuccess("getTimeline", creatorId, startedAt);
  } catch (error) {
    logProfileError("getTimeline", creatorId, error);
    next(error);
  }
};

// 3. GET /api/profile/:creatorId/news
export const getNews = async (req, res) => {
  const { creatorId } = req.params;
  const logPrefix = `[NEWS] creatorId=${creatorId}`;

  console.log("ENTER getNews");
  console.log(`${logPrefix} read-only request`);

  try {
    const account = await resolveAccount(creatorId);
    if (!account) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    const profile = await PoliticalProfile.findOne({ accountId: account._id })
      .select("news newsSentiment syncStatus moduleMeta")
      .lean();

    scheduleProfileSync(account._id, { trigger: "on_demand", logPrefix });

    return res.json({
      success: true,
      data: {
        news: profile?.news ?? [],
        sentiment: profile?.newsSentiment ?? null,
        syncStatus: profile?.syncStatus || "pending",
        modules: deriveModules(profile?.moduleMeta || {}),
      },
    });
  } catch (error) {
    console.error("FAILED getNews", error);
    return res.json({
      success: true,
      data: {
        news: [],
        sentiment: null,
      },
    });
  }
};

// 4. GET /api/profile/:creatorId/charts
export const getCharts = async (req, res, next) => {
  console.log("ENTER getCharts");
  try {
    const { creatorId } = req.params;
    const account = await resolveAccount(creatorId);
    if (!account) return res.status(404).json({ success: false, message: "Account not found" });

    const [snapshots, contents] = await Promise.all([
      Snapshot.find({
        account: account._id,
        userId: req.user._id,
      }).sort({ capturedAt: 1 }).lean(),
      Content.find({
        account: account._id,
        userId: req.user._id,
      })
        .select("type")
        .lean(),
    ]);

    // Build all chart datasets from the same chronologically sorted snapshot history.
    const timeSeries = snapshots.map((s) => ({
      capturedAt: new Date(s.capturedAt).toISOString(),
      date: new Date(s.capturedAt).toLocaleDateString(),
      subscribers: s.followers,
      views: s.views,
      engagement: s.engagementRate || 0,
    }));

    const uploadsByMonth = new Map();
    for (let i = 1; i < snapshots.length; i++) {
      const previous = snapshots[i - 1];
      const current = snapshots[i];
      const previousVideos = Number(previous.videos || 0);
      const currentVideos = Number(current.videos || 0);
      const uploadsDelta = currentVideos - previousVideos;

      if (uploadsDelta <= 0) continue;

      const capturedAt = new Date(current.capturedAt);
      const monthKey = `${capturedAt.getFullYear()}-${String(capturedAt.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = capturedAt.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      if (!uploadsByMonth.has(monthKey)) {
        uploadsByMonth.set(monthKey, {
          month: monthLabel,
          uploads: 0,
        });
      }

      uploadsByMonth.get(monthKey).uploads += uploadsDelta;
    }

    const uploadsDistribution = Array.from(uploadsByMonth.values());

    const contentTypeCounts = new Map();
    for (const content of contents) {
      const normalizedType = content.type === "short" ? "Shorts" : content.type === "video" ? "Videos" : null;
      if (!normalizedType) continue;
      contentTypeCounts.set(normalizedType, (contentTypeCounts.get(normalizedType) || 0) + 1);
    }

    const totalContentItems = Array.from(contentTypeCounts.values()).reduce((sum, count) => sum + count, 0);
    const categories = Array.from(contentTypeCounts.entries())
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalContentItems > 0 ? Number(((value / totalContentItems) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const contentDistributionMessage = contents.length === 0
      ? "No synced YouTube content metadata is available for this profile yet."
      : categories.length === 0
        ? "Stored YouTube content items do not include distribution metadata yet."
        : "";

    res.json({
      success: true,
      data: {
        timeSeries,
        uploadsDistribution,
        categories,
        contentDistributionMessage,
      },
    });
    console.log("SUCCESS getCharts");
  } catch (error) {
    console.error("FAILED getCharts", error);
    next(error);
  }
};

// 5. GET /api/profile/:creatorId/elections
export const getElections = async (req, res, next) => {
  console.log("ENTER getElections");
  try {
    const result = await loadProfileForRead(req.params.creatorId);
    if (!result) return res.status(404).json({ success: false, message: "Profile not found" });

    const profile = await PoliticalProfile.findOne({ accountId: result.account._id })
      .select("elections electionIntelligence")
      .lean();

    const elections =
      profile?.electionIntelligence?.length > 0
        ? profile.electionIntelligence
        : profile?.elections;

    res.json({
      success: true,
      data: Array.isArray(elections) ? elections : [],
    });
    console.log("SUCCESS getElections");
  } catch (error) {
    console.error("FAILED getElections", error);
    next(error);
  }
};

// 6. GET /api/profile/:creatorId/influence
export const getInfluence = async (req, res, next) => {
  console.log("ENTER getInfluence");
  try {
    const result = await loadProfileForRead(req.params.creatorId);
    if (!result) return res.status(404).json({ success: false, message: "Profile not found" });

    const profile = await PoliticalProfile.findOne({ accountId: result.account._id })
      .select("influence geographicReach geographicMeta")
      .lean();

    const influenceRaw =
      profile?.influence && typeof profile.influence === "object" && !Array.isArray(profile.influence)
        ? profile.influence
        : {};
    const influence = {
      ...influenceRaw,
      explanation:
        typeof influenceRaw.explanation === "string"
          ? influenceRaw.explanation
          : influenceRaw.explanation != null
            ? String(influenceRaw.explanation)
            : "",
      metrics: Array.isArray(influenceRaw.metrics)
        ? influenceRaw.metrics.map((m) => ({
            ...m,
            label: m?.label != null ? String(m.label) : "",
            tooltip: m?.tooltip != null ? String(m.tooltip) : "",
            sources: Array.isArray(m?.sources)
              ? m.sources
                  .map((s) =>
                    typeof s === "string"
                      ? s
                      : s?.name || s?.label || s?.source || ""
                  )
                  .filter(Boolean)
              : [],
          }))
        : [],
    };

    const geographicReach = (Array.isArray(profile?.geographicReach) ? profile.geographicReach : []).map(
      (row) => {
        const evidence = Array.isArray(row?.evidence)
          ? row.evidence.map((ev) => ({
              type: ev?.type || "evidence",
              label: ev?.label != null ? String(ev.label) : "",
              detail: ev?.detail != null ? String(ev.detail) : "",
              source: ev?.source != null ? String(ev.source) : "",
            }))
          : [];
        const primarySources = Array.isArray(row?.primarySources)
          ? row.primarySources
              .map((s) =>
                typeof s === "string" ? s : s?.name || s?.label || s?.source || ""
              )
              .filter(Boolean)
          : evidence.map((ev) => ev.source).filter(Boolean);

        return {
          ...row,
          evidence,
          primarySources,
          source:
            typeof row?.source === "string"
              ? row.source
              : primarySources.join("; "),
        };
      }
    );

    const geographicMeta = profile?.geographicMeta || {
      status: "monitoring",
      message:
        "Geographic monitoring active. State influence will populate as verified evidence syncs.",
      verifiedCoverage: 0,
      regionalSummary: {
        primaryRegion: null,
        secondaryRegions: [],
        emergingRegions: [],
        verifiedCoverage: 0,
      },
    };

    if (geographicMeta.regionalSummary) {
      geographicMeta.regionalSummary = {
        ...geographicMeta.regionalSummary,
        secondaryRegions: Array.isArray(geographicMeta.regionalSummary.secondaryRegions)
          ? geographicMeta.regionalSummary.secondaryRegions.map(String)
          : [],
        emergingRegions: Array.isArray(geographicMeta.regionalSummary.emergingRegions)
          ? geographicMeta.regionalSummary.emergingRegions.map(String)
          : [],
      };
    }

    res.json({
      success: true,
      data: {
        influence,
        geographicReach,
        geographicMeta,
      },
    });
    console.log("SUCCESS getInfluence");
  } catch (error) {
    console.error("FAILED getInfluence", error);
    next(error);
  }
};

// 7. GET /api/profile/:creatorId/ai-insights
export const getAiInsights = async (req, res, next) => {
  console.log("ENTER getAiInsights");
  try {
    const result = await loadProfileForRead(req.params.creatorId);
    if (!result) return res.status(404).json({ success: false, message: "Profile not found" });

    const profile = await PoliticalProfile.findOne({ accountId: result.account._id })
      .select("aiInsights aiSummary")
      .lean();

    const rawSummary =
      profile?.aiSummary && typeof profile.aiSummary === "object" && !Array.isArray(profile.aiSummary)
        ? profile.aiSummary
        : typeof profile?.aiSummary === "string"
          ? { overview: profile.aiSummary }
          : {};
    const summary = Object.fromEntries(
      Object.entries(rawSummary).map(([key, value]) => [
        key,
        value == null
          ? ""
          : typeof value === "string" || typeof value === "number"
            ? String(value)
            : typeof value === "object"
              ? [value.label, value.detail, value.source].filter(Boolean).join(" — ") || ""
              : String(value),
      ])
    );

    const insights = Array.isArray(profile?.aiInsights)
      ? profile.aiInsights
          .map((item) =>
            typeof item === "string"
              ? item
              : item == null
                ? ""
                : typeof item === "object"
                  ? [item.label, item.detail, item.source].filter(Boolean).join(" — ") ||
                    item.summary ||
                    item.text ||
                    ""
                  : String(item)
          )
          .filter(Boolean)
      : [];

    res.json({
      success: true,
      data: {
        insights,
        summary,
      },
    });
    console.log("SUCCESS getAiInsights");
  } catch (error) {
    console.error("FAILED getAiInsights", error);
    next(error);
  }
};

// 8. GET /api/profile/:creatorId/history
export const getHistory = async (req, res, next) => {
  console.log("ENTER getHistory");
  try {
    const { creatorId } = req.params;
    const account = await resolveAccount(creatorId);
    if (!account) return res.status(404).json({ success: false, message: "Account not found" });

    const snapshots = await Snapshot.find({
      account: account._id,
      userId: req.user._id,
    })
      .sort({ capturedAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: snapshots.map((s) => ({
        id: s._id,
        date: new Date(s.capturedAt).toLocaleDateString(),
        subscribers: s.followers,
        views: s.views,
        engagement: s.engagementRate || 0,
      })),
    });
    console.log("SUCCESS getHistory");
  } catch (error) {
    console.error("FAILED getHistory", error);
    next(error);
  }
};

// 9. GET /api/profile/:creatorId/similar
export const getSimilar = async (req, res, next) => {
  console.log("ENTER getSimilar");
  try {
    const account = await resolveAccount(req.params.creatorId);
    if (!account) return res.status(404).json({ success: false, message: "Creator not found" });

    // Look for leaders in same party, same state, or similar size
    const similar = await Account.find({
      _id: { $ne: account._id },
      userId: req.user._id,
      $or: [
        { party: account.party },
        { state: account.state },
      ],
    }).limit(4).lean();

    res.json({
      success: true,
      data: similar.map((s) => ({
        _id: s._id,
        name: s.name,
        party: s.party,
        state: s.state,
        profileImage: s.profileImage || s.resolvedImage || s.thumbnail || "",
        resolvedImage: s.resolvedImage || "",
        thumbnail: s.thumbnail || "",
        imageSource: s.imageSource || "youtube",
        subscribers: s.subscribers || 0,
      })),
    });
    console.log("SUCCESS getSimilar");
  } catch (error) {
    console.error("FAILED getSimilar", error);
    next(error);
  }
};

// 10. POST /api/profile/:creatorId/chat (SSE Stream context-aware researcher chat)
export const chatProfile = async (req, res, next) => {
  console.log("ENTER chatProfile");
  const { creatorId } = req.params;
  const { message, history = [] } = req.body;
  
  if (!message) {
    return res.status(400).json({ success: false, message: "Message is required." });
  }

  // SSE setup
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const result = await loadProfileForRead(creatorId);
    if (!result) {
      res.write(`data: ${JSON.stringify({ error: "Profile not found" })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    const { account } = result;
    const profile =
      (await PoliticalProfile.findOne({ accountId: account._id }).lean()) || {};

    // Fetch snapshot timeline
    const snapshots = await Snapshot.find({ account: account._id, userId: req.user._id })
      .sort({ capturedAt: -1 })
      .limit(6)
      .lean();

    // Compile RAG context
    let creatorContext = `REAL-TIME POLITICAL PROFILE & TELEMETRY CONTEXT:\n`;
    creatorContext += `- Name: ${account.name}\n`;
    creatorContext += `- Party: ${account.party} | State: ${account.state}\n`;
    creatorContext += `- Active constituency: ${profile.biography?.constituency || "N/A"}\n`;
    creatorContext += `- Current position: ${profile.biography?.currentPosition || "N/A"}\n`;
    creatorContext += `- Education: ${profile.biography?.education || "N/A"}\n`;
    creatorContext += `- Digital metrics: ${account.subscribers.toLocaleString()} subscribers | ${account.views.toLocaleString()} total views | ${account.engagement}% engagement\n`;
    
    if (snapshots.length > 0) {
      creatorContext += `\nCHECKPOINT SNAPSHOT HISTORY:\n`;
      snapshots.forEach((s) => {
        creatorContext += `- Date: ${new Date(s.capturedAt).toLocaleDateString()} | Subscribers: ${s.followers.toLocaleString()} | Views: ${s.views.toLocaleString()}\n`;
      });
    }

    const systemPrompt = `You are a context-aware political research assistant for the Social IQ platform.
You are researching ${account.name}.
Answer questions concisely and professionally based directly on the provided leadership profile and telemetry context.
Format your responses in clean Markdown. Include comparisons and timelines when requested.

[CONTEXT]
${creatorContext}
[END CONTEXT]`;

    const { client, model } = getAiClient();
    const activeStream = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-6),
        { role: "user", content: message },
      ],
      stream: true,
    });

    for await (const chunk of activeStream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
    console.log("SUCCESS chatProfile");
  } catch (error) {
    console.error("FAILED chatProfile", error);
    console.error("[PROFILE CHAT ERROR]", error.message);
    res.write(`data: ${JSON.stringify({ error: "Political Research assistant encountered a problem. Please try again." })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
};
