import nodeCrypto from "node:crypto";

export const hashToken = (token) =>
  nodeCrypto.createHash("sha256").update(token).digest("hex");

export const generateSecureToken = (bytes = 32) =>
  nodeCrypto.randomBytes(bytes).toString("hex");
