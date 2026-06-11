import { motion } from "framer-motion";

export default function RecentVideosGrid({ videos }) {
  if (!videos?.length) return null;

  return (
    <div className="bg-white rounded-3xl p-8 shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Recent Uploads</h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <motion.div
            key={video.id.videoId}
            whileHover={{
              y: -6,
              scale: 1.02,
            }}
            className="bg-slate-50 rounded-2xl overflow-hidden shadow"
          >
            <img
              src={video.snippet.thumbnails.high?.url}
              alt={video.snippet.title}
              className="w-full h-48 object-cover"
            />

            <div className="p-4">
              <h3 className="font-bold line-clamp-2">{video.snippet.title}</h3>

              <p className="text-sm text-gray-500 mt-2">
                {new Date(video.snippet.publishedAt).toLocaleDateString()}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
