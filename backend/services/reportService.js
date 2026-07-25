import mongoose from "mongoose";
import crypto from "crypto";
import SavedReport, { REPORT_TYPES } from "../models/SavedReport.js";
import ReportAuditLog from "../models/ReportAuditLog.js";

/** Legacy validator / client aliases → canonical SavedReport.type */
export const TYPE_ALIASES = {
  insight: "ai_insight",
  ai: "ai_insight",
  strategy: "ai_insight",
  competitor: "comparison",
  competitor_comparison: "comparison",
  political: "political_profile",
  profile: "political_profile",
  news: "news_sentiment",
  sentiment: "news_sentiment",
};

export const VALID_LIST_FILTERS = [
  "all",
  "favorites",
  "pinned",
  "recent",
  "ai",
  "election",
  "influence",
  "comparison",
  "telemetry",
  "news",
  "archived",
  "draft",
];

export const VALID_SORTS = [
  "newest",
  "oldest",
  "recently_viewed",
  "alphabetical",
  "confidence",
  "most_opened",
  "favorites",
  "pinned_first",
];

/**
 * Normalize a client-provided type / reportType to a canonical enum value.
 * Returns null when the value cannot be resolved.
 */
export function normalizeReportType(raw) {
  if (raw == null || raw === "") return null;
  const value = String(raw).trim().toLowerCase();
  if (TYPE_ALIASES[value]) return TYPE_ALIASES[value];
  if (REPORT_TYPES.includes(value)) return value;
  return null;
}

/**
 * Estimate byte size of report content for the size field.
 */
export function estimateContentSize(content) {
  try {
    return Buffer.byteLength(JSON.stringify(content ?? {}), "utf8");
  } catch {
    return 0;
  }
}

/**
 * Stable content fingerprint for idempotent upsert / change detection.
 */
export function computeContentFingerprint(payload = {}) {
  const type = normalizeReportType(payload.type ?? payload.reportType) || "";
  const basis = {
    type,
    source: String(payload.source || "").trim(),
    profileId: payload.profileId ? String(payload.profileId) : "",
    accountId: payload.accountId ? String(payload.accountId) : "",
    title: String(payload.title || "").trim(),
    summary: String(payload.summary || "").trim(),
    confidence: payload.confidence ?? null,
    analysisVersion: String(payload.analysisVersion || ""),
    engineVersion: String(payload.engineVersion || ""),
    content: payload.content ?? null,
  };
  return crypto.createHash("sha256").update(JSON.stringify(basis)).digest("hex");
}

/**
 * Identity used to find an existing auto-saved report (never duplicates).
 * Political profiles key by accountId (stable). Other types key by source + optional profileId.
 */
export function buildIdentityQuery(userId, body = {}) {
  const type = normalizeReportType(body.type ?? body.reportType);
  const source = String(body.source || "").trim();
  if (!type || !source) return null;

  // One Intelligence Hub card per analyzed account
  if (
    type === "political_profile" &&
    body.accountId &&
    mongoose.Types.ObjectId.isValid(body.accountId)
  ) {
    return { userId, type: "political_profile", accountId: body.accountId };
  }

  const query = { userId, type, source };
  if (body.profileId && mongoose.Types.ObjectId.isValid(body.profileId)) {
    query.profileId = body.profileId;
  } else {
    query.$or = [{ profileId: null }, { profileId: { $exists: false } }];
  }
  return query;
}

/**
 * Upsert by identity. Same fingerprint → no-op. Different → refresh in place.
 * Returns { report, created, updated, unchanged }.
 */
