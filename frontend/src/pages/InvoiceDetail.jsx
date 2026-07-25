import { Link, useParams } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { useInvoice } from "../hooks/useQueries";
import { formatIndianDate } from "../utils/dateFormatter";
import client from "../api/client";
import toast from "react-hot-toast";
import { ArrowLeft, Download, Printer, RefreshCw } from "lucide-react";

function money(n, currency = "INR") {
  return `${currency} ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function InvoiceDetail() {
  const { invoiceId } = useParams();
  const { data, isLoading, isError, refetch } = useInvoice(invoiceId);
  const invoice = data?.invoice;

  const downloadPdf = async () => {
    try {
      const res = await client.get(`/api/billing/invoice/${invoiceId}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice?.invoiceNumber || "invoice"}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("PDF download failed");
    }
  };

  const printInvoice = () => window.print();

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 print:bg-white print:text-black">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="print:hidden">
          <Navbar />
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-3 print:hidden">
              <Link to="/billing" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
                <ArrowLeft size={12} /> Back to Billing
              </Link>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={downloadPdf}
                  className="h-9 px-3 rounded-xl bg-indigo-600 text-xs font-bold text-white flex items-center gap-1.5"
                >
                  <Download size={12} /> Download PDF
                </button>
                <button
                  type="button"
                  onClick={printInvoice}
                  className="h-9 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-bold text-white flex items-center gap-1.5"
                >
                  <Printer size={12} /> Print
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <RefreshCw className="animate-spin text-slate-500" />
              </div>
            ) : isError || !invoice ? (
              <div className="text-center py-20 space-y-3">
                <p className="text-sm text-rose-400">Invoice not found</p>
                <button type="button" onClick={() => refetch()} className="text-xs text-indigo-400 font-semibold">
                  Retry
                </button>
              </div>
            ) : (
              <article className="bg-[#121318]/70 border border-white/[0.06] rounded-3xl p-6 sm:p-10 space-y-8 print:border-0 print:bg-white print:shadow-none print:rounded-none">
                <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-white/[0.06] print:border-slate-200 pb-6">
                  <div>
                    <div className="text-2xl font-black tracking-tight">
                      Social <span className="text-indigo-400 print:text-indigo-600">IQ</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Tax Invoice</p>
                    <p className="text-[11px] text-slate-500 mt-2">support@socialiq.ai</p>
                  </div>
                  <div className="text-left sm:text-right text-xs space-y-1">
                    <p className="font-mono font-bold text-white print:text-black text-sm">{invoice.invoiceNumber}</p>
                    <p className="text-slate-400">Issued {formatIndianDate(invoice.issuedAt)}</p>
                    <p className="text-slate-400">Paid {formatIndianDate(invoice.paidAt || invoice.issuedAt)}</p>
                    <span className="inline-flex mt-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase">
                      {invoice.status}
                    </span>
                  </div>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Customer</p>
                    <p className="font-semibold text-white print:text-black">{invoice.customer?.fullName || "—"}</p>
                    <p className="text-slate-400">{invoice.customer?.email}</p>
                    {invoice.customer?.companyName && <p className="text-slate-400">{invoice.customer.companyName}</p>}
                    {invoice.customer?.gstNumber && (
                      <p className="text-slate-400">GSTIN: {invoice.customer.gstNumber}</p>
                    )}
                    <p className="text-slate-500 leading-relaxed">
                      {[invoice.customer?.address, invoice.customer?.city, invoice.customer?.state, invoice.customer?.zipCode, invoice.customer?.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Subscription</p>
                    <p className="capitalize text-white print:text-black font-semibold">{invoice.plan} · {invoice.billingCycle}</p>
                    <p className="text-slate-400">Payment method: {invoice.paymentMethod || "Razorpay"}</p>
                    <p className="text-slate-400">Renewal: {formatIndianDate(invoice.renewalDate)}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/[0.06] print:border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-white/[0.03] print:bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="text-left p-3">Description</th>
                        <th className="text-right p-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-white/[0.04] print:border-slate-100">
                        <td className="p-3 capitalize">{invoice.plan} subscription ({invoice.billingCycle})</td>
                        <td className="p-3 text-right font-mono">{money(invoice.subtotal, invoice.currency)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 text-xs max-w-xs ml-auto">
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount</span>
                      <span className="font-mono">−{money(invoice.discount, invoice.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono">{money((invoice.subtotal || 0) - (invoice.discount || 0), invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST (18%)</span>
                    <span className="font-mono">{money(invoice.gst, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-white print:text-black border-t border-white/[0.06] print:border-slate-200 pt-2">
                    <span>Total</span>
                    <span className="font-mono">{money(invoice.total || invoice.amount, invoice.currency)}</span>
                  </div>
                </div>

                <footer className="border-t border-white/[0.06] print:border-slate-200 pt-4 text-[11px] text-slate-500 space-y-1">
                  <p>Razorpay Payment ID: <span className="font-mono text-slate-300 print:text-slate-700">{invoice.razorpayPaymentId || "—"}</span></p>
                  <p>Razorpay Order ID: <span className="font-mono text-slate-300 print:text-slate-700">{invoice.razorpayOrderId || "—"}</span></p>
                  <p>Transaction date: {formatIndianDate(invoice.paidAt || invoice.issuedAt)}</p>
                  <p className="pt-2">For support, contact support@socialiq.ai. Sensitive card data is never stored by Social IQ.</p>
                </footer>
              </article>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
