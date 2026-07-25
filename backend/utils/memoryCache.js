/**
 * Redis-ready in-memory TTL cache.
 * Swap `store` for Redis client methods without changing call sites.
 */

const store = new Map();

const DEFAULT_TTL_MS = 60_000;

function now() {
  return Date.now();
}

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key, value, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, {
    value,
    expiresAt: ttlMs > 0 ? now() + ttlMs : 0,
  });
  return value;
}

export function cacheDel(key) {
  store.delete(key);
}

export function cacheDelPrefix(prefix) {
  for (const key of store.keys()) {
    if (String(key).startsWith(prefix)) store.delete(key);
  }
}

export function cacheClear() {
  store.clear();
}

/**
 * Get-or-compute helper with stampede protection per key.
 */
const inflight = new Map();

export async function cacheWrap(key, fn, ttlMs = DEFAULT_TTL_MS) {
  const hit = cacheGet(key);
  if (hit !== null && hit !== undefined) return hit;

  if (inflight.has(key)) return inflight.get(key);

  const promise = Promise.resolve()
    .then(fn)
    .then((value) => {
      cacheSet(key, value, ttlMs);
      inflight.delete(key);
      return value;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}

/** Periodic prune — call once at boot */
export function startCacheJanitor(intervalMs = 120_000) {
  const id = setInterval(() => {
    const t = now();
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt && entry.expiresAt < t) store.delete(key);
    }
  }, intervalMs);
  if (typeof id.unref === "function") id.unref();
  return () => clearInterval(id);
}
