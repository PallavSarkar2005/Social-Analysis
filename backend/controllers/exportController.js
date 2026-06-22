import { generateCSV, generateExcel, generatePDF } from "../services/exportService.js";
import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";
import Content from "../models/Content.js";
import TrackedCompetitor from "../models/TrackedCompetitor.js";
import { logActivity } from "../utils/activityLogger.js";

// Helper to send binary/text responses depending on format
const sendExport = (res, format, filename, csvData, xlsxData, pdfDataObj) => {
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}.csv`);
    return res.send(generateCSV(csvData));
  } else if (format === "xlsx") {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}.xlsx`);
    const buffer = generateExcel(xlsxData, filename.substring(0, 30));
    return res.send(buffer);
  } else {
    // Default format: PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}.pdf`);
    return generatePDF(pdfDataObj, (pdfBuffer) => {
      res.send(pdfBuffer);
    });
  }
};

// @desc    Export Dashboard Analytics Overview
// @route   GET /api/exports/dashboard
// @access  Private
export const exportDashboard = async (req, res, next) => {
  try {
    const { format = "pdf" } = req.query;

    const accounts = await Account.find({ userId: req.user._id, isCompetitor: { $ne: true } });
    const content = await Content.find({ userId: req.user._id });

    // Format data for spreadsheet formats
    const csvData = accounts.map((acc) => ({
      Name: acc.name,
      Platform: acc.platform,
      Account_ID: acc.accountId,
      Profile_URL: acc.profileUrl,
      Is_Active: acc.isActive,
      Created_At: acc.createdAt,
    }));

    // Prepare PDF layout elements
    const kpis = [
      { label: "Accounts", value: accounts.length },
      { label: "Total Posts", value: content.length },
      { label: "Avg Engagement", value: "2.45%" },
    ];

    const tableRows = accounts.map((acc) => [
      acc.name,
      acc.platform.toUpperCase(),
      acc.accountId,
      acc.isActive ? "ACTIVE" : "INACTIVE",
    ]);

    const pdfDataObj = {
      title: "Social IQ Dashboard Summary",
      subtitle: `Analytics Workspace Audit Report for user: ${req.user.name}`,
      summary: "This report summaries all social media nodes registered and monitored inside the Social IQ enterprise platform. These tracking targets are used to automatically generate snapshot trends and AI insights.",
      kpis,
      table: {
        title: "Tracked Channel Nodes Overview",
        columns: ["Account Name", "Platform", "Target ID", "Status"],
        colWidths: [150, 100, 150, 100],
        rows: tableRows,
      },
      notes: "System recommendation: Regular channel synchronization is required to capture historic snapshots. Stale data limits linear forecasting algorithms from operating with optimal confidence intervals.",
    };

    await logActivity(req.user._id, "export_generated", `Exported dashboard data as: ${format.toUpperCase()}`, req);
    
    sendExport(res, format, "dashboard_report", csvData, csvData, pdfDataObj);
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
      const account = await Account.findOne({ accountId: comp.accountId, userId: req.user._id });
      let followers = 0;
      let views = 0;

      if (account) {
        const snap = await Snapshot.findOne({ account: account._id }).sort({ capturedAt: -1 });
        if (snap) {
          followers = snap.followers;
          views = snap.views;
        }
      }

      rowData.push({
        Name: comp.accountName,
        Platform: comp.platform.toUpperCase(),
        AccountId: comp.accountId,
        Followers: followers,
        Views: views || "N/A",
        Tracked_Since: comp.trackedSince,
      });

      tableRows.push([
        comp.accountName,
        comp.platform.toUpperCase(),
        followers.toLocaleString(),
        views > 0 ? views.toLocaleString() : "N/A",
      ]);
    }

    const pdfDataObj = {
      title: "Competitor Benchmarking Matrix",
      subtitle: `Competitor Performance Audit for user: ${req.user.name}`,
      summary: "Comparative audit mapping your competitors' statistics, channel sizes, and relative post engagements to discover industry benchmarks.",
      kpis: [
        { label: "Competitors", value: competitors.length },
      ],
      table: {
        title: "Tracked Competitors Ranking Registry",
        columns: ["Name", "Platform", "Followers/Subs", "Cumulative Views"],
        colWidths: [150, 100, 125, 125],
        rows: tableRows,
      },
      notes: "Analysis: Benchmarking stats represent industry baselines. Identify competitor growth spikes to analyze their dynamic posting frequency strategies.",
    };

    await logActivity(req.user._id, "export_generated", `Exported competitor list as: ${format.toUpperCase()}`, req);

    sendExport(res, format, "competitor_audit", rowData, rowData, pdfDataObj);
  } catch (error) {
    next(error);
  }
};

// @desc    Export Single Saved AI Insight PDF
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

    // Flat data for CSV/Excel
    const csvData = [
      {
        Title: report.title,
        Type: report.type,
        Source: report.source,
        Created_At: report.createdAt,
        Content: typeof report.content === "string" ? report.content : JSON.stringify(report.content),
      },
    ];

    const pdfDataObj = {
      title: report.title,
      subtitle: `Saved ${report.type.replace("_", " ").toUpperCase()} - Source: ${report.source}`,
      summary: `This report details the saved content generated on ${new Date(report.createdAt).toLocaleDateString()}.`,
      notes: typeof report.content === "string" ? report.content : JSON.stringify(report.content, null, 2),
    };

    await logActivity(req.user._id, "export_generated", `Exported saved report "${report.title}" as: ${format.toUpperCase()}`, req);

    sendExport(res, format, `report_${id}`, csvData, csvData, pdfDataObj);
  } catch (error) {
    next(error);
  }
};
