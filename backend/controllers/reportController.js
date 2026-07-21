import {
  createReport,
  listReports,
  getOwnedReport,
  patchReport,
  deleteOwnedReport,
  recordReportView,
  serializeReport,
  serializeReportOwner,
  normalizeReportType,
  upsertReport,
  buildIdentityQuery,
  createShareLink,
  revokeShareLink,
  getReportAuditHistory,
  getSharedReportByToken,
} from "../services/reportService.js";
import SavedReport from "../models/SavedReport.js";
import { checkAndIncrementReportLimit } from "../middleware/billingMiddleware.js";
import {
  attachUpdateAvailable,
  regenerateReportFromSource,
} from "../services/reportSyncService.js";
import { ensureReportDossier } from "../services/reportDossierService.js";
import { ensureHubIndexIncremental } from "../services/hubIndexService.js";

// @desc    Save a report (AI insight, comparison, analysis, hub types)
// @route   POST /api/reports
// @access  Private
export const saveReport = async (req, res, next) => {
  try {
    const { title, type, reportType, source, content } = req.body;

    if (!title || !(type || reportType) || !source || content === undefined || content === null) {
      return res.status(400).json({
        success: false,
        message: "Title, type, source, and content are required",
      });
    }

    const normalized = normalizeReportType(type ?? reportType);
    if (!normalized) {
      return res.status(400).json({
        success: false,
        message: "Invalid report type",
      });
    }

    const report = await createReport(req.user._id, {
      ...req.body,
      type: normalized,
    });

    res.status(201).json({
      success: true,
      data: serializeReport(report),
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Idempotent auto-save / refresh report (no duplicates)
// @route   POST /api/reports/upsert
// @access  Private
export const upsertSavedReport = async (req, res, next) => {
  try {
    const { title, type, reportType, source, content } = req.body;

    if (!title || !(type || reportType) || !source || content === undefined || content === null) {
      return res.status(400).json({
        success: false,
        message: "Title, type, source, and content are required",
      });
    }

    const normalized = normalizeReportType(type ?? reportType);
    if (!normalized) {
      return res.status(400).json({
        success: false,
        message: "Invalid report type",
      });
    }

    const identity = buildIdentityQuery(req.user._id, {
      type: normalized,
      source,
      profileId: req.body.profileId,
    });
    const existing = identity ? await SavedReport.findOne(identity).select("_id") : null;

    // Only charge plan quota on true create
    if (!existing) {
      const limitError = await checkAndIncrementReportLimit(req.user._id);
      if (limitError) {
        // Soft-fail for auto-save: never surface as a hard auth/forbidden page
        return res.status(200).json({
          success: false,
          skipped: true,
          reason: "quota",
          message: limitError.message || "Report save quota reached",
        });
      }
    }

    const result = await upsertReport(req.user._id, {
      ...req.body,
      type: normalized,
    });

    const status = result.created ? 201 : 200;
    res.status(status).json({
      success: true,
      created: result.created,
      updated: result.updated,
      unchanged: result.unchanged,
      data: serializeReport(result.report),
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get all saved reports for current user (search / filter / sort / page)
// @route   GET /api/reports
// @access  Private
export const getReports = async (req, res, next) => {
  try {
    // Incremental hub index (TTL-cached; only creates missing / refreshes stale cards)
    try {
      await ensureHubIndexIncremental(req.user._id);
    } catch (indexErr) {
      console.warn("[reports] hub index ensure failed:", indexErr.message);
    }

    const { reports, count, pagination } = await listReports(req.user._id, req.query);

    const payload = {
      success: true,
      count,
      data: reports.map((r) => attachUpdateAvailable(r)),
    };

    if (pagination) {
      payload.pagination = pagination;
    }

    res.json(payload);
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single saved report by ID (tracks view)
// @route   GET /api/reports/:id
// @access  Private
export const getReportById = async (req, res, next) => {
  try {
    const report = await getOwnedReport(req.params.id, req.user._id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found or unauthorized",
      });
    }

    await recordReportView(report);

    // Auto-upgrade older reports to latest dossier template (no manual regen required)
    try {
      await ensureReportDossier(report);
    } catch (dossierErr) {
      console.warn("[reports] dossier ensure failed:", dossierErr.message);
    }

    res.json({
      success: true,
      data: attachUpdateAvailable(serializeReportOwner(report)),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    One-click regenerate from linked profile analysis
// @route   POST /api/reports/:id/regenerate
// @access  Private
export const regenerateReport = async (req, res, next) => {
  try {
    const result = await regenerateReportFromSource(req.params.id, req.user._id);

    if (result.error === "not_found") {
      return res.status(404).json({
        success: false,
        message: "Report not found or unauthorized",
      });
    }
    if (result.error === "unsupported_type") {
      return res.status(400).json({
        success: false,
        message: "This report type cannot be regenerated from a political profile",
      });
    }
    if (result.error === "no_source") {
      return res.status(400).json({
        success: false,
        message: "No linked profile/account source found for regeneration",
      });
    }

    res.json({
      success: true,
      data: attachUpdateAvailable(serializeReportOwner(result.report)),
      build: result.build,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create / rotate public share link
// @route   POST /api/reports/:id/share
// @access  Private
export const shareReport = async (req, res, next) => {
  try {
    const report = await createShareLink(req.params.id, req.user._id, {
      visibility: req.body.visibility || "public",
      expiresInDays: req.body.expiresInDays,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found or unauthorized",
      });
    }

    const base =
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      (process.env.NODE_ENV === "development" ? "http://localhost:5173" : null) ||
      `${req.protocol}://${req.get("host")}`;

    res.json({
      success: true,
      data: {
        report: serializeReportOwner(report),
        shareToken: report.shareToken,
        shareUrl:
          report.shareToken && report.visibility !== "private"
            ? `${String(base).replace(/\/$/, "")}/shared/${report.shareToken}`
            : null,
        visibility: report.visibility,
        expiresAt: report.shareExpiresAt,
        isShared: Boolean(report.shareToken) && report.visibility !== "private" && !report.shareRevokedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke share link
// @route   DELETE /api/reports/:id/share
// @access  Private
export const revokeReportShare = async (req, res, next) => {
  try {
    const report = await revokeShareLink(req.params.id, req.user._id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found or unauthorized",
      });
    }

    res.json({
      success: true,
      message: "Share link revoked",
      data: serializeReportOwner(report),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Audit history for a report
// @route   GET /api/reports/:id/history
// @access  Private
export const getReportHistory = async (req, res, next) => {
  try {
    const logs = await getReportAuditHistory(req.params.id, req.user._id, {
      limit: parseInt(req.query.limit, 10) || 50,
    });

    if (!logs) {
      return res.status(404).json({
        success: false,
        message: "Report not found or unauthorized",
      });
    }

    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Public shared report (token-gated)
// @route   GET /api/shared/:token
// @access  Public
export const getSharedReport = async (req, res, next) => {
  try {
    const result = await getSharedReportByToken(req.params.token);

    if (result.error) {
      const messages = {
        invalid: "Invalid share link",
        not_found: "Shared report not found",
        revoked: "This share link has been revoked",
        private: "This report is no longer public",
        expired: "This share link has expired",
      };
      const status = result.error === "invalid" ? 400 : 404;
      return res.status(status).json({
        success: false,
        code: result.error,
        message: messages[result.error] || "Unable to open shared report",
      });
    }

    res.json({
      success: true,
      data: result.report,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Patch hub fields (favorite, pin, tags, status, etc.)
// @route   PATCH /api/reports/:id
// @access  Private
export const updateReport = async (req, res, next) => {
  try {
    const report = await patchReport(req.params.id, req.user._id, req.body);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found or unauthorized",
      });
    }

    res.json({
      success: true,
      data: serializeReport(report),
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Soft-archive (default) or hard-delete a report (?hard=true)
// @route   DELETE /api/reports/:id
// @access  Private
export const deleteReport = async (req, res, next) => {
  try {
    const hard =
      req.query.hard === "true" ||
      req.query.hard === "1" ||
      req.body?.hard === true;

    const report = await deleteOwnedReport(req.params.id, req.user._id, { hard });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found or unauthorized",
      });
    }

    res.json({
      success: true,
      softArchived: !hard,
      message: hard
        ? "Report permanently deleted"
        : "Report archived (recoverable via Archived filter)",
      data: hard ? undefined : serializeReport(report),
    });
  } catch (error) {
    next(error);
  }
};
