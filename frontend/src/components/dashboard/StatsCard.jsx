import { motion } from "framer-motion";

export default function StatsCard({
  title,
  value,
}) {
  return (
    <motion.div
      whileHover={{
        y: -8,
        scale: 1.02,
      }}
      transition={{
        duration: 0.2,
      }}
      className="bg-white rounded-3xl p-6 shadow-lg border"
    >
      <p className="text-gray-500 text-sm">
        {title}
      </p>

      <h2 className="text-4xl font-bold mt-3 text-slate-800">
        {value}
      </h2>
    </motion.div>
  );
}