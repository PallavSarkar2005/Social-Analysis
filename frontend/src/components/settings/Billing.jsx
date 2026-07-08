import React, { useState, useEffect } from "react";
import { useBillingStatus, useInvoices, useCancelSubscription, usePlanCatalog } from "../../hooks/useQueries";
import client from "../../api/client";
import { CreditCard, CheckCircle, RefreshCw, Download, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { formatIndianDate } from "../../utils/dateFormatter";
import { devError } from "../../utils/devLog";

export default function Billing({ user }) {
  const { data: billingData, isLoading: loadingStatus, isError: statusError, refetch: refetchStatus } = useBillingStatus();
  const { data: invoicesData, isLoading: loadingInvoices, refetch: refetchInvoices } = useInvoices();
  const { data: planCatalog } = usePlanCatalog();
  const cancelSub = useCancelSubscription();

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [cycle, setCycle] = useState("monthly");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  const handleUpgrade = async (planName) => {
    if (planName === "free") return;
    try {
      setPaymentLoading(true);
      toast.loading("Initiating transaction...", { id: "checkout" });

      const response = await client.post("/api/billing/create-order", { plan: planName, billingCycle: cycle });
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to create checkout order");
      }

      const orderData = response.data;
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SocialIQ Analytics",
        description: `${planName.toUpperCase()} - ${cycle}`,
        order_id: orderData.orderId,
        handler: async (paymentResponse) => {
          try {
            toast.loading("Verifying transaction...", { id: "checkout" });
            const verifyRes = await client.post("/api/billing/verify-payment", {
              razorpayOrderId: paymentResponse.razorpay_order_id,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpaySignature: paymentResponse.razorpay_signature,
              plan: planName,
              billingCycle: cycle,
            });
            if (verifyRes.data?.success) {
              toast.success("Billing plan upgraded!", { id: "checkout" });
              refetchStatus();
              refetchInvoices();
            } else {
              toast.error(verifyRes.data?.message || "Verification failed", { id: "checkout" });
            }
          } catch {
            toast.error("Payment verification failed.", { id: "checkout" });
          }
        },
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#4f46e5" },
        modal: { ondismiss: () => { toast.dismiss("checkout"); setPaymentLoading(false); } },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      devError(err);
      toast.error(err.response?.data?.message || err.message || "Checkout failed", { id: "checkout" });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Cancel auto-renewal? Access remains until the billing cycle ends.")) return;
    try {
      await cancelSub.mutateAsync();
      toast.success("Auto-renewal disabled.");
      refetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Cancellation failed.");
    }
  };

  const downloadInvoice = (invoice) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Invoice ${invoice.invoiceNumber}</title></head><body style="font-family:sans-serif;padding:40px">
      <h1>SocialIQ Invoice</h1>
      <p>Invoice: ${invoice.invoiceNumber}</p>
      <p>Amount: INR ${invoice.amount?.toLocaleString?.() ?? invoice.amount}</p>
      <p>Date: ${formatIndianDate(invoice.issuedAt)}</p>
      <script>window.print();</script></body></html>
    `);
    printWindow.document.close();
  };

  const status = billingData?.subscription ?? { plan: "free", status: "active", cancelAtPeriodEnd: false };
  const usage = billingData?.usage ?? {
    trackedCreatorsCount: 0,
    maxTrackedCreators: 2,
    aiRequestsCount: 0,
    maxAiRequestsCount: 3,
    reportsCount: 0,
    maxReportsCount: 5,
  };
  const invoices = invoicesData?.invoices ?? [];
  const plans = planCatalog?.plans ?? [];
  const currency = planCatalog?.currency ?? "INR";

  const formatPrice = (plan) => {
    const prices = plan.prices || {};
    const amount = cycle === "annual" ? prices.annual : prices.monthly;
    if (!amount) return "Free";
    return `${currency} ${amount.toLocaleString()}`;
  };

  if (loadingStatus) {
    return (
      <div className="p-12 flex justify-center text-slate-500">
        <RefreshCw size={20} className="animate-spin" />
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-xs text-rose-400">Failed to load billing information.</p>
        <button onClick={() => refetchStatus()} className="text-xs text-indigo-400 font-semibold">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <CreditCard className="text-indigo-400" size={20} /> Billing & Subscription
        </h2>
        <p className="text-xs text-slate-400 mt-1">Upgrade usage limits, download invoices, and manage payment schedules.</p>
      </div>

      <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Active Plan</span>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white capitalize">{status.plan} Plan</h3>
              {status.plan !== "free" && (
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold">PAID</span>
              )}
            </div>
            {status.currentPeriodEnd && status.plan !== "free" && (
              <p className="text-xs text-slate-400">Renews: {formatIndianDate(status.currentPeriodEnd)}</p>
            )}
          </div>
          {status.plan !== "free" && !status.cancelAtPeriodEnd && (
            <button onClick={handleCancelSubscription} disabled={cancelSub.isPending} className="h-9 px-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition text-xs font-semibold self-start disabled:opacity-50">
              Cancel Subscription
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-white/[0.04] pt-6">
          {[
            { label: "Tracked Accounts", used: usage.trackedCreatorsCount, max: usage.maxTrackedCreators, color: "bg-indigo-500" },
            { label: "AI Reports Generated", used: usage.reportsCount, max: usage.maxReportsCount, color: "bg-purple-500" },
          ].map(({ label, used, max, color }) => (
            <div key={label} className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>{label}</span>
                <span>{used} / {max >= 1000 ? "∞" : max}</span>
              </div>
              <div className="w-full bg-[#181b24] rounded-full h-1.5 overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${max >= 1000 ? 100 : Math.min(100, (used / (max || 1)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Subscription Upgrades</h3>
        <div className="bg-[#181b24] border border-white/[0.06] p-0.5 rounded-lg flex gap-1">
          {["monthly", "annual"].map((c) => (
            <button key={c} onClick={() => setCycle(c)} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition ${cycle === c ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}>
              {c === "monthly" ? "Monthly" : "Annually (-20%)"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(plans.length ? plans : [
          { id: "free", name: "Starter", prices: { monthly: 0, annual: 0 }, features: [] },
          { id: "professional", name: "Professional", prices: { monthly: 2400, annual: 24000 }, features: [] },
          { id: "enterprise", name: "Enterprise", prices: { monthly: 8200, annual: 82000 }, features: [] },
        ]).map((p) => {
          const isCurrent = status.plan === p.id;
          return (
            <div key={p.id} className={`bg-[#111319]/40 border rounded-2xl p-5 flex flex-col justify-between space-y-6 ${isCurrent ? "border-indigo-500 bg-indigo-500/[0.01]" : "border-white/[0.04]"}`}>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">{p.name}</h4>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-extrabold text-white">{formatPrice(p)}</span>
                    <span className="text-[10px] text-slate-500">/ {cycle === "monthly" ? "mo" : "yr"}</span>
                  </div>
                </div>
                <ul className="space-y-2 text-[10px] text-slate-300">
                  {(p.features ?? []).map((f, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle size={10} className="text-indigo-400" /><span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                disabled={isCurrent || paymentLoading || p.id === "free"}
                onClick={() => handleUpgrade(p.id)}
                className={`w-full h-9 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${isCurrent ? "bg-[#181b24] text-slate-500 border border-white/[0.04] cursor-default" : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"}`}
              >
                {isCurrent ? "Current Plan" : p.id === "free" ? "Default Plan" : "Upgrade"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileText size={16} className="text-indigo-400" /> Invoices History
        </h3>
        {loadingInvoices ? (
          <div className="h-20 flex items-center justify-center"><RefreshCw size={18} className="animate-spin text-slate-500" /></div>
        ) : invoices.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center border border-dashed border-white/[0.04] rounded-xl">No invoices generated yet.</p>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div key={inv._id} className="flex items-center justify-between p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl text-xs text-white">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><FileText size={14} /></div>
                  <div>
                    <span className="font-bold text-white block">#{inv.invoiceNumber}</span>
                    <span className="text-[10px] text-slate-400">Issued: {formatIndianDate(inv.issuedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold uppercase">INR {(inv.amount ?? 0).toLocaleString()}</span>
                  <button onClick={() => downloadInvoice(inv)} className="p-1.5 bg-[#181b24] border border-white/[0.06] text-slate-400 hover:text-white rounded-lg transition">
                    <Download size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
