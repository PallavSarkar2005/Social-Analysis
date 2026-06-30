import React, { useState, useEffect } from "react";
import { User } from "lucide-react";

// API base URL — images uploaded to the backend are stored at /uploads/
// and must be served from the backend origin, not the frontend origin.
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Resolves a potentially relative image URL to an absolute URL.
 * Also unescapes HTML entities that the old XSS sanitizer may have injected
 * into stored URLs (e.g. &#x2F; → / , &amp; → &).
 * Handles: /uploads/... → http://localhost:5000/uploads/...
 * Passes through: https://... and http://... unchanged.
 *
 * @param {string} url  - The raw URL from the database
 * @param {number} [v]  - Optional version/timestamp for cache-busting uploaded images
 */
const resolveImgUrl = (url, v) => {
  if (!url || typeof url !== "string" || url.trim() === "") return "";

  // Unescape XSS-encoded entities from previously stored (mangled) data
  let clean = url
    .replace(/&#x2F;/g, "/")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

  // Resolve relative /uploads/ paths to the full backend origin
  if (!clean.startsWith("http://") && !clean.startsWith("https://") && !clean.startsWith("data:")) {
    if (clean.startsWith("/")) clean = `${API_BASE}${clean}`;
  }

  // Append cache-buster for /uploads/ images (user-uploaded files)
  // This forces the browser to bypass its disk cache when the image is replaced
  if (v && clean.includes("/uploads/")) {
    clean = `${clean}?v=${v}`;
  }

  return clean;
};

/**
 * LeaderAvatar — Production-grade creator avatar component.
 *
 * Image Priority Order (auto-fallback on error):
 *   1. uploadedImage  (user-uploaded, highest priority)
 *   2. profileImage   (active resolved profile image from DB)
 *   3. resolvedImage  (official public image e.g. Wikimedia Commons)
 *   4. thumbnail      (YouTube channel thumbnail)
 *   5. Default silhouette placeholder
 *
 * Handles broken URLs gracefully by sequentially trying the next source
 * without breaking the layout or showing empty space.
 */
export default function LeaderAvatar({ creator, size = 48, className = "" }) {
  // Build a deduplicated, filtered list of image sources in priority order
  const buildSources = (c) => {
    const v = c?.imageUpdatedAt; // cache-buster version timestamp
    const candidates = [
      c?.uploadedImage,
      c?.profileImage,
      c?.resolvedImage,
      c?.thumbnail,
    ];
    // Resolve, add cache-buster for uploads, deduplicate, filter empty
    const seen = new Set();
    return candidates
      .map((url) => resolveImgUrl(url, v))
      .filter((url) => {
        if (!url || typeof url !== "string" || url.trim() === "") return false;
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
      });
  };

  const [sources, setSources] = useState(() => buildSources(creator));
  const [srcIndex, setSrcIndex] = useState(0);

  // Rebuild source list when creator image props change (including imageUpdatedAt cache-buster)
  useEffect(() => {
    const newSources = buildSources(creator);
    setSources(newSources);
    setSrcIndex(0);
  }, [
    creator?.uploadedImage,
    creator?.profileImage,
    creator?.resolvedImage,
    creator?.thumbnail,
    creator?.imageUpdatedAt, // ensures re-render when same URL is updated (cache-buster changes)
  ]);

  const activeSrc = sources[srcIndex];
  const hasSrc = activeSrc && srcIndex < sources.length;

  const handleImgError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex((prev) => prev + 1);
    } else {
      // All sources exhausted — show default silhouette
      setSrcIndex(sources.length);
    }
  };

  const isNumber = typeof size === "number";
  const style = isNumber ? { width: size, height: size } : {};
  const sizeClass = isNumber ? "" : size;

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-slate-900 border border-white/[0.08] flex-shrink-0 flex items-center justify-center select-none ${sizeClass} ${className}`}
      style={style}
    >
      {hasSrc ? (
        <img
          src={activeSrc}
          alt={creator?.name || "Leader"}
          className="w-full h-full object-cover transition-opacity duration-300"
          loading="lazy"
          onError={handleImgError}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-500 bg-white/[0.01] absolute inset-0">
          <User className="text-slate-600 w-1/2 h-1/2" />
        </div>
      )}

      {/* Always-present fallback silhouette for onError to reveal */}
      {hasSrc && (
        <div
          className="hidden w-full h-full items-center justify-center text-slate-500 bg-white/[0.01] absolute inset-0"
          aria-hidden="true"
        >
          <User className="text-slate-600 w-1/2 h-1/2" />
        </div>
      )}
    </div>
  );
}
