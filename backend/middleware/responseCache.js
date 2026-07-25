/**
 * Short-lived response caching for idempotent GET analytics/list endpoints.
 * Uses memoryCache (Redis-ready). Skips authenticated mutations automatically.
 */

import { cacheGet, cacheSet } from "../utils/memoryCache.js";
import crypto from "crypto";

/**
 * @param {object} opts
 * @param {number} [opts.ttlMs=30000]
 * @param {(req) => string} [opts.keyFn]
 */
export function responseCache(opts = {}) {
  const ttlMs = opts.ttlMs ?? 30_000;
  const keyFn =
    opts.keyFn ||
    ((req) => {
      const uid = req.user?._id || req.user?.id || "anon";
      return `rc:${req.method}:${req.originalUrl}:u:${uid}`;
    });

  return (req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.headers["cache-control"]?.includes("no-cache")) return next();

    const key = keyFn(req);
    const hit = cacheGet(key);
    if (hit) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", `private, max-age=${Math.floor(ttlMs / 1000)}`);
      if (hit.etag) {
        res.setHeader("ETag", hit.etag);
        if (req.headers["if-none-match"] === hit.etag) {
          return res.status(304).end();
        }
      }
      return res.status(hit.status || 200).json(hit.body);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const etag = `"${crypto.createHash("sha1").update(JSON.stringify(body)).digest("hex").slice(0, 16)}"`;
      cacheSet(key, { body, status: res.statusCode || 200, etag }, ttlMs);
      res.setHeader("X-Cache", "MISS");
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", `private, max-age=${Math.floor(ttlMs / 1000)}`);
      return originalJson(body);
    };

    next();
  };
}
