import Notification from "../models/Notification.js";

/**
 * Utility helper to create notification records for a user
 * @param {string|ObjectId} userId - The target user ID
 * @param {string} title - Notification title
 * @param {string} message - Notification content body
 * @param {string} type - Notification category type ('info', 'spike', 'milestone', 'ai_insight')
 */
export const createNotification = async (userId, title, message, type = "info") => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
    });
    console.log(`[Notifier] Notification '${title}' pushed to user ${userId}`);
    return notification;
  } catch (err) {
    console.error(`[Notifier Error] Failed to generate notification:`, err.message);
    return null;
  }
};