export async function upsertReport(userId, body) {
  const payload = buildCreatePayload(userId, body);
  if (!payload.type) {
    const err = new Error("Invalid report type");
    err.statusCode = 400;
    throw err;
  }
  if (!payload.source) {
    const err = new Error("Source is required for upsert");
    err.statusCode = 400;
    throw err;
  }

  const fingerprint = body.contentFingerprint || computeContentFingerprint({
    ...payload,
    type: payload.type,
  });
  payload.contentFingerprint = fingerprint;

  const identity = buildIdentityQuery(userId, {
    type: payload.type,
    source: payload.source,
    profileId: payload.profileId,
    accountId: payload.accountId,
  });

  let existing = identity ? await SavedReport.findOne(identity) : null;

  // Legacy hub cards may lack accountId — recover by source string
  if (
    !existing &&
    payload.type === "political_profile" &&
    payload.accountId
  ) {
    existing = await SavedReport.findOne({
      userId,
      type: "political_profile",
      $or: [
        { source: `political_profile:${payload.accountId}` },
        { source: String(payload.source || "") },
      ],
      status: { $ne: "archived" },
    });
  }

  if (existing) {
    if (existing.contentFingerprint === fingerprint) {
      return { report: existing, created: false, updated: false, unchanged: true };
    }

    const refreshFields = {
      title: payload.title,
      description: payload.description,
      content: payload.content,
      thumbnail: payload.thumbnail,
      summary: payload.summary,
      tags: payload.tags,
      category: payload.category,
      searchKeywords: payload.searchKeywords,
      sourceModules: payload.sourceModules,
      confidence: payload.confidence,
      version: (existing.version || 1) + 1,
      reportVersion: payload.reportVersion,
      analysisVersion: payload.analysisVersion,
      engineVersion: payload.engineVersion,
      size: payload.size,
      metadata: payload.metadata,
      contentFingerprint: fingerprint,
      status: payload.status || existing.status || "ready",
      accountId: payload.accountId || existing.accountId,
      profileId: payload.profileId || existing.profileId,
    };

    // Atomic update avoids VersionError when profile sync + client upsert race
    let updated = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        updated = await SavedReport.findByIdAndUpdate(
          existing._id,
          { $set: refreshFields },
          { returnDocument: "after", runValidators: true }
        );
        break;
      } catch (err) {
        const isVersionConflict =
          err?.name === "VersionError" ||
          /No matching document found/i.test(String(err?.message || ""));
        if (!isVersionConflict || attempt === 2) throw err;
        // Reload and retry once concurrent writers settle
        existing = await SavedReport.findById(existing._id);
        if (!existing) break;
        if (existing.contentFingerprint === fingerprint) {
          return {
            report: existing,
            created: false,
            updated: false,
            unchanged: true,
          };
        }
        refreshFields.version = (existing.version || 1) + 1;
      }
    }

    if (!updated) {
      const fresh = await SavedReport.findById(existing._id);
      return {
        report: fresh || existing,
        created: false,
        updated: false,
        unchanged: true,
      };
    }

    await writeAuditLog({
      userId,
      reportId: updated._id,
      action: "updated",
      metadata: { upsert: true, type: updated.type, source: updated.source },
    });

    return { report: updated, created: false, updated: true, unchanged: false };
  }

  const report = await SavedReport.create(payload);
  await writeAuditLog({
    userId,
    reportId: report._id,
    action: "created",
    metadata: { upsert: true, type: report.type, source: report.source },
  });

  return { report, created: true, updated: false, unchanged: false };
}

/**
 * Build a create payload from request body while preserving legacy fields.
 */
export function buildCreatePayload(userId, body = {}) {
  const type = normalizeReportType(body.type ?? body.reportType);
  const tags = Array.isArray(body.tags)
    ? body.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];
  const searchKeywords = Array.isArray(body.searchKeywords)
    ? body.searchKeywords.map((t) => String(t).trim()).filter(Boolean)
    : [];
  const sourceModules = Array.isArray(body.sourceModules)
    ? body.sourceModules.map((t) => String(t).trim()).filter(Boolean)
    : [];

  return {
    userId,
    title: body.title,
    type,
    source: body.source,
    content: body.content,
    profileId: body.profileId || null,
    accountId: body.accountId || null,
    description: body.description || "",
    thumbnail: body.thumbnail || "",
    status: body.status || "ready",
    favorite: Boolean(body.favorite),
    pinned: Boolean(body.pinned),
    tags,
    category: body.category || "",
    summary: body.summary || "",
    searchKeywords,
    sourceModules,
    confidence:
      body.confidence === undefined || body.confidence === null
        ? null
        : Number(body.confidence),
    version: body.version != null ? Number(body.version) : 1,
    reportVersion: body.reportVersion != null ? String(body.reportVersion) : "1",
    analysisVersion: body.analysisVersion || "",
    engineVersion: body.engineVersion || "",
    visibility: body.visibility || "private",
    exportFormats: Array.isArray(body.exportFormats)
      ? body.exportFormats
      : undefined,
    size: body.size != null ? Number(body.size) : estimateContentSize(body.content),
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    contentFingerprint: body.contentFingerprint || null,
  };
}

/**
 * Allowed PATCH fields for hub primitives.
 */
export const PATCHABLE_FIELDS = [
  "title",
  "description",
  "tags",
  "favorite",
  "pinned",
  "status",
  "category",
  "summary",
  "searchKeywords",
  "thumbnail",
];

