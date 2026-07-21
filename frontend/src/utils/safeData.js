/**
 * Safe data accessors — prevent runtime crashes from missing API / Mongo fields.
 * Reuse across pages instead of duplicating guards.
 */

/** @returns {Array} */
export const asArray = (value) => (Array.isArray(value) ? value : []);

/** @returns {Record<string, unknown>} */
export const asObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

/** @returns {number} */
export const asNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Coerce any API / Mongo value to a React-safe string.
 * Prevents "Objects are not valid as a React child" for evidence objects
 * shaped like { type, label, detail, source }, arrays, dates, etc.
 *
 * @returns {string}
 */
export const safeText = (value) => {
  if (value == null || value === "") return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    try {
      return value.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return value.toISOString();
    }
  }
  if (Array.isArray(value)) {
    return value.map(safeText).filter(Boolean).join("; ");
  }
  if (typeof value === "object") {
    if (Array.isArray(value.list)) return safeText(value.list);
    const label = value.label || value.summary || value.name || value.headline || "";
    const detail = value.detail || value.description || value.body || value.value || "";
    const source = value.source || "";
    const parts = [label, detail].filter((p) => p != null && String(p).trim());
    if (source) parts.push(`(${safeText(source)})`);
    if (parts.length) return parts.map(safeText).join(" — ");
    try {
      return Object.values(value)
        .filter((v) => typeof v === "string" || typeof v === "number")
        .join(" · ");
    } catch {
      return "";
    }
  }
  return String(value);
};

/** @returns {string} */
export const formatLocaleNumber = (value, fallback = "0") => {
  const n = asNumber(value);
  try {
    return n.toLocaleString();
  } catch {
    return fallback;
  }
};

/**
 * @param {{ lastWeek?: { value?: number, percentage?: number }, lastMonth?: { value?: number, percentage?: number } } | null | undefined} growth
 */
export const hasGrowthMetrics = (growth) =>
  Boolean(growth?.lastWeek || growth?.lastMonth);

/**
 * @param {{ value?: number, percentage?: number } | null | undefined} period
 */
export const formatGrowthPeriod = (period, label) => {
  if (!period || typeof period.value !== "number") return null;
  const value = period.value;
  const pct = asNumber(period.percentage, 0);
  const sign = value >= 0 ? "+" : "";
  return {
    label,
    text: `${sign}${formatLocaleNumber(value)} (${pct}%)`,
    positive: value >= 0,
  };
};
