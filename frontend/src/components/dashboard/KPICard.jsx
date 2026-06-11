import { motion } from "framer-motion";

export default function KPICard({ title, value }) {
  return (
    <motion.div
      whileHover={{
        y: -6,
      }}
      className="bg-white rounded-3xl p-6 shadow-lg"
    >
      <p className="text-gray-500">{title}</p>

      <h2 className="text-3xl font-bold mt-2">{value}</h2>
    </motion.div>
  );
}