export function buildPatchPayload(body = {}) {
  const updates = {};

  for (const key of PATCHABLE_FIELDS) {
    if (body[key] === undefined) continue;
    if (key === "tags" || key === "searchKeywords") {
      updates[key] = Array.isArray(body[key])
        ? body[key].map((t) => String(t).trim()).filter(Boolean)
        : [];
      continue;
    }
    if (key === "favorite" || key === "pinned") {
      updates[key] = Boolean(body[key]);
      continue;
    }
    if (key === "title" || key === "description" || key === "category" || key === "summary" || key === "thumbnail" || key === "status") {
      updates[key] = typeof body[key] === "string" ? body[key].trim() : body[key];
    }
  }

  return updates;
}

/**
 * Map Intelligence Hub filter presets to Mongo predicates (additive to userId).
 */
export function buildFilterQuery(userId, query = {}) {
  const filter = { userId };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.type) {
    const normalized = normalizeReportType(query.type);
    if (normalized) filter.type = normalized;
  }

  if (query.category) {
    filter.category = String(query.category).trim();
  }

  if (query.profileId && mongoose.Types.ObjectId.isValid(query.profileId)) {
    filter.profileId = query.profileId;
  }

  if (query.tags) {
    const tags = String(query.tags)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length) filter.tags = { $in: tags };
  }

  const preset = (query.filter || "all").toLowerCase();
  switch (preset) {
    case "favorites":
      filter.favorite = true;
      break;
    case "pinned":
      filter.pinned = true;
      break;
    case "recent":
      filter.lastViewedAt = { $ne: null };
      break;
    case "ai":
      filter.type = "ai_insight";
      break;
    case "election":
      filter.type = "election";
      break;
    case "influence":
      filter.type = "influence";
      break;
    case "comparison":
      filter.type = { $in: ["comparison", "competitor_report"] };
      break;
    case "telemetry":
      filter.type = "telemetry";
      break;
    case "news":
      filter.type = "news_sentiment";
      break;
    case "archived":
      filter.status = "archived";
      break;
    case "draft":
      filter.status = "draft";
      break;
    case "all":
    default:
      break;
  }

  // Soft-archived reports stay out of normal hub views unless filter=archived
  if (preset !== "archived" && query.status !== "archived") {
    if (!filter.status) {
      filter.status = { $ne: "archived" };
    }
  }

  // Explicit type query overrides preset type when both provided and type is set via ?type=
  if (query.type) {
    const normalized = normalizeReportType(query.type);
    if (normalized) filter.type = normalized;
  }

  if (query.q && String(query.q).trim()) {
    const q = String(query.q).trim().slice(0, 120);
    const safeRx = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [
      { title: safeRx },
      { summary: safeRx },
      { source: safeRx },
      { tags: safeRx },
      { searchKeywords: safeRx },
      { category: safeRx },
    ];
  }

  return filter;
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Map sort preset to Mongo sort object.
 * Pinned-first is applied unless sort is explicitly oldest/alphabetical without pinned_first.
 */
export function buildSortQuery(sortKey = "newest") {
  const key = String(sortKey || "newest").toLowerCase();

  switch (key) {
    case "oldest":
      return { createdAt: 1 };
    case "recently_viewed":
      return { lastViewedAt: -1, createdAt: -1 };
    case "alphabetical":
      return { title: 1 };
    case "confidence":
      return { confidence: -1, createdAt: -1 };
    case "most_opened":
      return { viewCount: -1, createdAt: -1 };
    case "favorites":
      return { favorite: -1, createdAt: -1 };
    case "pinned_first":
      return { pinned: -1, favorite: -1, createdAt: -1 };
    case "newest":
    default:
      return { pinned: -1, createdAt: -1 };
  }
}

export function parsePagination(query = {}) {
  // Opt-out for rare legacy full dumps: ?all=true
  if (query.all === "true" || query.all === "1") {
    return { paginate: false, page: 1, limit: 0, skip: 0 };
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 24));
  const skip = (page - 1) * limit;

  return { paginate: true, page, limit, skip };
}

/** Lean card fields — omit heavy `content` from list queries */
export const REPORT_LIST_PROJECTION = {
  title: 1,
  type: 1,
  source: 1,
  summary: 1,
  description: 1,
  thumbnail: 1,
  status: 1,
  favorite: 1,
  pinned: 1,
  tags: 1,
  category: 1,
  confidence: 1,
  sourceModules: 1,
  searchKeywords: 1,
  engineVersion: 1,
  analysisVersion: 1,
  reportVersion: 1,
  version: 1,
  viewCount: 1,
  lastViewedAt: 1,
  createdAt: 1,
  updatedAt: 1,
  profileId: 1,
  accountId: 1,
  metadata: 1,
  visibility: 1,
  shareToken: 1,
  shareRevokedAt: 1,
  shareExpiresAt: 1,
};

