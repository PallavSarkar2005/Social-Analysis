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
