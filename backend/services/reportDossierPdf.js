import PDFDocument from "pdfkit";
import https from "https";
import http from "http";
import { resolveNewsDisplayLink } from "../utils/newsArticleUrl.js";
import { cleanTimelineTitle } from "./politicalTimelineService.js";

const PAGE = { width: 595.28, height: 841.89, margin: 42 };
const CONTENT_BOTTOM = PAGE.height - 48; // leave room for footer
const HEADER_H = 26;
const COLORS = {
  ink: "#0f172a",
  muted: "#475569",
  faint: "#94a3b8",
  line: "#e2e8f0",
  brand: "#4f46e5",
  brandDark: "#111319",
  surface: "#f1f5f9",
  link: "#1d4ed8",
};

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(d);
  }
}

function contentWidth() {
  return PAGE.width - PAGE.margin * 2;
}

/** Page break only when needed — never draw footers mid-stream. */
function ensureSpace(doc, needed = 36) {
  if (doc.y + needed <= CONTENT_BOTTOM) return;
  doc.addPage();
  drawHeader(doc);
  doc.y = PAGE.margin + HEADER_H + 8;
}

function drawHeader(doc) {
  doc.save();
  doc.fillColor(COLORS.brandDark).rect(0, 0, PAGE.width, HEADER_H).fill();
  doc
    .fillColor("#ffffff")
    .fontSize(7.5)
    .font("Helvetica-Bold")
    .text("SOCIAL IQ  ·  POLITICAL INTELLIGENCE REPORT", PAGE.margin, 9, {
      width: contentWidth(),
      align: "left",
      lineBreak: false,
    });
  doc.restore();
}

/** Call once after all content — numbers every page. */
function drawFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.save();
    doc
      .strokeColor(COLORS.line)
      .lineWidth(0.5)
      .moveTo(PAGE.margin, PAGE.height - 36)
      .lineTo(PAGE.width - PAGE.margin, PAGE.height - 36)
      .stroke();
    doc
      .fillColor(COLORS.faint)
      .fontSize(7)
      .font("Helvetica")
      .text("Confidential — Social IQ Intelligence Hub", PAGE.margin, PAGE.height - 28, {
        width: 280,
        lineBreak: false,
      });
    doc.text(`Page ${i + 1} of ${range.count}`, PAGE.width - PAGE.margin - 90, PAGE.height - 28, {
      width: 90,
      align: "right",
      lineBreak: false,
    });
    doc.restore();
  }
}

function sectionTitle(doc, title) {
  ensureSpace(doc, 28);
  const y = doc.y + 4;
  doc
    .fillColor(COLORS.brand)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(title.toUpperCase(), PAGE.margin, y, { characterSpacing: 0.4 });
  const after = doc.y + 2;
  doc
    .strokeColor(COLORS.brand)
    .lineWidth(1)
    .moveTo(PAGE.margin, after)
    .lineTo(PAGE.margin + 72, after)
    .stroke();
  doc.y = after + 8;
  doc.fillColor(COLORS.ink);
}

function bodyText(doc, text, { size = 9, gap = 0.25 } = {}) {
  if (!text) return;
  const str = String(text).trim();
  if (!str) return;
  ensureSpace(doc, 20);
  doc
    .fillColor(COLORS.muted)
    .fontSize(size)
    .font("Helvetica")
    .text(str, PAGE.margin, doc.y, {
      width: contentWidth(),
      align: "left",
      lineGap: 1.5,
    });
  doc.moveDown(gap);
}

