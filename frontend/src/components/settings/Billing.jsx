import React, { useState, useEffect } from "react";
import { useBillingStatus, useInvoices, useCancelSubscription } from "../../hooks/useQueries";
import client from "../../api/client";
import { CreditCard, CheckCircle, AlertTriangle, RefreshCw, Download, Calendar, Sparkles, ArrowRight, TrendingUp, FileText, Shield } from "lucide-react";
import toast from "react-hot-toast";

export default function Billing({ user }) {
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

      const orderData = response.data.data;
      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder";

      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Social IQ SaaS",
        description: `${planName.toUpperCase()} - ${cycle.toUpperCase()} Plan Subscription`,
        order_id: orderData.id,
        handler: async function (response) {
          try {
            toast.loading("Verifying signature payment details...", { id: "checkout" });
            const verifyRes = await client.post("/api/billing/verify-payment", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data && verifyRes.data.success) {
              toast.success("Billing plan successfully upgraded!", { id: "checkout" });
              refetchStatus();
              refetchInvoices();
            } else {
              toast.error(verifyRes.data.message || "Signature verification failed", { id: "checkout" });
            }
          } catch (verifyErr) {
            toast.error("Internal server error during verification.", { id: "checkout" });
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: "#4f46e5",
        },
        modal: {
          ondismiss: function () {
            toast.dismiss("checkout");
            setPaymentLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Checkout failed", { id: "checkout" });
      setPaymentLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Are you sure you want to cancel your professional subscription?")) return;
    try {
      await cancelSub.mutateAsync();
      toast.success("Subscription cancelled successfully.");
      refetchStatus();
    } catch (err) {
      toast.error(err.message || "Cancellation failed.");
    }
  };

  const activePlan = billingData?.plan || "free";
  const limits = billingData?.limits || { trackedCreators: 2, reportsPerMonth: 5, exportFormats: ["csv"] };
  const usage = billingData?.usage || { trackedCreators: 0, reportsGenerated: 0 };

  const plans = [
    {
      id: "free",
      name: "Starter",
      price: "$0",
      desc: "Perfect for testing analytics and insights telemetry.",
      features: ["Up to 2 Tracked Accounts", "5 AI Reports per month", "CSV Data Exports", "Basic support"],
    },
    {
      id: "professional",
      name: "Professional",
      price: cycle === "monthly" ? "$29" : "$240",
      desc: "For content teams needing rotational scraping.",
      features: ["Up to 15 Tracked Accounts", "Unlimited AI Reports", "PDF / Excel / CSV Exports", "Priority Discord Support"],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: cycle === "monthly" ? "$99" : "$840",
      desc: "For agencies and large scale networks.",
      features: ["Unlimited Tracked Accounts", "Custom Groq API models", "White-labeled reports", "Dedicated Account Manager"],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <CreditCard className="text-indigo-400" size={20} /> Billing & Subscription
        </h2>
        <p className="text-xs text-slate-400 mt-1">Upgrade your usage limits, download invoices, and manage payment checkout schedules.</p>
      </div>

      {/* Plan Status Card */}
      <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Active Plan</span>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white uppercase">{activePlan} Plan</h3>
              {activePlan !== "free" && (
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold">
                  PAID
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">Renewal Cycle: {billingData?.billingCycle || "None"}</p>
          </div>

          {activePlan !== "free" && (
            <button
              onClick={handleCancelSubscription}
              className="h-9 px-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition text-xs font-semibold self-start"
            >
              Cancel Subscription
            </button>
          )}
        </div>

        {/* Plan limits progress bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-white/[0.04] pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Tracked Accounts</span>
              <span>{usage.trackedCreators} / {limits.trackedCreators === Infinity ? "∞" : limits.trackedCreators}</span>
            </div>
            <div className="w-full bg-[#181b24] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-indigo-500"
                style={{
                  width: `${limits.trackedCreators === Infinity ? 100 : Math.min(100, (usage.trackedCreators / limits.trackedCreators) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>AI Reports Generated</span>
              <span>{usage.reportsGenerated} / {limits.reportsPerMonth === Infinity ? "∞" : limits.reportsPerMonth}</span>
            </div>
            <div className="w-full bg-[#181b24] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-purple-500"
                style={{
                  width: `${limits.reportsPerMonth === Infinity ? 100 : Math.min(100, (usage.reportsGenerated / limits.reportsPerMonth) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pricing cycles selectors */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Subscription Upgrades</h3>
        <div className="bg-[#181b24] border border-white/[0.06] p-0.5 rounded-lg flex gap-1">
          <button
            onClick={() => setCycle("monthly")}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition ${
              cycle === "monthly" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("annual")}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition ${
              cycle === "annual" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Annually (-20%)
          </button>
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isCurrent = activePlan === p.id;
          return (
            <div
              key={p.id}
              className={`bg-[#111319]/40 border rounded-2xl p-5 flex flex-col justify-between space-y-6 ${
                isCurrent ? "border-indigo-500 bg-indigo-500/[0.01]" : "border-white/[0.04]"
              }`}
            >
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">{p.name}</h4>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-extrabold text-white">{p.price}</span>
                    <span className="text-[10px] text-slate-500">/ {cycle === "monthly" ? "mo" : "yr"}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{p.desc}</p>
                </div>

                <ul className="space-y-2 text-[10px] text-slate-300">
                  {p.features.map((f, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle size={10} className="text-indigo-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                disabled={isCurrent || paymentLoading}
                onClick={() => handleUpgrade(p.id)}
                className={`w-full h-9 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                  isCurrent
                    ? "bg-[#181b24] text-slate-500 border border-white/[0.04] cursor-default"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}
              >
                {isCurrent ? "Current Plan" : "Upgrade"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Invoice list */}
      <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileText size={16} className="text-indigo-400" /> Invoices History
        </h3>

        {loadingInvoices ? (
          <div className="h-20 flex items-center justify-center">
            <RefreshCw size={18} className="animate-spin text-slate-500" />
          </div>
        ) : !invoicesData || invoicesData.data?.length === 0 ? (
          <p className="text-xs text-slate-500">No invoices generated yet.</p>
        ) : (
          <div className="space-y-3">
            {invoicesData.data.map((inv) => (
              <div
                key={inv._id}
                className="flex items-center justify-between p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl text-xs text-white"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    <FileText size={14} />
                  </div>
                  <div>
                    <span className="font-bold text-white block">#{inv.invoiceNumber}</span>
                    <span className="text-[10px] text-slate-400">
                      Paid on: {new Date(inv.paidAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-bold uppercase">${(inv.amount / 100).toFixed(2)}</span>
                  <a
                    href={`/api/billing/invoices/${inv._id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-[#181b24] border border-white/[0.06] text-slate-400 hover:text-white rounded-lg transition"
                  >
                    <Download size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
