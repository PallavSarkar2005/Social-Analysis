import crypto from "crypto";

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const generateSecureToken = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");
