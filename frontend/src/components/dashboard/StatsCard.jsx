import { motion } from "framer-motion";

export default function StatsCard({ title, value }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 shadow-xl"
    >
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
      <h2 className="text-xl sm:text-2xl font-black text-white mt-2 tracking-tight">{value}</h2>
    </motion.div>
  );
}