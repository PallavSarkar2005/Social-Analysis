import { motion } from "framer-motion";
import LeaderAvatar from "../common/LeaderAvatar";

export default function ChannelHeader({ channel }) {
  if (!channel) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-3xl p-8 shadow-xl"
    >
      <div className="flex items-center gap-6">
        <LeaderAvatar
          creator={channel}
          size="w-28 h-28"
          className="border-4 border-white shadow-lg"
        />

        <div>
          <h1 className="text-4xl font-bold">{channel.title}</h1>

          <p className="opacity-90">
            {Number(channel.subscribers).toLocaleString()} subscribers
          </p>
        </div>
      </div>
    </motion.div>
  );
}
