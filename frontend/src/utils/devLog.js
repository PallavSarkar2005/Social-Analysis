export function devError(...args) {
  if (import.meta.env.DEV) console.error(...args);
}

export function devWarn(...args) {
  if (import.meta.env.DEV) console.warn(...args);
}
