import ActivityLog from "../models/ActivityLog.js";

/**
 * Helper to log security audit trails (e.g., failed logins, rate limits, token violations)
 * @param {Object} params
 * @param {string|ObjectId} [params.userId] - User ID if authenticated
 * @param {string} params.action - Security action identifier
 * @param {string} params.details - Descriptive event message
 * @param {string} [params.ipAddress] - Request IP
 * @param {string} [params.email] - Targeted login email
 */
export const logSecurityEvent = async ({
  userId = null,
  action,
  details,
  ipAddress = "0.0.0.0",
  email = null,
}) => {
  const timestamp = new Date().toISOString();
  const emailTag = email ? ` [Target: ${email}]` : "";
  const logMessage = `[SECURITY WARNING] [${timestamp}] [Action: ${action}] [IP: ${ipAddress}]${emailTag} - ${details}`;

  // Log to stdout/stderr so DevSecOps monitors can flag anomalous behaviors
  console.warn(logMessage);

  try {
    await ActivityLog.create({
      userId: userId || null,
      action: `security_${action}`,
      details: email ? `[Email Target: ${email}] ${details}` : details,
      ipAddress,
    });
  } catch (err) {
    console.error(`[Security Logger DB Fail] Failed to record security event:`, err.message);
  }
};
