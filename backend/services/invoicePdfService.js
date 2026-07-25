import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INVOICE_DIR = path.join(__dirname, "../../storage/uploads/invoices");

function ensureInvoiceDir() {
  if (!fs.existsSync(INVOICE_DIR)) {
    fs.mkdirSync(INVOICE_DIR, { recursive: true });
  }
}

function money(amount, currency = "INR") {
  const n = Number(amount || 0);
  return `${currency} ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Generate a professional invoice PDF and persist it under storage/uploads/invoices.
 * @returns {{ pdfPath: string, pdfUrl: string }}
 */
export async function generateInvoicePdf(invoice, user) {
  ensureInvoiceDir();
  const fileName = `${invoice.invoiceNumber}.pdf`;
  const pdfPath = path.join(INVOICE_DIR, fileName);
  const pdfUrl = `/uploads/invoices/${fileName}`;

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    const customer = invoice.customer || {};
    const issued = invoice.issuedAt ? new Date(invoice.issuedAt) : new Date();
    const paid = invoice.paidAt ? new Date(invoice.paidAt) : issued;

    // Header
    doc.fontSize(22).fillColor("#111827").text("Social IQ", { continued: false });
    doc.fontSize(10).fillColor("#6366f1").text("Intelligence Platform", { continued: false });
    doc.moveDown(0.5);
    doc.fontSize(18).fillColor("#111827").text("TAX INVOICE", { align: "right" });
    doc.fontSize(10).fillColor("#6b7280").text(`Invoice #: ${invoice.invoiceNumber}`, { align: "right" });
    doc.text(`Issued: ${issued.toLocaleDateString("en-IN")}`, { align: "right" });
    doc.text(`Paid: ${paid.toLocaleDateString("en-IN")}`, { align: "right" });

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e5e7eb").stroke();
    doc.moveDown(1);

    // Parties
    const leftY = doc.y;
    doc.fontSize(11).fillColor("#111827").text("Billed To", 50, leftY);
    doc.fontSize(10).fillColor("#374151");
    doc.text(customer.fullName || user?.name || "Customer", 50, leftY + 16);
    doc.text(customer.email || user?.email || "");
    if (customer.companyName) doc.text(customer.companyName);
    if (customer.gstNumber) doc.text(`GSTIN: ${customer.gstNumber}`);
    if (customer.phone) doc.text(customer.phone);
    const addressParts = [customer.address, customer.city, customer.state, customer.zipCode, customer.country]
      .filter(Boolean)
      .join(", ");
    if (addressParts) doc.text(addressParts, { width: 220 });

    doc.fontSize(11).fillColor("#111827").text("From", 320, leftY);
    doc.fontSize(10).fillColor("#374151");
    doc.text("Social IQ SaaS Platform", 320, leftY + 16);
    doc.text("support@socialiq.ai");
    doc.text("GSTIN: 29AABCU9603R1ZM");
    doc.text("India");

    doc.moveDown(4);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e5e7eb").stroke();
    doc.moveDown(1);

    // Line items header
    const tableTop = doc.y;
    doc.fontSize(10).fillColor("#6b7280");
    doc.text("Description", 50, tableTop);
    doc.text("Cycle", 280, tableTop);
    doc.text("Amount", 450, tableTop, { width: 95, align: "right" });
    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e5e7eb").stroke();
    doc.moveDown(0.6);

    doc.fontSize(10).fillColor("#111827");
    const planLabel = `${String(invoice.plan || "Plan").replace(/^\w/, (c) => c.toUpperCase())} Subscription`;
    doc.text(planLabel, 50);
    doc.text(String(invoice.billingCycle || "monthly"), 280, doc.y - 12);
    doc.text(money(invoice.subtotal, invoice.currency), 450, doc.y - 12, { width: 95, align: "right" });

    doc.moveDown(1.5);
    const totalsX = 360;
    const valueX = 450;
    const line = (label, value, bold = false) => {
      doc.fontSize(10).fillColor(bold ? "#111827" : "#6b7280");
      if (bold) doc.font("Helvetica-Bold");
      else doc.font("Helvetica");
      doc.text(label, totalsX);
      doc.text(value, valueX, doc.y - 12, { width: 95, align: "right" });
      doc.font("Helvetica");
      doc.moveDown(0.4);
    };

    if (invoice.discount > 0) line("Discount", `- ${money(invoice.discount, invoice.currency)}`);
    line("Subtotal", money(invoice.subtotal - (invoice.discount || 0), invoice.currency));
    line("GST (18%)", money(invoice.gst, invoice.currency));
    line("Total Paid", money(invoice.total || invoice.amount, invoice.currency), true);

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e5e7eb").stroke();
    doc.moveDown(1);

    doc.fontSize(10).fillColor("#6b7280").text("Payment Details");
    doc.fillColor("#374151");
    doc.text(`Provider: Razorpay`);
    doc.text(`Payment ID: ${invoice.razorpayPaymentId || "—"}`);
    doc.text(`Order ID: ${invoice.razorpayOrderId || "—"}`);
    doc.text(`Method: ${invoice.paymentMethod || "Razorpay Checkout"}`);
    doc.text(`Status: ${invoice.status || "paid"}`);
    if (invoice.renewalDate) {
      doc.text(`Next Renewal: ${new Date(invoice.renewalDate).toLocaleDateString("en-IN")}`);
    }

    doc.moveDown(2);
    doc.fontSize(9).fillColor("#9ca3af").text(
      "This is a computer-generated invoice. For support contact support@socialiq.ai. Card details are never stored by Social IQ.",
      { align: "center", width: 495 }
    );

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return { pdfPath, pdfUrl };
}

export default { generateInvoicePdf };
