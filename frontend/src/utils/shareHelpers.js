/**
 * Clipboard + share helpers for Intelligence Hub (no UI redesign).
 */

export async function copyTextToClipboard(text) {
  if (!text) throw new Error("Nothing to copy");

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }

  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  if (!ok) throw new Error("Clipboard unavailable");
  return true;
}

/**
 * Build a share URL for preview when backend already returned shareToken.
 */
export function buildClientShareUrl(token) {
  if (!token) return null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/shared/${token}`;
}
