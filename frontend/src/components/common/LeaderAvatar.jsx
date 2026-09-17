import { useState, useEffect, memo } from "react";
import { User } from "lucide-react";
import { resolveImageUrl } from "../../utils/imageUrl";
import SafeImage from "./SafeImage";

/**
 * LeaderAvatar — Production-grade creator avatar.
 *
 * Priority: profileImage → resolvedImage → thumbnail → silhouette
 */
function LeaderAvatar({ creator, size = 48, className = "", priority = false }) {
  const buildSources = (c) => {
    const v = c?.imageUpdatedAt;
    const candidates = [
      c?.profileImage,
      c?.resolvedImage,
      c?.thumbnail,
      c?.avatar,
      c?.image,
      c?.thumbnails?.high?.url,
      c?.thumbnails?.medium?.url,
      c?.thumbnails?.default?.url,
    ];
    const seen = new Set();
    return candidates
      .map((url) => resolveImageUrl(url, v))
      .filter((url) => {
        if (!url || seen.has(url)) return false;
        seen.add(url);
        return true;
      });
  };

  const [sources, setSources] = useState(() => buildSources(creator));

  useEffect(() => {
    setSources(buildSources(creator));
  }, [
    creator?.profileImage,
    creator?.resolvedImage,
    creator?.thumbnail,
    creator?.avatar,
    creator?.image,
    creator?.thumbnails?.high?.url,
    creator?.thumbnails?.medium?.url,
    creator?.thumbnails?.default?.url,
    creator?.imageUpdatedAt,
  ]);

  const isNumber = typeof size === "number";
  const style = isNumber ? { width: size, height: size } : {};
  const sizeClass = isNumber ? "" : size;

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-slate-900 border border-white/[0.08] flex-shrink-0 flex items-center justify-center select-none ${sizeClass} ${className}`}
      style={style}
    >
      {sources.length > 0 ? (
        <SafeImage
          sources={sources}
          alt={creator?.name || "Leader"}
          className="absolute inset-0 w-full h-full"
          imgClassName="w-full h-full object-cover"
          size="thumb"
          priority={priority}
          fallback="avatar"
          skeleton
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-500 bg-white/[0.01]">
          <User className="text-slate-600 w-1/2 h-1/2" />
        </div>
      )}
    </div>
  );
}

export default memo(LeaderAvatar);
