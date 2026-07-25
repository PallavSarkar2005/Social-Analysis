import XLSX from "xlsx";
import {
  generateCSV,
  generateExcel,
  generatePDF,
  generateJSON,
} from "../services/exportService.js";
import { generateDossierPDF } from "../services/reportDossierPdf.js";
import { generateDossierMarkdown } from "../services/reportDossierMarkdown.js";
import {
  ensureReportDossier,
  dossierToCsvDatasets,
} from "../services/reportDossierService.js";
import Account from "../models/Account.js";
import Content from "../models/Content.js";
import TrackedCompetitor from "../models/TrackedCompetitor.js";
import SavedReport from "../models/SavedReport.js";
import { writeAuditLog } from "../services/reportService.js";
import { getLatest } from "../services/analyticsEngine.js";

const sendLegacyExport = (res, format, filename, csvData, xlsxData, pdfDataObj) => {
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}.csv`);
    return res.send(generateCSV(csvData));
  }
  if (format === "xlsx") {
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${filename}.xlsx`);
    return res.send(generateExcel(xlsxData, filename.substring(0, 30)));
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}.pdf`);
  return generatePDF(pdfDataObj, (pdfBuffer) => res.send(pdfBuffer));
};

function buildMultiDatasetCsv(datasets) {
  const parts = [];
  for (const [name, rows] of Object.entries(datasets)) {
    if (!rows?.length) continue;
    parts.push(`# Dataset: ${name}`);
    parts.push(generateCSV(rows));
    parts.push("");
  }
  return (
    parts.join("\n") ||
    generateCSV([{ Note: "No structured datasets available for CSV export" }])
  );
}