/**
 * List reports for a user with search / filter / sort / default pagination.
 */
export async function listReports(userId, query = {}) {
  const filter = buildFilterQuery(userId, query);
  const sort = buildSortQuery(query.sort);
  const { paginate, page, limit, skip } = parsePagination(query);

  const baseQuery = SavedReport.find(filter)
    .select(REPORT_LIST_PROJECTION)
    .sort(sort)
    .lean({ virtuals: true });

  if (query.explain === "true" && process.env.NODE_ENV !== "production") {
    try {
      const explained = await SavedReport.find(filter)
        .select(REPORT_LIST_PROJECTION)
        .sort(sort)
        .explain("executionStats");
      console.info(
        "[reports] explain",
        JSON.stringify({
          nReturned: explained?.executionStats?.nReturned,
          totalDocsExamined: explained?.executionStats?.totalDocsExamined,
          executionTimeMillis: explained?.executionStats?.executionTimeMillis,
          indexName: explained?.queryPlanner?.winningPlan?.inputStage?.indexName,
        })
      );
    } catch (err) {
      console.warn("[reports] explain failed:", err.message);
    }
  }

  if (!paginate) {
    const reports = await baseQuery.limit(500);
    return {
      reports,
      count: reports.length,
      pagination: null,
    };
  }

  const [reports, total] = await Promise.all([
    SavedReport.find(filter)
      .select(REPORT_LIST_PROJECTION)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    SavedReport.countDocuments(filter),
  ]);

  return {
    reports,
    count: reports.length,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: page * limit < total,
    },
  };
}

export async function getOwnedReport(reportId, userId) {
  if (!mongoose.Types.ObjectId.isValid(reportId)) return null;
  return SavedReport.findOne({ _id: reportId, userId });
}

export async function createReport(userId, body) {
  const payload = buildCreatePayload(userId, body);
  if (!payload.type) {
    const err = new Error("Invalid report type");
    err.statusCode = 400;
    throw err;
  }
  const report = await SavedReport.create(payload);
  await writeAuditLog({
    userId,
    reportId: report._id,
    action: "created",
    metadata: { type: report.type, source: report.source },
  });
  return report;
}

export async function patchReport(reportId, userId, body) {
  const updates = buildPatchPayload(body);
  if (Object.keys(updates).length === 0) {
    const err = new Error("No valid fields to update");
    err.statusCode = 400;
    throw err;
  }

  const report = await SavedReport.findOneAndUpdate(
    { _id: reportId, userId },
    { $set: updates },
    { returnDocument: "after", runValidators: true }
  );

  if (!report) return null;

  let action = "updated";
  if (updates.favorite !== undefined && Object.keys(updates).length === 1) {
    action = "favorited";
  } else if (updates.pinned !== undefined && Object.keys(updates).length === 1) {
    action = "pinned";
  } else if (updates.favorite !== undefined || updates.pinned !== undefined) {
    action = updates.favorite !== undefined ? "favorited" : "pinned";
  }

  await writeAuditLog({
    userId,
    reportId: report._id,
    action,
    metadata: { updates: Object.keys(updates) },
  });

  return report;
}

export async function archiveOwnedReport(reportId, userId) {
  const report = await SavedReport.findOneAndUpdate(
    { _id: reportId, userId },
    {
      $set: {
        status: "archived",
        visibility: "private",
        shareRevokedAt: new Date(),
        shareExpiresAt: null,
      },
      $unset: { shareToken: "" },
    },
    { returnDocument: "after" }
  );
  if (!report) return null;

  await writeAuditLog({
    userId,
    reportId: report._id,
    action: "updated",
    metadata: { softArchive: true, title: report.title, type: report.type },
  });

  return report;
}

export async function deleteOwnedReport(reportId, userId, { hard = false } = {}) {
  if (!hard) {
    return archiveOwnedReport(reportId, userId);
  }

  const report = await SavedReport.findOneAndDelete({ _id: reportId, userId });
  if (!report) return null;

  await writeAuditLog({
    userId,
    reportId: report._id,
    action: "deleted",
    metadata: { title: report.title, type: report.type, hard: true },
  });

  return report;
}

export async function recordReportView(report) {
  report.lastViewedAt = new Date();
  report.viewCount = (report.viewCount || 0) + 1;
  await report.save();

  await writeAuditLog({
    userId: report.userId,
    reportId: report._id,
    action: "viewed",
    metadata: { viewCount: report.viewCount },
  });

  return report;
}

export async function writeAuditLog({ userId, reportId, action, metadata = {} }) {
  try {
    await ReportAuditLog.create({ userId, reportId, action, metadata });
  } catch (err) {
    // Audit must never block the primary request path
    console.error("[reportService] audit write failed:", err.message);
  }
}

