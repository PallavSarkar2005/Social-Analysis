import SavedReport from "../models/SavedReport.js";
import { logActivity } from "../utils/activityLogger.js";

// @desc    Save a report (AI insight, comparison, analysis)
// @route   POST /api/reports
// @access  Private
export const saveReport = async (req, res, next) => {
  try {
    const { title, type, source, content } = req.body;

    if (!title || !type || !source || !content) {
      return res.status(400).json({
        success: false,
        message: "Title, type, source, and content are required",
      });
    }

    const report = await SavedReport.create({
      userId: req.user._id,
      title,
      type,
      source,
      content,
    });

    await logActivity(
      req.user._id,
      "report_generation",
      `Saved report: "${title}" [Type: ${type}, Source: ${source}]`,
      req
    );

    res.status(201).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all saved reports for current user
// @route   GET /api/reports
// @access  Private
export const getReports = async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = { userId: req.user._id };
    
    if (type) {
      filter.type = type;
    }

    const reports = await SavedReport.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single saved report by ID
// @route   GET /api/reports/:id
// @access  Private
export const getReportById = async (req, res, next) => {
  try {
    const report = await SavedReport.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found or unauthorized",
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a saved report
// @route   DELETE /api/reports/:id
// @access  Private
export const deleteReport = async (req, res, next) => {
  try {
    const report = await SavedReport.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found or unauthorized",
      });
    }

    await logActivity(
      req.user._id,
      "report_deleted",
      `Deleted report: "${report.title}"`,
      req
    );

    res.json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
