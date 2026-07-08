/**
 * Helper to log security events (e.g., failed logins, rate limits, token violations)
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
  const userTag = userId ? ` [User: ${userId}]` : "";
  const logMessage = `[SECURITY WARNING] [${timestamp}] [Action: ${action}] [IP: ${ipAddress}]${userTag}${emailTag} - ${details}`;

  console.warn(logMessage);
};