/**
 * Create or rotate a secure public share token for an owned report.
 * @param {object} options
 * @param {'public'|'private'|'team'} [options.visibility='public']
 * @param {number} [options.expiresInDays] - optional expiry window
 */
export async function createShareLink(reportId, userId, options = {}) {
  const report = await getOwnedReport(reportId, userId);
  if (!report) return null;

  if (options.visibility === "private") {
    const updated = await SavedReport.findOneAndUpdate(
      { _id: reportId, userId },
      {
        $set: {
          visibility: "private",
          shareRevokedAt: new Date(),
          shareExpiresAt: null,
        },
        $unset: { shareToken: "" },
      },
      { returnDocument: "after" }
    );
    if (!updated) return null;
    await writeAuditLog({
      userId,
      reportId: updated._id,
      action: "revoked",
      metadata: { reason: "set_private" },
    });
    return updated;
  }

  const token = crypto.randomBytes(32).toString("hex");
  report.shareToken = token;
  report.visibility = options.visibility === "team" ? "team" : "public";
  report.shareRevokedAt = null;

  if (options.expiresInDays != null && Number(options.expiresInDays) > 0) {
    const days = Math.min(365, Number(options.expiresInDays));
    report.shareExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  } else {
    report.shareExpiresAt = null;
  }

  await report.save();

  await writeAuditLog({
    userId,
    reportId: report._id,
    action: "shared",
    metadata: {
      visibility: report.visibility,
      expiresAt: report.shareExpiresAt,
    },
  });

  return report;
}

export async function revokeShareLink(reportId, userId) {
  const report = await SavedReport.findOneAndUpdate(
    { _id: reportId, userId },
    {
      $set: {
        visibility: "private",
        shareRevokedAt: new Date(),
        shareExpiresAt: null,
      },
      $unset: { shareToken: "" },
    },
    { returnDocument: "after" }
  );
  if (!report) return null;

  await writeAuditLog({
    userId,
    reportId: report._id,
    action: "revoked",
    metadata: {},
  });

  return report;
}

/**
 * Resolve a public share token. Never returns private/revoked/expired reports.
 * Auto-upgrades dossier template when versions require it.
 */
export async function getSharedReportByToken(token) {
  if (!token || typeof token !== "string" || token.length < 32) return { error: "invalid" };

  let report = await SavedReport.findOne({ shareToken: token });
  if (!report) return { error: "not_found" };

  if (report.shareRevokedAt) return { error: "revoked" };
  if (report.visibility !== "public" && report.visibility !== "team") {
    return { error: "private" };
  }
  if (report.shareExpiresAt && new Date(report.shareExpiresAt) < new Date()) {
    return { error: "expired" };
  }

  try {
    const { ensureReportDossier } = await import("./reportDossierService.js");
    await ensureReportDossier(report);
  } catch (err) {
    console.warn("[reports] shared dossier ensure failed:", err.message);
  }

  const obj = report.toObject({ virtuals: true });

  // Public payload: strip owner id noise but keep intelligence content + dossier
  const publicReport = {
    id: obj._id,
    title: obj.title,
    description: obj.description,
    type: obj.type,
    reportType: obj.type,
    summary: obj.summary,
    category: obj.category,
    tags: obj.tags,
    confidence: obj.confidence,
    thumbnail: obj.thumbnail,
    sourceModules: obj.sourceModules,
    content: obj.content,
    dossier: obj.dossier || null,
    metadata: obj.metadata,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    visibility: obj.visibility,
    shareExpiresAt: obj.shareExpiresAt,
  };

  return { report: publicReport };
}

export async function getReportAuditHistory(reportId, userId, { limit = 50 } = {}) {
  const owned = await getOwnedReport(reportId, userId);
  if (!owned) return null;

  const logs = await ReportAuditLog.find({ reportId, userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(100, Math.max(1, limit)))
    .lean();

  return logs;
}

/**
 * Serialize for API — always include reportType alias alongside type.
 */
export function serializeReport(report) {
  if (!report) return null;
  const obj = typeof report.toObject === "function"
    ? report.toObject({ virtuals: true })
    : { ...report };
  obj.reportType = obj.type;
  obj.id = obj._id;
  // Never leak raw shareToken in list responses unless explicitly needed —
  // detail/share endpoints include it for owners.
  return obj;
}

export function serializeReportOwner(report) {
  const obj = serializeReport(report);
  if (!obj) return null;
  obj.isShared = Boolean(obj.shareToken) && obj.visibility !== "private" && !obj.shareRevokedAt;
  return obj;
}
