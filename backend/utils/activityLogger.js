import ActivityLog from "../models/ActivityLog.js";

/**
 * Helper utility to log user activities
 * @param {string|ObjectId} userId - The user performing the action
 * @param {string} action - The action name (e.g., 'login', 'report_generation')
 * @param {string} details - Human readable metadata or details
 * @param {Object} req - The express request object (optional, for IP lookup)
 */
export const logActivity = async (userId, action, details = "", req = null) => {
  try {
    let ipAddress = "";
    if (req) {
      ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
      if (Array.isArray(ipAddress)) {
        ipAddress = ipAddress[0];
      }
      ipAddress = ipAddress.split(",")[0].trim();
    }

    await ActivityLog.create({
      userId,
      action,
      details,
      ipAddress,
    });
  } catch (err) {
    console.error(`[Activity Logger Error] Failed to log action '${action}':`, err.message);
  }
};
