/**
 * Career Timeline display-text sanitizer.
 * Cleans corrupted/API titles before render — does not change layout or design.
 */

const PERSON_NAME_RE =
  /^[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.']*){0,3}$/;

const CAREER_KEYWORDS_RE =
  /\b(Election|Assembly|Sabha|Vidhan|Lok|Rajya|MLA|MP|Joined|Won|Contested|Re-elected|Education|Minister|Party|Appointed|Became|Chief|Prime|Parliamentary|Parliament|Legislative|General)\b/i;

/** Collapse consecutive duplicate words: "Won Won Won Re" → "Won Re" */
export function collapseRepeatedWords(text = "") {
  let t = String(text || "").trim();
  if (!t) return "";
  // Repeat until stable (handles 3+ duplicates)
  let prev = "";
  while (prev !== t) {
    prev = t;
    t = t.replace(/\b([\w'’-]+)(?:\s+\1\b)+/gi, "$1");
  }
  return t.replace(/\s{2,}/g, " ").trim();
}

function looksLikePersonName(text = "") {
  const t = String(text || "").trim();
  if (!t || t.length < 3) return false;
  if (CAREER_KEYWORDS_RE.test(t)) return false;
  return PERSON_NAME_RE.test(t);
}

function normalizeWhitespace(text = "") {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*([,.;:])\s*/g, "$1 ")
    .replace(/\s+([.!?])/g, "$1")
    .trim();
}

/**
 * Professionalize election / career milestone titles for display.
 */
export function polishTimelineTitle(rawTitle = "", { category = "", result = "" } = {}) {
  let t = normalizeWhitespace(rawTitle);
  if (!t) return "";

  t = collapseRepeatedWords(t);

  // Strip orphan tenure leftovers
  t = t
    .replace(/\(\s*[–\-—]+\s*(?:present|now)?\s*\)/gi, "")
    .replace(/\(\s*present\s*\)/gi, "")
    .trim();

  // Person-name-only titles are not valid career event labels
  if (looksLikePersonName(t)) {
    if (category === "election" || /party:|constituency:/i.test(String(result))) {
      if (String(result).toLowerCase() === "lost") return "Contested Election";
      return "Won Election";
    }
    return "";
  }

  // Repair mangled election fragments
  if (/^(won\s+){2,}/i.test(t)) {
    t = t.replace(/^(won\s+)+/i, "Won ");
  }
  if (/^won\s+re(?:-?election)?$/i.test(t) || /^won\s+re$/i.test(t)) {
    t = "Won Re-election";
  }
  if (/^contested\s+re$/i.test(t)) {
    t = "Contested Re-election";
  }
  if (/^won\s+parliamentary$/i.test(t)) {
    t = "Won Parliamentary Election";
  }
  if (/^won\s+assembly$/i.test(t)) {
    t = "Won Assembly Election";
  }
  if (/^won\s+general$/i.test(t)) {
    t = "Won General Election";
  }
  if (/^won\s+lok\s+sabha$/i.test(t)) {
    t = "Won the Indian Lok Sabha Election";
  }
  if (/^won\s+rajya\s+sabha$/i.test(t)) {
    t = "Won Rajya Sabha Election";
  }

  // "Won India Lok Sabha Election" → "Won the Indian Lok Sabha Election"
  t = t.replace(/\bWon\s+India\s+Lok\s+Sabha\b/i, "Won the Indian Lok Sabha");
  t = t.replace(/\bWon\s+Indian\s+Lok\s+Sabha\b/i, "Won the Indian Lok Sabha");
  t = t.replace(/\bWon\s+the\s+Indian\s+Lok\s+Sabha(?!\s+Election)\b/i, "Won the Indian Lok Sabha Election");

  // "Re-elected MP/MLA" → fuller professional phrasing
  t = t.replace(/^Re-elected\s+MP$/i, "Re-elected as Member of Parliament");
  t = t.replace(/^Re-elected\s+MLA$/i, "Re-elected as MLA");
  t = t.replace(/^Re-elected\s+as\s+MP$/i, "Re-elected as Member of Parliament");

  // Incomplete "… Election" endings after cleanup
  if (/^Won\s+.+/i.test(t) && !/\belection\b/i.test(t) && !/\bre-election\b/i.test(t)) {
    if (/\b(parliamentary|assembly|lok sabha|rajya sabha|vidhan sabha|legislative)\b/i.test(t)) {
      t = `${t} Election`.replace(/\belection\s+election\b/gi, "Election");
    }
  }

  // Collapse leftover duplicate phrases
  t = collapseRepeatedWords(t);
  t = t
    .replace(/\belection\s+election\b/gi, "Election")
    .replace(/\bwon\s+won\b/gi, "Won")
    .replace(/\bthe\s+the\b/gi, "the")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Title Case light touch for all-lowercase junk (keep existing intentional casing)
  if (t === t.toLowerCase() && t.length > 2) {
    t = t.replace(/\b([a-z])/g, (m) => m.toUpperCase());
  }

  return t;
}

/**
 * Clean description lines (Party / Constituency blocks, spacing, repeats).
 */
export function polishTimelineDescription(rawDescription = "", eventYear = null) {
  let d = normalizeWhitespace(rawDescription);
  if (!d) return "";

  d = collapseRepeatedWords(d);

  d = d.replace(/\bParty:\s*([^·|\n]+)/gi, (_, rawParty) => {
    let p = String(rawParty || "").trim();
    const tenureMatch = p.match(
      /\(\s*(?:since\s+)?(\d{4})?\s*[–\-—to]{1,3}\s*(?:present|now|\d{4})?\s*\)|\(\s*since\s+(\d{4})\s*\)/i
    );
    const tenureStart = tenureMatch
      ? Number(tenureMatch[1] || tenureMatch[2] || NaN)
      : NaN;
    p = p
      .replace(/\(\s*(?:since\s+)?\d{0,4}\s*[–\-—to]{1,3}\s*(?:present|now|\d{4})?\s*\)/gi, "")
      .replace(/\(\s*since\s+\d{4}\s*\)/gi, "")
      .replace(/\(\s*[–\-—]+\s*(?:present|now)?\s*\)/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    const y =
      eventYear != null ? Number(String(eventYear).replace(/[^\d]/g, "").slice(0, 4)) : NaN;
    if (Number.isFinite(y) && Number.isFinite(tenureStart) && y < tenureStart) return "";
    return p ? `Party: ${p}` : "";
  });

  d = d
    .replace(/\(\s*[–\-—]+\s*(?:present|now)?\s*\)/gi, "")
    .replace(/\s*·\s*·+/g, " · ")
    .replace(/^\s*·\s*/g, "")
    .replace(/\s*·\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return d;
}

/**
 * Prepare a timeline event for display: polished title/description + validity.
 */
export function sanitizeTimelineEventForDisplay(event) {
  if (!event) return null;
  if (event.category === "birth") return null;

  const year = String(event.year ?? event.election?.year ?? "").trim();
  const result = event.election?.result || "";
  const title = polishTimelineTitle(event.title || event.election?.type || "", {
    category: event.category,
    result,
  });

  if (!year && !title) return null;
  if (/^birth$/i.test(title)) return null;
  if (!title) return null;

  // Drop residual mangled titles that could not be repaired
  if (/^(won\s+){2,}/i.test(title) || /^won\s+re$/i.test(title)) return null;
  if (looksLikePersonName(title)) return null;

  const description = polishTimelineDescription(event.description || "", year);
  // election.type is a type key — strip any accidental "Won" display prefixes.
  // Never run it through polishTimelineTitle (that produces display sentences).
  const rawType = String(event.election?.type || "")
    .replace(/^(won\s+)+/i, "")
    .replace(/^(contested\s+)+/i, "")
    .trim();
  const election = event.election
    ? {
        ...event.election,
        type: rawType || "Election",
        party: polishTimelineDescription(
          event.election.party ? `Party: ${event.election.party}` : "",
          year
        ).replace(/^Party:\s*/i, "") || null,
      }
    : null;

  return {
    ...event,
    year,
    title,
    description,
    election,
  };
}

/** Deduplicate by year + normalized title (keeps first / richer description). */
export function dedupeTimelineEvents(events = []) {
  const seen = new Map();
  for (const event of events) {
    if (!event) continue;
    const key = `${String(event.year || "").trim()}|${String(event.title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()}`;
    if (!key.replace("|", "")) continue;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, event);
      continue;
    }
    // Prefer the entry with more description / election detail
    const score = (e) =>
      String(e.description || "").length +
      (e.election?.constituency ? 20 : 0) +
      (e.election?.party ? 10 : 0) +
      (e.source ? 5 : 0);
    if (score(event) > score(existing)) seen.set(key, event);
  }
  return [...seen.values()];
}
