/**
 * Shared image URL resolution for SafeImage, LeaderAvatar, and reports.
 * Unescapes XSS-mangled entities and resolves relative backend paths.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/** Default high-quality avatar when all sources fail */
export const FALLBACK_AVATAR =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1e1f2a"/>
          <stop offset="100%" stop-color="#111319"/>
        </linearGradient>
      </defs>
      <rect width="128" height="128" fill="url(#g)"/>
      <circle cx="64" cy="48" r="22" fill="#475569"/>
      <ellipse cx="64" cy="108" rx="36" ry="28" fill="#475569"/>
    </svg>`
  );

/** Neutral media placeholder (video / cover) */
export const FALLBACK_MEDIA =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#15161c"/>
          <stop offset="100%" stop-color="#0d0e14"/>
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#g)"/>
      <rect x="280" y="140" width="80" height="80" rx="12" fill="#334155" opacity="0.5"/>
      <polygon points="308,160 308,200 348,180" fill="#94a3b8"/>
    </svg>`
  );

/**
 * @param {string|null|undefined} url
 * @param {number|string} [version] cache-buster
 * @returns {string}
 */
export function resolveImageUrl(url, version) {
  if (!url || typeof url !== "string" || url.trim() === "") return "";

  let clean = url
    .replace(/&#x2F;/g, "/")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();

  if (
    !clean.startsWith("http://") &&
    !clean.startsWith("https://") &&
    !clean.startsWith("data:") &&
    !clean.startsWith("blob:")
  ) {
    // Only backend-served paths need the API host. Frontend public assets
    // (e.g. /BJPLogo.jpg) must stay origin-relative for Vite/production static hosting.
    if (
      clean.startsWith("/uploads/") ||
      clean.startsWith("/uploads") ||
      clean.startsWith("/api/") ||
      clean.startsWith("/media/")
    ) {
      clean = `${API_BASE}${clean}`;
    } else if (!clean.startsWith("/")) {
      clean = `${API_BASE}/${clean}`;
    }
  }

  if (version != null && version !== "" && !clean.startsWith("data:")) {
    const sep = clean.includes("?") ? "&" : "?";
    clean = `${clean}${sep}v=${version}`;
  }

  return clean;
}

/**
 * Prefer smaller YouTube / CDN variants when a full URL is known.
 * @param {string} url
 * @param {"thumb"|"medium"|"full"} size
 */
export function optimizeImageUrl(url, size = "medium") {
  if (!url || typeof url !== "string") return url;
  // YouTube: mqdefault / hqdefault / maxresdefault
  if (url.includes("ytimg.com") || url.includes("ggpht.com")) {
    if (size === "thumb") {
      return url
        .replace(/\/(maxres|hq|sd)default\./, "/mqdefault.")
        .replace(/=s\d+-/, "=s88-");
    }
    if (size === "medium") {
      return url
        .replace(/\/maxresdefault\./, "/hqdefault.")
        .replace(/=s\d+-/, "=s240-");
    }
  }
  // Unsplash / Wikimedia: append width hints when query params exist
  if (url.includes("images.unsplash.com") && size !== "full") {
    const w = size === "thumb" ? 80 : 240;
    if (url.includes("w=")) return url.replace(/([?&])w=\d+/, `$1w=${w}`);
    return `${url}${url.includes("?") ? "&" : "?"}w=${w}&q=80&auto=format`;
  }
  if (url.includes("upload.wikimedia.org") && size === "thumb") {
    // Commons often supports /thumb/ paths; leave as-is if not standard
    return url;
  }
  return url;
}

/** In-memory success cache so remounts skip retry storms */
const successCache = new Map();
const FAIL_TTL_MS = 60_000;

export function markImageSuccess(url) {
  if (url) successCache.set(url, { ok: true, at: Date.now() });
}

export function markImageFailure(url) {
  if (url) successCache.set(url, { ok: false, at: Date.now() });
}

export function wasImageRecentlyFailed(url) {
  const entry = successCache.get(url);
  if (!entry || entry.ok) return false;
  if (Date.now() - entry.at > FAIL_TTL_MS) {
    successCache.delete(url);
    return false;
  }
  return true;
}
