/**
 * Must be the first import in server.js.
 * ESM hoists imports before module body, so dotenv + crypto shim live here.
 */
import dotenv from "dotenv";

dotenv.config();

console.log(`[PRELOAD] NODE_ENV=${process.env.NODE_ENV || "unset"}`);

import nodeCrypto from "node:crypto";
import Module from "node:module";

const originalRequire = Module.prototype.require;

Module.prototype.require = function patchedRequire(id) {
  if (id === "crypto" || id === "node:crypto") {
    return nodeCrypto;
  }
  return originalRequire.apply(this, arguments);
};