function fetchImageBuffer(url, timeoutMs = 2500) {
  return new Promise((resolve) => {
    if (!url || !/^https?:\/\//i.test(url)) {
      resolve(null);
      return;
    }
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchImageBuffer(res.headers.location, timeoutMs).then(resolve);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        resolve(null);
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", () => resolve(null));
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Compact masthead on page 1 (not a full blank cover page).
 */
function renderCoverBand(doc, cover, photoBuf) {
  drawHeader(doc);
  let y = PAGE.margin + HEADER_H + 10;

  doc
    .fillColor(COLORS.brand)
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("SOCIAL IQ", PAGE.margin, y, { lineBreak: false });
  doc
    .fillColor(COLORS.faint)
    .fontSize(7)
    .font("Helvetica")
    .text("  ·  ENTERPRISE POLITICAL INTELLIGENCE", PAGE.margin + 52, y, {
      lineBreak: false,
    });
  y += 14;

  const textLeft = photoBuf ? PAGE.margin + 78 : PAGE.margin;
  const textW = contentWidth() - (photoBuf ? 78 : 0);
  const contentStartY = y;

  if (photoBuf) {
    try {
      doc.image(photoBuf, PAGE.margin, contentStartY, { width: 64, height: 64, fit: [64, 64] });
    } catch {
      // ignore bad image bytes
    }
  }

  const headline =
    cover.politicianName || cover.title || "Intelligence Report";

  doc
    .fillColor(COLORS.ink)
    .fontSize(16)
    .font("Helvetica-Bold")
    .text(headline, textLeft, contentStartY, { width: textW });
  y = doc.y + 3;

  doc
    .fillColor(COLORS.muted)
    .fontSize(9)
    .font("Helvetica")
    .text(cover.documentType || "Political Intelligence Report", textLeft, y, {
      width: textW,
    });
  y = doc.y + 4;

  if (cover.reportTypeLabel) {
    doc
      .fillColor(COLORS.brand)
      .fontSize(7.5)
      .font("Helvetica-Bold")
      .text(String(cover.reportTypeLabel).toUpperCase(), textLeft, y, {
        width: textW,
        characterSpacing: 0.6,
      });
    y = doc.y + 4;
  }

  const meta = [
    cover.currentPosition,
    [cover.party, cover.state].filter(Boolean).join(" · "),
    cover.confidence != null ? `Confidence ${cover.confidence}%` : null,
    `Generated ${formatDate(cover.generatedAt)}`,
    cover.reportVersion ? `Report v${cover.reportVersion}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  doc
    .fillColor(COLORS.muted)
    .fontSize(8)
    .font("Helvetica")
    .text(meta, textLeft, y, { width: textW });

  const bandBottom = Math.max(doc.y, photoBuf ? contentStartY + 64 : doc.y) + 8;
  doc
    .strokeColor(COLORS.line)
    .lineWidth(0.75)
    .moveTo(PAGE.margin, bandBottom)
    .lineTo(PAGE.width - PAGE.margin, bandBottom)
    .stroke();
  doc.y = bandBottom + 10;
}

function renderKeyValueTable(doc, fields) {
  const labelW = 130;
  const valueW = contentWidth() - labelW - 8;
  for (const f of fields || []) {
    if (f?.value == null || String(f.value).trim() === "") continue;
    ensureSpace(doc, 14);
    const y = doc.y;
    doc
      .fillColor(COLORS.faint)
      .fontSize(8)
      .font("Helvetica")
      .text(String(f.label), PAGE.margin, y, { width: labelW, lineBreak: false });
    doc
      .fillColor(COLORS.ink)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text(String(f.value), PAGE.margin + labelW + 8, y, { width: valueW });
    doc.y = Math.max(doc.y, y + 11);
  }
}

function renderTimeline(doc, events) {
  for (const e of events || []) {
    ensureSpace(doc, 28);
    const y = doc.y;
    // Clean legacy hub titles (e.g. "Won Won Re") left in older dossier snapshots
    const title = cleanTimelineTitle(String(e.title || "").trim(), e.year);
    let description = String(e.description || "").trim();
    if (
      description &&
      (description.toLowerCase() === title.toLowerCase() ||
        title.toLowerCase().includes(description.toLowerCase()))
    ) {
      description = "";
    }

    doc.fillColor(COLORS.brand).circle(PAGE.margin + 3, y + 3, 2.5).fill();
    doc
      .fillColor(COLORS.brand)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text(String(e.year || ""), PAGE.margin + 12, y, { width: 48, lineBreak: false });
    doc
      .fillColor(COLORS.ink)
      .fontSize(8.5)
      .font("Helvetica-Bold")
      .text(title, PAGE.margin + 64, y, { width: contentWidth() - 64 });
    if (description) {
      doc
        .fillColor(COLORS.muted)
        .fontSize(7.5)
        .font("Helvetica")
        .text(description.slice(0, 280), PAGE.margin + 64, doc.y + 1, {
          width: contentWidth() - 64,
        });
    }
    doc.y = doc.y + 6;
  }
}

function renderElectionTable(doc, rows) {
  const cols = [
    { key: "election", label: "Election", w: 88 },
    { key: "constituency", label: "Constituency", w: 88 },
    { key: "party", label: "Party", w: 48 },
    { key: "result", label: "Result", w: 48 },
    { key: "votes", label: "Votes", w: 48 },
    { key: "votePct", label: "%", w: 36 },
    { key: "margin", label: "Margin", w: 44 },
  ];
  const tableW = cols.reduce((s, c) => s + c.w, 0);

  ensureSpace(doc, 24);
  let x = PAGE.margin;
  const headerY = doc.y;
  doc.fillColor(COLORS.brandDark).rect(PAGE.margin, headerY, tableW, 14).fill();
  doc.fillColor("#ffffff").fontSize(6.5).font("Helvetica-Bold");
  for (const c of cols) {
    doc.text(c.label, x + 2, headerY + 3, { width: c.w - 4, lineBreak: false });
    x += c.w;
  }
  doc.y = headerY + 15;

  for (let idx = 0; idx < Math.min(rows.length, 40); idx++) {
    ensureSpace(doc, 13);
    const row = rows[idx];
    const y = doc.y;
    if (idx % 2 === 1) {
      doc.fillColor(COLORS.surface).rect(PAGE.margin, y, tableW, 12).fill();
    }
    let cx = PAGE.margin;
    doc.fillColor(COLORS.ink).fontSize(6.5).font("Helvetica");
    for (const c of cols) {
      const val = row[c.key] == null ? "" : String(row[c.key]);
      doc.text(val.slice(0, 32), cx + 2, y + 2, { width: c.w - 4, lineBreak: false, ellipsis: true });
      cx += c.w;
    }
    doc.y = y + 12;
  }
  doc.y += 6;
}

function renderInfluence(doc, section) {
  for (const m of section.metrics || []) {
    ensureSpace(doc, 22);
    const y = doc.y;
    doc
      .fillColor(COLORS.ink)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text(`${m.label}`, PAGE.margin, y, { width: contentWidth() - 36, continued: false });
    doc
      .fillColor(COLORS.brand)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text(String(m.value), PAGE.width - PAGE.margin - 28, y, { width: 28, align: "right" });
    const barY = doc.y + 2;
    const pct = Math.max(0, Math.min(100, Number(m.value) || 0)) / 100;
    doc.fillColor(COLORS.line).rect(PAGE.margin, barY, contentWidth(), 5).fill();
    doc.fillColor(COLORS.brand).rect(PAGE.margin, barY, contentWidth() * pct, 5).fill();
    doc.y = barY + 8;
    if (m.explanation) {
      doc
        .fillColor(COLORS.faint)
        .fontSize(7)
        .font("Helvetica")
        .text(String(m.explanation).slice(0, 160), PAGE.margin, doc.y, { width: contentWidth() });
    }
    doc.y += 4;
  }
  if (section.explanation) bodyText(doc, section.explanation, { size: 8, gap: 0.2 });
  if (section.calculatedAt) {
    doc
      .fillColor(COLORS.faint)
      .fontSize(7)
      .font("Helvetica")
      .text(`Calculated: ${formatDate(section.calculatedAt)}`);
  }
}

function renderGeo(doc, section) {
  const rows = [
    section.primaryRegion && { label: "Primary Region", value: section.primaryRegion },
    section.secondaryRegions?.length && {
      label: "Secondary Regions",
      value: section.secondaryRegions.join(", "),
    },
    section.emergingRegions?.length && {
      label: "Emerging Regions",
      value: section.emergingRegions.join(", "),
    },
    section.verifiedCoverage != null && {
      label: "Verified Coverage",
      value: String(section.verifiedCoverage),
    },
  ].filter(Boolean);

  if (rows.length) renderKeyValueTable(doc, rows);

  const tiers = section.influenceTiers?.length
    ? section.influenceTiers
    : (section.states || [])
        .filter((s) => s.tier)
        .slice(0, 12)
        .map((s) => ({ state: s.state, tier: s.tier, influence: s.influence }));

  if (tiers.length) {
    ensureSpace(doc, 16);
    doc.fillColor(COLORS.ink).fontSize(8).font("Helvetica-Bold").text("Influence Tiers");
    for (const t of tiers) {
      ensureSpace(doc, 12);
      doc
        .fillColor(COLORS.muted)
        .fontSize(8)
        .font("Helvetica")
        .text(
          `${t.state}${t.tier ? ` · ${String(t.tier)}` : ""}${
            t.influence != null ? ` · ${t.influence}` : ""
          }`,
          { width: contentWidth() }
        );
    }
  }
}

function renderNews(doc, section) {
  for (const n of (section.items || []).slice(0, 15)) {
    ensureSpace(doc, 36);
    const headline = String(n.headline || "").trim();
    if (!headline) continue;

    // Same rule as website: any stored HTTPS article URL becomes a real PDF hyperlink.
    // Never invent URLs — only embed what is already on the news item.
    const articleUrl = resolveNewsDisplayLink(n);

    const startX = PAGE.margin;
    const startY = doc.y;
    const width = contentWidth();

    if (articleUrl) {
      doc
        .fillColor(COLORS.link)
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .text(headline, startX, startY, {
          width,
          link: articleUrl,
          underline: true,
        });

      // Explicit annotation covering the full wrapped headline block for Acrobat / browser viewers
      const endY = doc.y;
      const boxHeight = Math.max(endY - startY, doc.currentLineHeight());
      try {
        doc.link(startX, startY, width, boxHeight, articleUrl);
      } catch {
        // link() already applied via text options
      }
    } else {
      doc
        .fillColor(COLORS.ink)
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .text(headline, startX, startY, {
          width,
        });
      doc
        .fillColor(COLORS.faint)
        .fontSize(6.5)
        .font("Helvetica")
        .text("Verified article unavailable", startX, doc.y + 1, {
          width,
        });
    }

    const publication = n.source || "";
    const date = n.date || n.publishedAt || "";
    const metaBits = [publication, date, n.sentiment].filter(Boolean);
    if (metaBits.length) {
      doc
        .fillColor(COLORS.faint)
        .fontSize(7)
        .font("Helvetica")
        .text(metaBits.join("  ·  "), PAGE.margin, doc.y + 2, {
          width: contentWidth(),
        });
    }

    if (n.summary) {
      doc
        .fillColor(COLORS.muted)
        .fontSize(7.5)
        .font("Helvetica")
        .text(String(n.summary).slice(0, 220), PAGE.margin, doc.y + 2, {
          width: contentWidth(),
        });
    }
    doc.y += 6;
  }
}

function renderAi(doc, section) {
  for (const b of section.blocks || []) {
    ensureSpace(doc, 24);
    doc.fillColor(COLORS.ink).fontSize(8.5).font("Helvetica-Bold").text(b.title || "Insight");
    if (b.body) bodyText(doc, b.body, { size: 8, gap: 0.15 });
    if (Array.isArray(b.items)) {
      for (const item of b.items) {
        ensureSpace(doc, 12);
        doc
          .fillColor(COLORS.muted)
          .fontSize(8)
          .font("Helvetica")
          .text(`• ${item}`, { width: contentWidth() });
      }
      doc.y += 3;
    }
  }
}

function renderEvidence(doc, section) {
  const items = Array.isArray(section.items)
    ? section.items
    : Object.values(section.groups || {}).flat();

  for (const item of items) {
    if (!item?.name) continue;
    ensureSpace(doc, 18);
    doc.fillColor(COLORS.ink).fontSize(8.5).font("Helvetica-Bold").text(item.name, {
      width: contentWidth(),
    });
    if (item.description) {
      doc
        .fillColor(COLORS.muted)
        .fontSize(7.5)
        .font("Helvetica")
        .text(item.description, { width: contentWidth() });
    }
    const bits = [
      item.confidenceLabel || null,
      item.lastUpdated ? `Updated: ${formatDate(item.lastUpdated)}` : null,
    ].filter(Boolean);
    if (bits.length) {
      doc.fillColor(COLORS.faint).fontSize(7).font("Helvetica").text(bits.join(" · "));
    }
    doc.y += 4;
  }
}

function renderMetadata(doc, meta) {
  const rows = [
    ["Generated", formatDate(meta.generated)],
    ["Updated", formatDate(meta.updated)],
    ["Engine", meta.engineVersion || "—"],
    ["Analysis", meta.analysisVersion || "—"],
    ["Report", meta.reportVersion || "—"],
    ["Template", meta.templateVersion ?? "—"],
    ["Confidence", meta.confidence != null ? `${meta.confidence}%` : "—"],
    [
      "Modules",
      Array.isArray(meta.modulesIncluded) ? meta.modulesIncluded.join(", ") : "—",
    ],
    ["Generated By", meta.generatedBy || "—"],
  ].filter(([, v]) => v != null && v !== "" && v !== "—");
  renderKeyValueTable(
    doc,
    rows.map(([label, value]) => ({ label, value }))
  );
}

/**
 * Render a compact professional Political Intelligence PDF.
 */
export function generateDossierPDF(dossier, callback) {
  const run = async () => {
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: PAGE.margin + HEADER_H,
        bottom: 48,
        left: PAGE.margin,
        right: PAGE.margin,
      },
      bufferPages: true,
      autoFirstPage: true,
      info: {
        Title:
          dossier?.sections?.cover?.politicianName ||
          dossier?.sections?.cover?.title ||
          "Political Intelligence Report",
        Author: "Social IQ",
        Subject: "Political Intelligence Report",
      },
    });

    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => callback(Buffer.concat(chunks)));
    doc.on("error", (err) => {
      console.error("[dossierPdf]", err.message);
    });

    const sections = dossier?.sections || {};
    let photoBuf = null;
    if (sections.cover?.photo) {
      photoBuf = await fetchImageBuffer(sections.cover.photo);
    }

    if (sections.cover) {
      renderCoverBand(doc, sections.cover, photoBuf);
    } else {
      drawHeader(doc);
      doc.y = PAGE.margin + HEADER_H + 10;
    }

    let n = 0;
    const titled = (label, render) => {
      n += 1;
      sectionTitle(doc, `${n}. ${label}`);
      render();
    };

    if (sections.executiveSummary?.paragraphs?.length) {
      titled(sections.executiveSummary.label || "Summary", () => {
        for (const p of sections.executiveSummary.paragraphs) {
          bodyText(doc, p, { size: 9, gap: 0.3 });
        }
      });
    }

    if (sections.politicalProfile) {
      titled("Political Profile", () => {
        renderKeyValueTable(doc, sections.politicalProfile.fields);
        if (sections.politicalProfile.socialAccounts?.length) {
          ensureSpace(doc, 16);
          doc.fillColor(COLORS.ink).fontSize(8).font("Helvetica-Bold").text("Social Accounts");
          for (const s of sections.politicalProfile.socialAccounts) {
            doc
              .fillColor(COLORS.muted)
              .fontSize(7.5)
              .font("Helvetica")
              .text(`${s.platform}: ${s.url}`, { width: contentWidth() });
          }
        }
        if (sections.politicalProfile.profileConfidence != null) {
          bodyText(doc, `Profile Confidence: ${sections.politicalProfile.profileConfidence}%`, {
            size: 8,
            gap: 0.15,
          });
        }
      });
    }

    if (sections.careerTimeline?.events?.length) {
      titled("Career Timeline", () => renderTimeline(doc, sections.careerTimeline.events));
    }

    if (sections.electionHistory?.rows?.length) {
      titled("Election History", () => renderElectionTable(doc, sections.electionHistory.rows));
    }

    if (sections.influenceIntelligence?.metrics?.length || sections.influenceIntelligence?.explanation) {
      titled("Influence Intelligence", () => renderInfluence(doc, sections.influenceIntelligence));
    }

    if (
      sections.geographicInfluence &&
      (sections.geographicInfluence.states?.length ||
        sections.geographicInfluence.primaryRegion ||
        sections.geographicInfluence.secondaryRegions?.length ||
        sections.geographicInfluence.verifiedCoverage != null ||
        sections.geographicInfluence.influenceTiers?.length)
    ) {
      titled("Geographic Influence", () => renderGeo(doc, sections.geographicInfluence));
    }

    if (sections.newsSentiment?.items?.length) {
      titled("News & Sentiment", () => renderNews(doc, sections.newsSentiment));
    }

    if (sections.aiInsights?.blocks?.length) {
      titled("AI Insights", () => renderAi(doc, sections.aiInsights));
    }

    if (
      (sections.evidenceSources?.items?.length > 0) ||
      (sections.evidenceSources?.groups && Object.keys(sections.evidenceSources.groups).length)
    ) {
      titled("Evidence & Sources", () => renderEvidence(doc, sections.evidenceSources));
    }

    if (sections.metadata) {
      titled("Metadata", () => renderMetadata(doc, sections.metadata));
    }

    drawFooter(doc);
    doc.end();
  };

  run().catch((err) => {
    console.error("[dossierPdf] fatal", err);
    // Fallback empty-safe PDF so export never hangs
    const doc = new PDFDocument({ size: "A4", bufferPages: true });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => callback(Buffer.concat(chunks)));
    doc.fontSize(12).text("Unable to render intelligence report.");
    doc.end();
  });
}
