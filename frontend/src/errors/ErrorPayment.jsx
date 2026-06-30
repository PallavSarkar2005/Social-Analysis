import React from "react";
import { CreditCard, AlertTriangle, ArrowLeft, Layers } from "lucide-react";
import { motion } from "framer-motion";

export default function ErrorPayment() {
  const previousRoute = sessionStorage.getItem("previous_route") || "/dashboard";

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-rose-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative mb-8"
      >
        <motion.div
          animate={{ rotateY: [0, 180, 360] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-xl flex items-center justify-center text-rose-500 w-32 h-20 shadow-2xl relative"
        >
          <CreditCard size={36} className="relative z-10" />
          <div className="absolute bottom-1 right-1 p-1 bg-rose-600 rounded-full text-white">
            <AlertTriangle size={10} />
          </div>
          <motion.div
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-rose-500/10 rounded-2xl blur-md"
          />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-3 text-center max-w-md relative z-10"
      >
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Payment Failed</h1>
        <h2 className="text-sm font-semibold text-slate-300">Transaction was declined.</h2>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          Your Razorpay subscription intent could not be validated. Please check your credit card status, balance, or billing zip code.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3 mt-8 relative z-10 w-full max-w-xs sm:max-w-sm justify-center"
      >
        <button
          onClick={() => (window.location.href = "/billing")}
          className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-2 text-xs font-semibold shadow-lg shadow-indigo-600/15"
        >
          Retry Payment
        </button>
        <button
          onClick={() => (window.location.href = previousRoute)}
          className="h-10 px-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] text-slate-300 hover:text-white transition flex items-center justify-center gap-2 text-xs font-semibold"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="h-10 px-6 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] text-slate-300 hover:text-white transition flex items-center justify-center gap-2 text-xs font-semibold"
        >
          <Layers size={14} /> Dashboard
        </button>
      </motion.div>
    </div>
  );
}
