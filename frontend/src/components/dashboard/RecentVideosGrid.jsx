import { motion } from "framer-motion";

export default function RecentVideosGrid({ videos }) {
  if (!videos?.length) return null;

  return (
    <div className="bg-[#121318]/40 backdrop-blur-md border border-white/[0.06] rounded-2xl p-6 sm:p-8 shadow-2xl">
      <h3 className="text-sm font-semibold text-white tracking-tight mb-6">Recent Content Uploads</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => {
          const videoId = video.id?.videoId || video.contentId || Math.random().toString();
          return (
            <motion.div
              key={videoId}
              whileHover={{ y: -4 }}
              className="bg-white/[0.01] border border-white/[0.04] hover:border-white/[0.08] rounded-xl overflow-hidden shadow-sm transition"
            >
              <div className="aspect-video relative bg-slate-900 overflow-hidden">
                <img
                  src={video.snippet?.thumbnails?.high?.url || video.thumbnail}
                  alt={video.snippet?.title || video.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="p-4 space-y-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-200 line-clamp-2 min-h-[40px]">
                  {video.snippet?.title || video.title}
                </h4>
                <p className="text-[10px] text-slate-500 font-medium font-mono">
                  {new Date(video.snippet?.publishedAt || video.publishedAt).toLocaleDateString()}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
