import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../context/AuthContext";
import { useBillingPlans, useApplyCoupon } from "../hooks/useQueries";
import {
  createBillingOrder,
  verifyBillingPayment,
  reportPaymentFailed,
} from "../api/billingApi";
import { formatIndianDate } from "../utils/dateFormatter";
import { devError } from "../utils/devLog";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle,
  CreditCard,
  Loader2,
  Lock,
  Shield,
  Sparkles,
  Tag,
} from "lucide-react";

const EMPTY_FORM = {
  fullName: "",
  email: "",
  companyName: "",
  gstNumber: "",
  phone: "",
  country: "India",
  state: "",
  address: "",
  city: "",
  zipCode: "",
  billingContact: "",
};

function money(n, currency = "INR") {
  return `${currency} ${Number(n || 0).toLocaleString("en-IN")}`;
}

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = (searchParams.get("plan") || "professional").toLowerCase();
  const initialCycle = searchParams.get("cycle") === "annual" ? "annual" : "monthly";

  const { data: plansData } = useBillingPlans();
  const applyCouponMutation = useApplyCoupon();

  const [cycle, setCycle] = useState(initialCycle);
  const [form, setForm] = useState(EMPTY_FORM);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || user.name || "",
      email: prev.email || user.email || "",
      phone: prev.phone || user.phone || "",
      companyName: prev.companyName || user.organization || "",
      country: prev.country || user.country || "India",
      state: prev.state || user.state || "",
    }));
  }, [user]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  const planMeta = useMemo(() => {
    const plans = plansData?.plans || [];
    return plans.find((p) => p.id === plan) || {
      id: plan,
      name: plan.charAt(0).toUpperCase() + plan.slice(1),
      prices: { monthly: 2400, annual: 24000 },
      features: [],
    };
  }, [plansData, plan]);

  const basePricing = useMemo(() => {
    if (pricing) return pricing;
    const subtotal = planMeta.prices?.[cycle] || 0;
    const gst = Math.round(subtotal * (plansData?.gstRate ?? 0.18));
    return {
      subtotal,
      discount: 0,
      gst,
      total: subtotal + gst,
      currency: plansData?.currency || "INR",
      billingCycle: cycle,
    };
  }, [pricing, planMeta, cycle, plansData]);

  const renewalDate = useMemo(() => {
    const days = cycle === "annual" ? 365 : 30;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }, [cycle]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.fullName.trim()) next.fullName = "Full name is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Valid email required";
    if (!form.phone.trim()) next.phone = "Phone number is required";
    if (!form.country.trim()) next.country = "Country is required";
    if (!form.state.trim()) next.state = "State is required";
    if (!form.address.trim()) next.address = "Address is required";
    if (!form.city.trim()) next.city = "City is required";
    if (!form.zipCode.trim()) next.zipCode = "ZIP / PIN is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    try {
      toast.loading("Validating coupon...", { id: "coupon" });
      const res = await applyCouponMutation.mutateAsync({
        code: couponInput.trim(),
        plan,
        billingCycle: cycle,
      });
      setAppliedCoupon(res.coupon);
      setPricing(res.pricing);
      toast.success(`Coupon ${res.coupon.code} applied`, { id: "coupon" });
    } catch (err) {
      setAppliedCoupon(null);
      setPricing(null);
      toast.error(err.response?.data?.message || "Invalid coupon", { id: "coupon" });
    }
  };

  const handleCycleChange = (nextCycle) => {
    setCycle(nextCycle);
    setAppliedCoupon(null);
    setPricing(null);
  };

  const openRazorpayCheckout = async () => {
    if (!validate()) {
      toast.error("Please complete all required billing fields");
      return;
    }
    if (!window.Razorpay) {
      toast.error("Razorpay Checkout is still loading. Try again in a moment.");
      return;
    }

    try {
      setProcessing(true);
      setStep(2);
      toast.loading("Creating secure order...", { id: "checkout" });

      const billingDetails = {
        ...form,
        billingContact: form.billingContact || form.email,
      };

      const order = await createBillingOrder({
        plan,
        billingCycle: cycle,
        couponCode: appliedCoupon?.code,
        billingDetails,
      });

      toast.dismiss("checkout");
      setStep(3);

      const options = {
        key: order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Social IQ",
        description: `${planMeta.name} — ${cycle} subscription`,
        order_id: order.orderId,
        prefill: {
          name: form.fullName,
          email: form.email,
          contact: form.phone,
        },
        notes: {
          plan,
          billingCycle: cycle,
          company: form.companyName || "",
          gst: form.gstNumber || "",
        },
        theme: { color: "#4f46e5" },
        modal: {
          ondismiss: async () => {
            setProcessing(false);
            setStep(1);
            try {
              await reportPaymentFailed({
                razorpayOrderId: order.orderId,
                reason: "Checkout dismissed by customer",
              });
            } catch {
              /* ignore */
            }
            navigate(`/billing/checkout/failed?order=${order.orderId}&reason=${encodeURIComponent("Checkout cancelled")}`);
          },
        },
        handler: async (paymentResponse) => {
          try {
            setStep(4);
            toast.loading("Verifying payment signature...", { id: "verify" });
            const verified = await verifyBillingPayment({
              razorpayOrderId: paymentResponse.razorpay_order_id,
              razorpayPaymentId: paymentResponse.razorpay_payment_id,
              razorpaySignature: paymentResponse.razorpay_signature,
              billingDetails,
            });
            toast.success("Subscription activated", { id: "verify" });
            const params = new URLSearchParams({
              invoice: verified.invoiceId || "",
              payment: verified.razorpayPaymentId || "",
              order: verified.razorpayOrderId || "",
              plan: verified.plan || plan,
              cycle: verified.billingCycle || cycle,
              amount: String(verified.amountPaid || ""),
              gst: String(verified.gst || ""),
              invoiceNumber: verified.invoiceNumber || "",
              renewal: verified.renewalDate || "",
            });
            navigate(`/billing/checkout/success?${params.toString()}`);
          } catch (verifyErr) {
            devError(verifyErr);
            toast.error(verifyErr.response?.data?.message || "Verification failed", { id: "verify" });
            navigate(
              `/billing/checkout/failed?order=${paymentResponse.razorpay_order_id}&reason=${encodeURIComponent(verifyErr.response?.data?.message || "Verification failed")}`
            );
          } finally {
            setProcessing(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", async (response) => {
        const reason = response?.error?.description || response?.error?.reason || "Payment failed";
        try {
          await reportPaymentFailed({ razorpayOrderId: order.orderId, reason });
        } catch {
          /* ignore */
        }
        setProcessing(false);
        navigate(`/billing/checkout/failed?order=${order.orderId}&reason=${encodeURIComponent(reason)}`);
      });
      rzp.open();
    } catch (err) {
      devError(err);
      setProcessing(false);
      setStep(1);
      toast.error(err.response?.data?.message || err.message || "Could not start checkout", { id: "checkout" });
    }
  };

  if (!["professional", "enterprise"].includes(plan)) {
    return (
      <div className="flex min-h-screen bg-[#090a0f] text-slate-100">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <p className="text-sm text-slate-400">Select a valid paid plan to continue.</p>
              <Link to="/billing" className="text-indigo-400 text-sm font-semibold">Back to Billing</Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const field = (label, key, props = {}) => (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <input
        value={form[key]}
        onChange={(e) => updateField(key, e.target.value)}
        className={`w-full h-11 px-3 rounded-xl bg-white/[0.03] border text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition ${
          errors[key] ? "border-rose-500/50" : "border-white/[0.08]"
        }`}
        {...props}
      />
      {errors[key] && <span className="text-[10px] text-rose-400">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased">
      <Toaster position="top-right" />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Link to="/billing" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition mb-2">
                  <ArrowLeft size={12} /> Back to Billing
                </Link>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <CreditCard className="text-indigo-400" size={26} />
                  Checkout
                </h1>
                <p className="text-xs text-slate-400 mt-1">Secure Razorpay payment · UPI, Cards, NetBanking, Wallets, EMI</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {[
                  { n: 1, label: "Details" },
                  { n: 2, label: "Order" },
                  { n: 3, label: "Pay" },
                  { n: 4, label: "Verify" },
                ].map((s) => (
                  <div key={s.n} className={`px-2.5 py-1 rounded-full border ${step >= s.n ? "border-indigo-500/40 text-indigo-300 bg-indigo-500/10" : "border-white/[0.06]"}`}>
                    {s.n}. {s.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left — Customer & Billing */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-3 space-y-5"
              >
                <section className="bg-[#121318]/50 border border-white/[0.06] rounded-3xl p-5 sm:p-6 space-y-5">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-400" />
                    <h2 className="text-sm font-bold text-white">Customer Information</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {field("Full Name *", "fullName", { placeholder: "Your legal name" })}
                    {field("Email *", "email", { type: "email", placeholder: "you@company.com" })}
                    {field("Company Name", "companyName", { placeholder: "Optional" })}
                    {field("GST Number", "gstNumber", { placeholder: "Optional GSTIN" })}
                    {field("Phone Number *", "phone", { placeholder: "+91..." })}
                    {field("Billing Contact", "billingContact", { placeholder: "Accounts email (optional)" })}
                  </div>
                </section>

                <section className="bg-[#121318]/50 border border-white/[0.06] rounded-3xl p-5 sm:p-6 space-y-5">
                  <h2 className="text-sm font-bold text-white">Billing Address</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {field("Country *", "country")}
                    {field("State *", "state")}
                    <div className="sm:col-span-2">{field("Address *", "address", { placeholder: "Street address" })}</div>
                    {field("City *", "city")}
                    {field("ZIP / PIN Code *", "zipCode")}
                  </div>
                </section>

                <section className="bg-[#121318]/50 border border-white/[0.06] rounded-3xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-indigo-400" />
                    <h2 className="text-sm font-bold text-white">Coupon / Promo Code</h2>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="e.g. SOCIALIQ20"
                      className="flex-1 h-11 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white outline-none focus:border-indigo-500/50"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={applyCouponMutation.isPending}
                      className="h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-bold text-white hover:bg-white/[0.08] transition"
                    >
                      Apply
                    </button>
                  </div>
                  {appliedCoupon && (
                    <p className="text-xs text-emerald-400 font-medium">
                      Applied {appliedCoupon.code}
                      {appliedCoupon.percentOff ? ` (−${appliedCoupon.percentOff}%)` : ""}
                    </p>
                  )}
                </section>
              </motion.div>

              {/* Right — Order Summary */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="lg:col-span-2"
              >
                <div className="bg-[#121318]/60 border border-white/[0.06] rounded-3xl p-5 sm:p-6 space-y-5 lg:sticky lg:top-6">
                  <h2 className="text-sm font-bold text-white">Order Summary</h2>

                  <div className="grid grid-cols-2 bg-slate-900/60 p-1 rounded-xl border border-white/[0.04]">
                    {["monthly", "annual"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleCycleChange(c)}
                        className={`py-2 rounded-lg text-xs font-bold transition ${
                          cycle === c ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {c === "monthly" ? "Monthly" : "Annual (−20%)"}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Plan</span>
                      <span className="font-bold text-white capitalize">{planMeta.name}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Billing cycle</span>
                      <span className="font-bold text-white capitalize">{cycle}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Price</span>
                      <span className="font-mono text-white">{money(basePricing.subtotal, basePricing.currency)}</span>
                    </div>
                    {basePricing.discount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Discount</span>
                        <span className="font-mono">−{money(basePricing.discount, basePricing.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-300">
                      <span>GST (18%)</span>
                      <span className="font-mono text-white">{money(basePricing.gst, basePricing.currency)}</span>
                    </div>
                    <div className="border-t border-white/[0.06] pt-3 flex justify-between items-baseline">
                      <span className="text-sm font-bold text-white">Total</span>
                      <span className="text-xl font-black text-white font-mono">
                        {money(basePricing.total, basePricing.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Renewal date</span>
                      <span>{formatIndianDate(renewalDate)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Features included</p>
                    <ul className="space-y-1.5">
                      {(planMeta.features || []).slice(0, 6).map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-slate-400">
                          <CheckCircle size={12} className="text-indigo-400 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl bg-indigo-500/5 border border-indigo-500/15 p-3 text-[11px] text-slate-400 leading-relaxed">
                    Upgrade benefits unlock immediately after payment verification. Cancel anytime — access continues until the end of the billing period.
                  </div>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={openRazorpayCheckout}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold transition active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        Pay securely with Razorpay
                      </>
                    )}
                  </button>

                  <div className="flex items-start gap-2 text-[10px] text-slate-500">
                    <Shield size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                    <span>
                      Card numbers, CVV, and bank credentials are handled only by Razorpay. Social IQ never stores sensitive payment data.
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