function buildMultiSheetXlsx(datasets) {
  const workbook = XLSX.utils.book_new();
  let added = 0;
  for (const [name, rows] of Object.entries(datasets)) {
    if (!rows?.length) continue;
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
    added += 1;
  }
  if (!added) {
    const sheet = XLSX.utils.json_to_sheet([{ Note: "No structured datasets" }]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Empty");
  }
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function attachmentFilename(basename, ext) {
  const safe = String(basename || "export").replace(/[^\w.\-]+/g, "_").slice(0, 80);
  return `attachment; filename="${safe}.${ext}"; filename*=UTF-8''${encodeURIComponent(`${safe}.${ext}`)}`;
}

function pdfBufferFromDossier(dossier) {
  return new Promise((resolve, reject) => {
    try {
      generateDossierPDF(dossier, (buf) => {
        if (!buf || !Buffer.isBuffer(buf) || buf.length === 0) {
          reject(new Error("PDF generator returned an empty buffer"));
          return;
        }
        resolve(buf);
      });
    } catch (err) {
      reject(err);
    }
  });
}

// @desc    Export Dashboard Analytics Overview
// @route   GET /api/exports/dashboard
// @access  Private
export const exportDashboard = async (req, res, next) => {
  try {
    const { format = "pdf" } = req.query;

    const accounts = await Account.find({ userId: req.user._id, isCompetitor: { $ne: true } });
    const content = await Content.find({ userId: req.user._id });

    const csvData = accounts.map((acc) => ({
      Name: acc.name,
      Platform: acc.platform,
      Account_ID: acc.accountId,
      Profile_URL: acc.profileUrl,
      Is_Active: acc.isActive,
      Created_At: acc.createdAt,
    }));

    const pdfDataObj = {
      title: "Social IQ Dashboard Summary",
      subtitle: `Analytics Workspace Audit Report for user: ${req.user.name}`,
      summary:
        "This report summaries all social media nodes registered and monitored inside the Social IQ enterprise platform.",
      kpis: [
        { label: "Accounts", value: accounts.length },
        { label: "Total Posts", value: content.length },
      ],
      table: {
        title: "Tracked Channel Nodes Overview",
        columns: ["Account Name", "Platform", "Target ID", "Status"],
        colWidths: [150, 100, 150, 100],
        rows: accounts.map((acc) => [
          acc.name,
          acc.platform.toUpperCase(),
          acc.accountId,
          acc.isActive ? "ACTIVE" : "INACTIVE",
        ]),
      },
    };

    sendLegacyExport(res, format, "dashboard_report", csvData, csvData, pdfDataObj);
  } catch (error) {
    next(error);
  }
};

// @desc    Export Competitors Performance Ranking
// @route   GET /api/exports/competitors
// @access  Private
export const exportCompetitors = async (req, res, next) => {
  try {
    const { format = "pdf" } = req.query;
    const competitors = await TrackedCompetitor.find({ userId: req.user._id });

    const rowData = [];
    const tableRows = [];

    for (const comp of competitors) {
      const account = await Account.findOne({
        accountId: comp.accountId,
        userId: req.user._id,
      });
      let followers = null;
      let views = null;

      if (account) {
        const latest = await getLatest(account._id, { userId: req.user._id });
        followers = latest.metrics?.subscribers ?? null;
        views = latest.metrics?.views ?? null;
      }

      rowData.push({
        Name: comp.accountName,
        Platform: comp.platform.toUpperCase(),
        AccountId: comp.accountId,
        Followers: followers ?? "N/A",
        Views: views ?? "N/A",
        Tracked_Since: comp.trackedSince,
      });

      tableRows.push([
        comp.accountName,
        comp.platform.toUpperCase(),
        followers != null ? followers.toLocaleString() : "N/A",
        views != null && views > 0 ? views.toLocaleString() : "N/A",
      ]);
    }

    const pdfDataObj = {
      title: "Competitor Benchmarking Matrix",
      subtitle: `Competitor Performance Audit for user: ${req.user.name}`,
      summary:
        "Comparative audit mapping your competitors' statistics and relative channel sizes.",
      kpis: [{ label: "Competitors", value: competitors.length }],
      table: {
        title: "Tracked Competitors Ranking Registry",
        columns: ["Name", "Platform", "Followers/Subs", "Cumulative Views"],
        colWidths: [150, 100, 125, 125],
        rows: tableRows,
      },
    };

    sendLegacyExport(res, format, "competitor_audit", rowData, rowData, pdfDataObj);
  } catch (error) {
    next(error);
  }
};

// @desc    Export Single Saved Report as Political Intelligence dossier
// @route   GET /api/exports/reports/:id
// @access  Private
export const exportSavedReport = async (req, res, next) => {
  try {
    const { format = "pdf" } = req.query;
    const { id } = req.params;

    const report = await SavedReport.findOne({ _id: id, userId: req.user._id });
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found or unauthorized",
      });
    }

    // Auto-upgrade / assemble dossier once; skip rebuild when versions match
    const dossier = await ensureReportDossier(report);
    if (!dossier) {
      return res.status(500).json({
        success: false,
        message: "Failed to assemble intelligence dossier for export",
      });
    }

    const datasets = dossierToCsvDatasets(dossier);
    const filename = `intelligence_report_${id}`;

    await writeAuditLog({
      userId: req.user._id,
      reportId: report._id,
      action: "exported",
      metadata: { format, dossierTemplate: dossier?.templateVersion },
    });

    if (format === "json") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", attachmentFilename(filename, "json"));
      return res.send(
        generateJSON({
          ...(report.toObject ? report.toObject() : report),
          dossier,
        })
      );
    }

    if (format === "markdown" || format === "md") {
      const md = generateDossierMarkdown(dossier);
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", attachmentFilename(filename, "md"));
      return res.send(md);
    }

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", attachmentFilename(filename, "csv"));
      return res.send(buildMultiDatasetCsv(datasets));
    }

    if (format === "xlsx") {
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", attachmentFilename(filename, "xlsx"));
      return res.send(buildMultiSheetXlsx(datasets));
    }

    // Default: professional PDF dossier
    const pdfBuffer = await pdfBufferFromDossier(dossier);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", attachmentFilename(filename, "pdf"));
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
