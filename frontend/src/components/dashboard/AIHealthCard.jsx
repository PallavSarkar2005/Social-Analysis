import { motion } from "framer-motion";

export default function AIHealthCard({
  channel,
}) {
  if (!channel) return null;

  const score =
    Math.min(
      100,
      Math.round(
        channel.subscribers / 10000000 +
          channel.videoCount / 20
      )
    );

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-3xl p-8 shadow-xl"
    >
      <h2 className="text-xl font-semibold">
        Channel Health Score
      </h2>

      <div className="text-6xl font-bold mt-4">
        {score}
      </div>

      <div className="mt-2 opacity-90">
        /100
      </div>
    </motion.div>
  );
}