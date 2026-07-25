import { memo } from "react";
import { formatIndianDate } from "../../utils/dateFormatter";
import SafeImage from "../common/SafeImage";

function RecentVideosGrid({ videos }) {
  if (!videos?.length) return null;

  return (
    <div className="bg-[#121318]/40 backdrop-blur-md border border-white/[0.06] rounded-2xl p-6 sm:p-8 shadow-2xl">
      <h3 className="text-sm font-semibold text-white tracking-tight mb-6">Recent Content Uploads</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => {
          const videoId = video.id?.videoId || video.contentId || video._id;
          const thumb =
            video.snippet?.thumbnails?.medium?.url ||
            video.snippet?.thumbnails?.high?.url ||
            video.snippet?.thumbnails?.default?.url ||
            video.thumbnail;

          return (
            <div
              key={videoId}
              className="bg-white/[0.01] border border-white/[0.04] hover:border-white/[0.08] rounded-xl overflow-hidden shadow-sm transition hover:-translate-y-1 will-change-transform"
            >
              <div className="aspect-video relative bg-slate-900 overflow-hidden">
                <SafeImage
                  src={thumb}
                  alt={video.snippet?.title || video.title || "Video"}
                  className="absolute inset-0 w-full h-full"
                  imgClassName="w-full h-full object-cover"
                  size="medium"
                  fallback="media"
                />
              </div>

              <div className="p-4 space-y-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-200 line-clamp-2 min-h-[40px]">
                  {video.snippet?.title || video.title}
                </h4>
                <p className="text-[10px] text-slate-500 font-medium font-mono">
                  {formatIndianDate(video.snippet?.publishedAt || video.publishedAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(RecentVideosGrid);
