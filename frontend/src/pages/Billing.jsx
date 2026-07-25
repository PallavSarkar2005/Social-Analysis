import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import {
  useBillingStatus,
  useInvoices,
  useCancelSubscription,
  useResumeSubscription,
  useBillingPlans,
} from "../hooks/useQueries";
import { formatIndianDate } from "../utils/dateFormatter";
import { devError } from "../utils/devLog";
import client from "../api/client";
import {
  CreditCard,
  CheckCircle,
  RefreshCw,
  Download,
  Calendar,
  ArrowRight,
  FileText,
  Shield,
  Eye,
} from "lucide-react";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

function money(n, currency = "INR") {
  return `${currency} ${Number(n || 0).toLocaleString("en-IN")}`;
}

export default function Billing() {
  const navigate = useNavigate();
  const { data: billingData, isLoading: loadingStatus, refetch: refetchStatus } = useBillingStatus();
  const { data: invoicesData, isLoading: loadingInvoices, refetch: refetchInvoices } = useInvoices();
  const { data: plansData } = useBillingPlans();
  const cancelSub = useCancelSubscription();
  const resumeSub = useResumeSubscription();

  const [cycle, setCycle] = useState("monthly");

  const status = billingData?.subscription || {
    plan: "free",
    status: "active",
    cancelAtPeriodEnd: false,
    autoRenew: false,
  };
  const usage = billingData?.usage || {
    trackedCreatorsCount: 0,
    maxTrackedCreators: 2,
    aiRequestsCount: 0,
    maxAiRequestsCount: 3,
    reportsCount: 0,
    maxReportsCount: 5,
  };
  const invoices = invoicesData?.invoices || [];

  const paidPlans = useMemo(() => {
    const plans = plansData?.plans || [];
    return plans.filter((p) => p.id === "professional" || p.id === "enterprise");
  }, [plansData]);

  const goCheckout = (planName) => {
    navigate(`/billing/checkout?plan=${planName}&cycle=${cycle}`);
  };

  const handleCancelAutoRenew = async () => {
    if (
      !window.confirm(
        "Turn off auto-renewal? Your subscription will remain active until the end of the current billing cycle."
      )
    ) {
      return;
    }
    try {
      toast.loading("Updating subscription...", { id: "cancel-sub" });
      await cancelSub.mutateAsync();
      toast.success("Auto-renewal disabled.", { id: "cancel-sub" });
      refetchStatus();
    } catch (err) {
      devError(err);
      toast.error(err.response?.data?.message || "Failed to cancel", { id: "cancel-sub" });
    }
  };

  const handleResume = async () => {
    try {
      toast.loading("Resuming auto-renewal...", { id: "resume-sub" });
      await resumeSub.mutateAsync();
      toast.success("Auto-renewal resumed.", { id: "resume-sub" });
      refetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resume", { id: "resume-sub" });
    }
  };

  const downloadInvoice = async (invoice) => {
    try {
      toast.loading("Preparing PDF...", { id: "pdf" });
      const res = await client.get(`/api/billing/invoice/${invoice._id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded", { id: "pdf" });
    } catch {
      toast.error("PDF download failed", { id: "pdf" });
    }
  };

  const badgeColor =
    status.plan === "enterprise"
      ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
      : status.plan === "professional"
        ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
        : "bg-slate-500/10 text-slate-300 border-slate-500/20";

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Toaster position="top-right" />
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 z-10 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <CreditCard size={28} className="text-indigo-400" />
                Billing & Subscription
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                Manage your plan, usage limits, invoices, and Razorpay payments.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                refetchStatus();
                refetchInvoices();
              }}
              className="h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-white transition flex items-center gap-2 self-start"
            >
              <RefreshCw size={14} className={loadingStatus ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#121318]/45 border border-white/[0.06] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl -z-10" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                        Current Plan
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${badgeColor}`}>
                        {status.plan}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-slate-400">
                        {status.paymentStatus || status.status}
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white capitalize mt-1 flex items-center gap-2">
                      {status.plan} Plan
                      {status.plan !== "free" && <CheckCircle className="text-indigo-400" size={20} />}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      {status.billingCycle ? `${status.billingCycle} billing` : "Free workspace"}
                      {status.renewalDate || status.currentPeriodEnd
                        ? ` · Renews ${formatIndianDate(status.renewalDate || status.currentPeriodEnd)}`
                        : ""}
                    </p>
                  </div>

                  {status.plan !== "free" && (
                    <div className="text-left sm:text-right space-y-1 bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 min-w-[160px]">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                        Next Billing
                      </span>
                      <span className="text-sm font-bold text-slate-200 block">
                        {status.nextBillingDate
                          ? formatIndianDate(status.nextBillingDate)
                          : status.cancelAtPeriodEnd
                            ? "Won't renew"
                            : formatIndianDate(status.currentPeriodEnd)}
                      </span>
                      {status.cancelAtPeriodEnd ? (
                        <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded block text-center">
                          Auto-renew Off
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded block text-center">
                          Auto-renew On
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-white/[0.06] mt-8 pt-6 space-y-6">
                  <h3 className="text-sm font-bold text-white tracking-tight">Usage Limits</h3>
                  <div className="space-y-4">
                    {[
                      {
                        label: "Tracked Accounts",
                        used: usage.trackedCreatorsCount,
                        max: usage.maxTrackedCreators,
                        gradient: "from-indigo-500 to-purple-500",
                      },
                      {
                        label: "AI Reports",
                        used: usage.aiRequestsCount,
                        max: usage.maxAiRequestsCount,
                        gradient: "from-purple-500 to-pink-500",
                      },
                      {
                        label: "Generated Reports / Storage Quota",
                        used: usage.reportsCount,
                        max: usage.maxReportsCount,
                        gradient: "from-pink-500 to-orange-500",
                      },
                    ].map((q) => (
                      <div key={q.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-400">{q.label}</span>
                          <span className="text-slate-200">
                            {q.used} / {q.max >= 1000 ? "Unlimited" : q.max}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (q.used / (q.max || 1)) * 100)}%` }}
                            className={`h-full bg-gradient-to-r ${q.gradient} rounded-full`}
                            transition={{ duration: 0.6 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {status.plan !== "free" && (
                  <div className="mt-8 flex flex-wrap justify-end gap-2">
                    {status.cancelAtPeriodEnd ? (
                      <button
                        type="button"
                        onClick={handleResume}
                        disabled={resumeSub.isPending}
                        className="px-4 py-2 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded-xl text-xs font-semibold transition"
                      >
                        Resume Auto-renew
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCancelAutoRenew}
                        disabled={cancelSub.isPending}
                        className="px-4 py-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs font-semibold transition"
                      >
                        Cancel Subscription
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-[#121318]/40 border border-white/[0.06] rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <FileText size={16} className="text-indigo-400" />
                  Invoice History
                </h3>

                {loadingInvoices ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="animate-spin text-slate-500" size={24} />
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs font-medium border border-dashed border-white/[0.04] rounded-2xl bg-white/[0.01]">
                    No invoices yet. Upgrade a plan to generate your first invoice.
                  </div>
                ) : (
                  <div className="overflow-hidden border border-white/[0.04] rounded-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <th className="p-4">Invoice</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Plan</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">GST</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {invoices.map((inv) => (
                            <tr key={inv._id} className="hover:bg-white/[0.01] transition-colors text-slate-300">
                              <td className="p-4 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                              <td className="p-4">
                                <span className="flex items-center gap-1.5">
                                  <Calendar size={12} className="text-slate-500" />
                                  {formatIndianDate(inv.issuedAt)}
                                </span>
                              </td>
                              <td className="p-4 capitalize">
                                {inv.plan || "—"}
                                {inv.billingCycle ? ` · ${inv.billingCycle}` : ""}
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-200">
                                {money(inv.total ?? inv.amount, inv.currency)}
                              </td>
                              <td className="p-4 font-mono">{money(inv.gst || 0, inv.currency)}</td>
                              <td className="p-4">
                                <span className="inline-flex px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase text-[9px]">
                                  {inv.status || "paid"}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <div className="inline-flex gap-1">
                                  <Link
                                    to={`/billing/invoices/${inv._id}`}
                                    className="p-1.5 rounded-lg bg-white/[0.02] hover:bg-indigo-600/10 hover:text-indigo-400 text-slate-400 transition"
                                    title="View details"
                                  >
                                    <Eye size={14} />
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => downloadInvoice(inv)}
                                    className="p-1.5 rounded-lg bg-white/[0.02] hover:bg-indigo-600/10 hover:text-indigo-400 text-slate-400 transition"
                                    title="Download PDF"
                                  >
                                    <Download size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-[#121318]/45 border border-white/[0.06] rounded-3xl p-6 shadow-2xl space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Upgrade Plan</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    Choose Monthly or Annual, then continue to secure checkout.
                  </p>
                </div>

                <div className="grid grid-cols-2 bg-slate-900/50 p-1 rounded-xl border border-white/[0.04]">
                  <button
                    type="button"
                    onClick={() => setCycle("monthly")}
                    className={`py-1.5 rounded-lg text-xs font-bold transition ${
                      cycle === "monthly" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setCycle("annual")}
                    className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      cycle === "annual" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Annual
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-1 rounded">
                      −20%
                    </span>
                  </button>
                </div>

                {(paidPlans.length
                  ? paidPlans
                  : [
                      {
                        id: "professional",
                        name: "Professional",
                        prices: { monthly: 2400, annual: 24000 },
                        features: ["15 tracked creators", "100 AI requests", "PDF exports"],
                      },
                      {
                        id: "enterprise",
                        name: "Enterprise",
                        prices: { monthly: 8200, annual: 82000 },
                        features: ["1000 creators", "10,000 AI requests", "Dedicated support"],
                      },
                    ]
                ).map((p) => {
                  const isCurrent = status.plan === p.id;
                  const price = p.prices?.[cycle] ?? 0;
                  const gst = Math.round(price * 0.18);
                  return (
                    <div
                      key={p.id}
                      className={`border rounded-2xl p-5 space-y-4 ${
                        p.id === "professional"
                          ? "border-indigo-500/20 bg-indigo-500/[0.02]"
                          : "border-white/[0.06] bg-white/[0.01]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-white text-sm">{p.name}</h4>
                        {p.id === "professional" && (
                          <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1 text-white">
                        <span className="text-2xl font-black">{money(price)}</span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          / {cycle === "monthly" ? "mo" : "yr"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">+ {money(gst)} GST at checkout</p>
                      <ul className="space-y-2 text-xs text-slate-400 font-medium">
                        {(p.features || []).slice(0, 4).map((f) => (
                          <li key={f} className="flex items-center gap-2">
                            <CheckCircle size={12} className="text-indigo-400" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      {isCurrent ? (
                        <div className="py-2.5 w-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold rounded-xl text-center">
                          Active License
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => goCheckout(p.id)}
                          className={`py-2.5 w-full text-xs font-bold rounded-xl transition active:scale-[0.98] flex items-center justify-center gap-2 ${
                            p.id === "professional"
                              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500"
                              : "bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white"
                          }`}
                        >
                          Upgrade to {p.name}
                          <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.04] flex items-start gap-2.5 text-[10px] text-slate-400 font-medium">
                  <Shield size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                  <span className="leading-normal">
                    Payments are processed by Razorpay Checkout (UPI, cards, netbanking, wallets, EMI). Social IQ never stores card details.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
