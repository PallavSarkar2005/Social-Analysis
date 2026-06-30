import { useState, useEffect } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { useBillingStatus, useInvoices, useCancelSubscription } from "../hooks/useQueries";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  User,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

export default function Billing() {
  const { user } = useAuth();
  const { data: billingData, isLoading: loadingStatus, refetch: refetchStatus } = useBillingStatus();
  const { data: invoicesData, isLoading: loadingInvoices, refetch: refetchInvoices } = useInvoices();
  const cancelSub = useCancelSubscription();

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [cycle, setCycle] = useState("monthly");

  // Load Razorpay Checkout dynamically
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleUpgrade = async (planName) => {
    try {
      setPaymentLoading(true);
      toast.loading("Initiating transaction...", { id: "checkout" });

      const response = await client.post("/api/billing/create-order", {
        plan: planName,
        billingCycle: cycle,
      });

      if (!response.data || !response.data.success) {
        throw new Error(response.data.message || "Failed to create checkout order");
      }

      const orderData = response.data;
      toast.success("Ready for checkout", { id: "checkout" });

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SocialIQ Analytics",
        description: `${planName.toUpperCase()} License - ${cycle}`,
        order_id: orderData.orderId,
        handler: async (paymentResponse) => {
          try {
            toast.loading("Verifying transaction credentials...", { id: "verify" });
            const verifyRes = await client.post("/api/billing/verify-payment", {
              razorpayOrderId: paymentResponse.razorpay_order_id,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpaySignature: paymentResponse.razorpay_signature,
              plan: planName,
              billingCycle: cycle,
            });

            if (verifyRes.data && verifyRes.data.success) {
              toast.success("Upgrade successful! Active Pro License verified.", { id: "verify" });
              refetchStatus();
              refetchInvoices();
            } else {
              throw new Error(verifyRes.data.message || "Verification failed");
            }
          } catch (verifyErr) {
            console.error(verifyErr);
            toast.error("Signature verification failed. Contact support.", { id: "verify" });
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#6366f1",
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.open();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || "Checkout initialization aborted");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancelAutoRenew = async () => {
    if (!window.confirm("Are you sure you want to turn off auto-renewal? Your subscription will revert to the Free tier at the end of the current billing cycle.")) return;
    try {
      toast.loading("Deactivating auto-renewal...", { id: "cancel-sub" });
      await cancelSub.mutateAsync();
      toast.success("Auto-renewal disabled successfully.", { id: "cancel-sub" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to cancel subscription.", { id: "cancel-sub" });
    }
  };

  const downloadSimulatedInvoice = (invoice) => {
    toast.success(`Downloading Invoice ${invoice.invoiceNumber}...`);
    // Simulate printing / opening invoice PDF view
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #ddd; padding-bottom: 20px; margin-bottom: 40px; }
            .invoice-title { font-size: 24px; font-weight: bold; }
            .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .details div { line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { bg-color: #f5f5f5; }
            .total { text-align: right; font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="invoice-title">SocialIQ Billing Invoice</div>
            <div>Invoice Reference: ${invoice.invoiceNumber}</div>
          </div>
          <div class="details">
            <div>
              <strong>Issued To:</strong><br>
              Name: ${user?.name || "Premium Workspace User"}<br>
              Email: ${user?.email || ""}<br>
            </div>
            <div>
              <strong>Issued By:</strong><br>
              SocialIQ SaaS Platform Inc.<br>
              Date: ${new Date(invoice.issuedAt).toLocaleDateString()}<br>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Service Description</th>
                <th>Cycle Frequency</th>
                <th>Price Unit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>SocialIQ Premium Analytics Subscription License</td>
                <td>Monthly / Annual</td>
                <td>INR ${invoice.amount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <div class="total">Total Paid: INR ${invoice.amount.toLocaleString()}</div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const status = billingData?.subscription || { plan: "free", status: "active", cancelAtPeriodEnd: false };
  const usage = billingData?.usage || {
    trackedCreatorsCount: 0,
    maxTrackedCreators: 2,
    aiRequestsCount: 0,
    maxAiRequestsCount: 3,
    reportsCount: 0,
    maxReportsCount: 5,
  };
  const invoices = invoicesData?.invoices || [];

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Toaster position="top-right" />
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 z-10 relative">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <CreditCard size={28} className="text-indigo-400" />
                Subscription & Quota Manager
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                Manage your SaaS plan subscription, track usage limits, and access historical invoices.
              </p>
            </div>
            <button
              onClick={() => {
                refetchStatus();
                refetchInvoices();
              }}
              className="h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-white transition flex items-center gap-2 self-start"
            >
              <RefreshCw size={14} className={loadingStatus ? "animate-spin" : ""} />
              Refresh Billing Status
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Plan Summary Card */}
            <div className="lg:col-span-2 space-y-6">
              {/* Current Active Plan Glassmorphism Widget */}
              <div className="bg-[#121318]/45 border border-white/[0.06] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl -z-10" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                      Current Licensing Tier
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white capitalize mt-2 flex items-center gap-2">
                      {status.plan} Plan
                      <CheckCircle className="text-indigo-400" size={20} />
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      {status.plan === "free"
                        ? "Basic workspace features with strict usage limits."
                        : "Premium analytics, unlimited AI strategies, and exports enabled."}
                    </p>
                  </div>
                  
                  {status.plan !== "free" && (
                    <div className="text-left sm:text-right space-y-1 bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Cycle Expiry Date</span>
                      <span className="text-sm font-bold text-slate-200 block">
                        {new Date(status.currentPeriodEnd).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
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

                {/* Progress Indicators for limits */}
                <div className="border-t border-white/[0.06] mt-8 pt-6 space-y-6">
                  <h3 className="text-sm font-bold text-white tracking-tight">Resource Quotas</h3>
                  
                  <div className="space-y-4">
                    {/* Quota 1: Monitored Creators */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-400">Monitored Creators</span>
                        <span className="text-slate-200">
                          {usage.trackedCreatorsCount} / {usage.maxTrackedCreators === 1000 ? "Unlimited" : usage.maxTrackedCreators}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (usage.trackedCreatorsCount / (usage.maxTrackedCreators || 1)) * 100)}%` }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>

                    {/* Quota 2: AI Requests */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-400">AI Deep Strategies (Monthly)</span>
                        <span className="text-slate-200">
                          {usage.aiRequestsCount} / {usage.maxAiRequestsCount === 10000 ? "Unlimited" : usage.maxAiRequestsCount}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (usage.aiRequestsCount / (usage.maxAiRequestsCount || 1)) * 100)}%` }}
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>

                    {/* Quota 3: Saved Reports */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-400">Generated Reports (Monthly)</span>
                        <span className="text-slate-200">
                          {usage.reportsCount} / {usage.maxReportsCount === 10000 ? "Unlimited" : usage.maxReportsCount}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (usage.reportsCount / (usage.maxReportsCount || 1)) * 100)}%` }}
                          className="h-full bg-gradient-to-r from-pink-500 to-orange-500 rounded-full"
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {status.plan !== "free" && !status.cancelAtPeriodEnd && (
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={handleCancelAutoRenew}
                      disabled={cancelSub.isPending}
                      className="px-4 py-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs font-semibold transition"
                    >
                      Turn Off Auto-renew
                    </button>
                  </div>
                )}
              </div>

              {/* Invoices List */}
              <div className="bg-[#121318]/40 border border-white/[0.06] rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <FileText size={16} className="text-indigo-400" />
                  Payment & Invoice History
                </h3>

                {loadingInvoices ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="animate-spin text-slate-500" size={24} />
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs font-medium border border-dashed border-white/[0.04] rounded-2xl bg-white/[0.01]">
                    No billing history captured yet.
                  </div>
                ) : (
                  <div className="overflow-hidden border border-white/[0.04] rounded-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <th className="p-4">Invoice Number</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">PDF Invoice</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {invoices.map((inv) => (
                            <tr key={inv._id} className="hover:bg-white/[0.01] transition-colors text-slate-300">
                              <td className="p-4 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                              <td className="p-4">
                                <span className="flex items-center gap-1.5">
                                  <Calendar size={12} className="text-slate-500" />
                                  {new Date(inv.issuedAt).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-200">
                                INR {inv.amount.toLocaleString()}
                              </td>
                              <td className="p-4">
                                <span className="inline-flex px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase text-[9px]">
                                  Paid
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => downloadSimulatedInvoice(inv)}
                                  className="p-1.5 rounded-lg bg-white/[0.02] hover:bg-indigo-600/10 hover:text-indigo-400 text-slate-400 transition"
                                  title="Download PDF"
                                >
                                  <Download size={14} />
                                </button>
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

            {/* Right: Plan Upgrade Matrix */}
            <div className="space-y-6">
              <div className="bg-[#121318]/45 border border-white/[0.06] rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between h-full">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">Available Workspaces</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      Choose a subscription package that fits your political campaign scale or organizational footprints.
                    </p>
                  </div>

                  {/* Toggle Cycle */}
                  <div className="grid grid-cols-2 bg-slate-900/50 p-1 rounded-xl border border-white/[0.04]">
                    <button
                      onClick={() => setCycle("monthly")}
                      className={`py-1.5 rounded-lg text-xs font-bold transition ${
                        cycle === "monthly" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Monthly Cycles
                    </button>
                    <button
                      onClick={() => setCycle("annual")}
                      className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        cycle === "annual" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Annual Cycle
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-1 rounded">
                        -20%
                      </span>
                    </button>
                  </div>

                  {/* Pro Plan Box */}
                  <div className="border border-indigo-500/20 bg-indigo-500/[0.02] rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-white text-sm">Professional Plan</h4>
                      <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                        Recommended
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 text-white">
                      <span className="text-2xl font-black">
                        INR {cycle === "monthly" ? "2,400" : "24,000"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        / {cycle === "monthly" ? "month" : "year"}
                      </span>
                    </div>

                    <ul className="space-y-2.5 text-xs text-slate-400 text-left font-medium">
                      <li className="flex items-center gap-2">
                        <CheckCircle size={12} className="text-indigo-400" />
                        <span>Up to 15 tracked creators</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle size={12} className="text-indigo-400" />
                        <span>100 AI Strategy reports / cycle</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle size={12} className="text-indigo-400" />
                        <span>Automated hourly database syncs</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle size={12} className="text-indigo-400" />
                        <span>PDF / Excel telemetry exports</span>
                      </li>
                    </ul>

                    {status.plan === "professional" ? (
                      <div className="py-2.5 w-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold rounded-xl text-center">
                        Active License
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade("professional")}
                        disabled={paymentLoading || status.plan === "enterprise"}
                        className="py-2.5 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {paymentLoading ? "Connecting..." : "Upgrade to Professional"}
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>

                  {/* Enterprise Box */}
                  <div className="border border-white/[0.06] bg-white/[0.01] rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-white text-sm">Enterprise Plan</h4>
                    </div>

                    <div className="flex items-baseline gap-1 text-white">
                      <span className="text-2xl font-black">
                        INR {cycle === "monthly" ? "8,200" : "82,000"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        / {cycle === "monthly" ? "month" : "year"}
                      </span>
                    </div>

                    <ul className="space-y-2.5 text-xs text-slate-400 text-left font-medium">
                      <li className="flex items-center gap-2">
                        <CheckCircle size={12} className="text-purple-400" />
                        <span>1000 tracked creators</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle size={12} className="text-purple-400" />
                        <span>10,000 AI requests / cycle</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle size={12} className="text-purple-400" />
                        <span>Real-time scrapers & proxies</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle size={12} className="text-purple-400" />
                        <span>Custom model fine-tuning</span>
                      </li>
                    </ul>

                    {status.plan === "enterprise" ? (
                      <div className="py-2.5 w-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold rounded-xl text-center">
                        Active License
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade("enterprise")}
                        disabled={paymentLoading}
                        className="py-2.5 w-full bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white text-xs font-bold rounded-xl transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {paymentLoading ? "Connecting..." : "Contact Enterprise Team"}
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-slate-900/60 border border-white/[0.04] flex items-start gap-2.5 text-[10px] text-slate-400 font-medium">
                  <Shield size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                  <span className="leading-normal">
                    Payments are handled securely via Razorpay payment gateway. Rest easy with 256-bit SSL transaction encryptions.
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
