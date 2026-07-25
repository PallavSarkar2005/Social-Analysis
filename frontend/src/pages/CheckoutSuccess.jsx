import { Link, useSearchParams } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { formatIndianDate } from "../utils/dateFormatter";
import { motion } from "framer-motion";
import { CheckCircle2, Download, LayoutDashboard, CreditCard, FileText } from "lucide-react";
import client from "../api/client";
import toast from "react-hot-toast";

function money(n) {
  if (n === "" || n == null) return "—";
  return `INR ${Number(n).toLocaleString("en-IN")}`;
}

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const invoiceId = params.get("invoice");
  const paymentId = params.get("payment");
  const orderId = params.get("order");
  const plan = params.get("plan");
  const cycle = params.get("cycle");
  const amount = params.get("amount");
  const gst = params.get("gst");
  const invoiceNumber = params.get("invoiceNumber");
  const renewal = params.get("renewal");

  const downloadPdf = async () => {
    if (!invoiceId) {
      toast.error("Invoice not available yet");
      return;
    }
    try {
      const res = await client.get(`/api/billing/invoice/${invoiceId}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceNumber || "invoice"}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download invoice PDF");
    }
  };

  const rows = [
    { label: "Transaction / Payment ID", value: paymentId },
    { label: "Razorpay Order ID", value: orderId },
    { label: "Invoice Number", value: invoiceNumber },
    { label: "Plan Purchased", value: plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "—" },
    { label: "Billing Cycle", value: cycle ? cycle.charAt(0).toUpperCase() + cycle.slice(1) : "—" },
    { label: "Amount Paid", value: money(amount) },
    { label: "GST", value: money(gst) },
    { label: "Renewal Date", value: renewal ? formatIndianDate(renewal) : "—" },
  ];

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-start justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg mt-8 bg-[#121318]/60 border border-white/[0.06] rounded-3xl p-8 space-y-6 shadow-2xl"
          >
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="text-emerald-400" size={32} />
              </div>
              <h1 className="text-2xl font-extrabold text-white">Payment Successful</h1>
              <p className="text-xs text-slate-400">
                Your subscription is active. An invoice has been generated and a confirmation email is on the way.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
              {rows.map((r) => (
                <div key={r.label} className="flex justify-between gap-4 px-4 py-3 text-xs">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="text-white font-medium text-right break-all">{r.value || "—"}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={downloadPdf}
                className="h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-bold text-white hover:bg-white/[0.08] transition flex items-center justify-center gap-2"
              >
                <Download size={14} /> Download Invoice
              </button>
              {invoiceId && (
                <Link
                  to={`/billing/invoices/${invoiceId}`}
                  className="h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-bold text-white hover:bg-white/[0.08] transition flex items-center justify-center gap-2"
                >
                  <FileText size={14} /> View Details
                </Link>
              )}
              <Link
                to="/dashboard"
                className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition flex items-center justify-center gap-2"
              >
                <LayoutDashboard size={14} /> Go to Dashboard
              </Link>
              <Link
                to="/billing"
                className="h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-bold text-indigo-200 transition flex items-center justify-center gap-2"
              >
                <CreditCard size={14} /> Go to Billing
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
