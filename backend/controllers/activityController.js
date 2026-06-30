import ActivityLog from "../models/ActivityLog.js";

// @desc    Get user activity logs
// @route   GET /api/activity
// @access  Private
export const getActivityLogs = async (req, res, next) => {
  try {
    const logs = await ActivityLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log client side error
// @route   POST /api/activity/log
// @access  Private
export const logClientError = async (req, res, next) => {
  try {
    const { action, details } = req.body;
    
    await ActivityLog.create({
      userId: req.user ? req.user._id : null,
      action: action || "client_error",
      details: typeof details === "object" ? JSON.stringify(details) : details,
      ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
    });

    res.status(201).json({
      success: true,
      message: "Client error logged successfully",
    });
  } catch (error) {
    next(error);
  }
};
