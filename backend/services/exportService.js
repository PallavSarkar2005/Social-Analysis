import PDFDocument from "pdfkit";
import XLSX from "xlsx";

/**
 * Generates a professional CSV string from an array of flat objects
 * @param {Array<Object>} data - Flat data array
 * @returns {String} CSV string
 */
export const generateCSV = (data) => {
  if (!data || data.length === 0) return "";
  
  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Headers row
  csvRows.push(headers.join(","));
  
  // Data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] === undefined || row[header] === null ? "" : row[header];
      const escaped = ("" + val).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }
  
  return csvRows.join("\n");
};

/**
 * Generates an Excel XLSX workbook Buffer from data
 * @param {Array<Object>} data - Array of row objects
 * @param {String} sheetName - Target worksheet name
 * @returns {Buffer} XLSX spreadsheet binary buffer
 */
export const generateExcel = (data, sheetName = "Export") => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Write and return buffer
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

/**
 * Generates a professional PDF report and writes to a stream/buffer callback
 * @param {Object} reportData - Struct containing title, subtitle, metrics, tables, and paragraphs
 * @param {Function} callback - Callback function that receives the PDF buffer
 */
export const generatePDF = (reportData, callback) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const chunks = [];

  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("end", () => callback(Buffer.concat(chunks)));

  // Title Section
  doc.fillColor("#111319").rect(0, 0, 595.28, 120).fill(); // Dark header background
  
  doc.fillColor("#6366f1").fontSize(26).font("Helvetica-Bold").text("SOCIAL IQ", 50, 40);
  doc.fillColor("#94a3b8").fontSize(10).font("Helvetica").text("Enterprise Performance Analytics Engine", 50, 70);
  
  // Date in header
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.fillColor("#ffffff").fontSize(10).text(`Generated: ${dateStr}`, 450, 70, { align: "right" });

  // Reset text color for body
  doc.fillColor("#0f172a").fontSize(18).font("Helvetica-Bold").text(reportData.title || "Analytics Report", 50, 150);
  doc.fontSize(10).font("Helvetica-Oblique").text(reportData.subtitle || "", 50, 175);
  doc.moveDown(1.5);

  // Section 1: Overview Summary Paragraph
  if (reportData.summary) {
    doc.fillColor("#1e293b").fontSize(11).font("Helvetica-Bold").text("Overview & Highlights", 50, doc.y);
    doc.moveDown(0.4);
    doc.fillColor("#334155").fontSize(10).font("Helvetica").text(reportData.summary, { width: 500, align: "justify" });
    doc.moveDown(2);
  }

  // Section 2: Key Metrics Cards
  if (reportData.kpis && reportData.kpis.length > 0) {
    doc.fillColor("#1e293b").fontSize(11).font("Helvetica-Bold").text("Core Performance Indicators", 50, doc.y);
    doc.moveDown(0.6);

    const startY = doc.y;
    let currentX = 50;

    reportData.kpis.forEach((kpi) => {
      // Draw light gray metric container
      doc.fillColor("#f8fafc").rect(currentX, startY, 110, 60).fill();
      doc.strokeColor("#e2e8f0").lineWidth(1).rect(currentX, startY, 110, 60).stroke();

      // Print metric values
      doc.fillColor("#64748b").fontSize(8).font("Helvetica-Bold").text(kpi.label.toUpperCase(), currentX + 8, startY + 12, { width: 94 });
      doc.fillColor("#4f46e5").fontSize(14).font("Helvetica-Bold").text("" + kpi.value, currentX + 8, startY + 28, { width: 94 });

      currentX += 125;
    });

    doc.y = startY + 80;
    doc.moveDown(1);
  }

  // Section 3: Data Table
  if (reportData.table && reportData.table.rows && reportData.table.rows.length > 0) {
    doc.fillColor("#1e293b").fontSize(11).font("Helvetica-Bold").text(reportData.table.title || "Detailed Performance Metrics", 50, doc.y);
    doc.moveDown(0.6);

    const tableTop = doc.y;
    const columns = reportData.table.columns;
    const colWidths = reportData.table.colWidths || columns.map(() => 500 / columns.length);
    
    // Draw Table Header Row
    doc.fillColor("#6366f1").rect(50, tableTop, 500, 20).fill();
    
    let headerX = 55;
    columns.forEach((col, idx) => {
      doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold").text(col, headerX, tableTop + 6, { width: colWidths[idx] - 10, truncate: true });
      headerX += colWidths[idx];
    });

    let currentY = tableTop + 20;

    // Draw Rows
    reportData.table.rows.forEach((row, rowIdx) => {
      // Alternating row backgrounds
      if (rowIdx % 2 === 1) {
        doc.fillColor("#f8fafc").rect(50, currentY, 500, 18).fill();
      }

      let cellX = 55;
      row.forEach((cell, cellIdx) => {
        doc.fillColor("#334155").fontSize(8).font("Helvetica").text("" + cell, cellX, currentY + 5, { width: colWidths[cellIdx] - 10, truncate: true });
        cellX += colWidths[cellIdx];
      });

      currentY += 18;
    });
  doc.y = currentY + 20;
  }

  // Section 4: AI Recommendations / Notes
  if (reportData.notes) {
    if (doc.y > 700) doc.addPage();
    doc.fillColor("#1e293b").fontSize(11).font("Helvetica-Bold").text("AI Strategic Recommendations", 50, doc.y);
    doc.moveDown(0.4);
    doc.fillColor("#475569").fontSize(10).font("Helvetica").text(reportData.notes, { width: 500, align: "justify" });
  }

  // Footer Branding
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(50, 780).lineTo(545, 780).stroke();
    doc.fillColor("#94a3b8").fontSize(8).text("Social IQ Premium Analytics Portal. All rights reserved.", 50, 788);
    doc.text(`Page ${i + 1} of ${pages.count}`, 450, 788, { align: "right" });
  }

  doc.end();
};
