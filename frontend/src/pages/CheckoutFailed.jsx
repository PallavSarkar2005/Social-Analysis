import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, CreditCard, LifeBuoy, RefreshCw } from "lucide-react";

export default function CheckoutFailed() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reason = params.get("reason") || "Payment was declined or cancelled";
  const orderId = params.get("order");
  const plan = params.get("plan") || "professional";
  const cycle = params.get("cycle") || "monthly";

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-start justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg mt-8 bg-[#121318]/60 border border-rose-500/20 rounded-3xl p-8 space-y-6 shadow-2xl"
          >
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="text-rose-400" size={28} />
              </div>
              <h1 className="text-2xl font-extrabold text-white">Payment Failed</h1>
              <p className="text-xs text-slate-400">
                Your subscription was not changed. You can retry with the same or a different payment method.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Reason</span>
                <span className="text-rose-300 text-right font-medium">{reason}</span>
              </div>
              {orderId && (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Order ID</span>
                  <span className="text-slate-300 font-mono text-right break-all">{orderId}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => navigate(`/billing/checkout?plan=${plan}&cycle=${cycle}`)}
                className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} /> Retry Payment
              </button>
              <button
                type="button"
                onClick={() => navigate(`/billing/checkout?plan=${plan}&cycle=${cycle}`)}
                className="h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-bold text-white hover:bg-white/[0.08] transition flex items-center justify-center gap-2"
              >
                <CreditCard size={14} /> Change Payment Method
              </button>
              <a
                href="mailto:support@socialiq.ai"
                className="h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-bold text-white hover:bg-white/[0.08] transition flex items-center justify-center gap-2"
              >
                <LifeBuoy size={14} /> Contact Support
              </a>
              <Link
                to="/billing"
                className="h-11 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition flex items-center justify-center gap-2"
              >
                <ArrowLeft size={14} /> Return to Billing
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
