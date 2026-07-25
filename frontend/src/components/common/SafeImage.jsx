import {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
  Component,
} from "react";
import {
  resolveImageUrl,
  optimizeImageUrl,
  markImageSuccess,
  markImageFailure,
  wasImageRecentlyFailed,
  FALLBACK_AVATAR,
  FALLBACK_MEDIA,
} from "../../utils/imageUrl";

/**
 * Isolates render crashes from a bad image subtree.
 */
class ImageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

/**
 * Production SafeImage — never shows a broken-image icon.
 *
 * Features: skeleton / blur-up placeholder, lazy loading, automatic fallback,
 * retry on failure, error boundary, success/failure cache, responsive sizing.
 */
function SafeImageInner({
  src,
  sources,
  alt = "",
  className = "",
  imgClassName = "h-full w-full object-cover",
  style,
  fallback = "avatar",
  fallbackSrc,
  size = "medium",
  priority = false,
  blurUp = true,
  skeleton = true,
  retries = 1,
  onLoad,
  onError,
  width,
  height,
  decoding = "async",
  referrerPolicy = "no-referrer",
  ...rest
}) {
  const fallbackResolved =
    fallbackSrc ||
    (fallback === "media" ? FALLBACK_MEDIA : FALLBACK_AVATAR);

  const buildList = useCallback(() => {
    const raw = [];
    if (Array.isArray(sources)) raw.push(...sources);
    if (src) raw.push(src);
    const seen = new Set();
    return raw
      .map((u) => optimizeImageUrl(resolveImageUrl(u), size))
      .filter((u) => {
        if (!u || seen.has(u) || wasImageRecentlyFailed(u)) return false;
        seen.add(u);
        return true;
      });
  }, [src, sources, size]);

  const [list, setList] = useState(buildList);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState("loading"); // loading | loaded | failed
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef(null);
  const retryTimer = useRef(null);

  useEffect(() => {
    const next = buildList();
    setList(next);
    setIndex(0);
    setRetryCount(0);
    setStatus(next.length ? "loading" : "failed");
  }, [buildList]);

  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  const activeSrc = list[index];
  const showFallback = status === "failed" || !activeSrc;

  const handleError = useCallback(() => {
    if (activeSrc) markImageFailure(activeSrc);
    onError?.(activeSrc);

    if (index < list.length - 1) {
      setIndex((i) => i + 1);
      setStatus("loading");
      return;
    }

    if (retryCount < retries && list.length > 0) {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => {
        setRetryCount((c) => c + 1);
        setIndex(0);
        setStatus("loading");
      }, 400 * (retryCount + 1));
      return;
    }

    setStatus("failed");
  }, [activeSrc, index, list.length, onError, retries, retryCount]);

  const handleLoad = useCallback(() => {
    if (activeSrc) markImageSuccess(activeSrc);
    setStatus("loaded");
    onLoad?.(activeSrc);
  }, [activeSrc, onLoad]);

  useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) {
      handleLoad();
    }
  }, [activeSrc, handleLoad]);

  const displaySrc = showFallback ? fallbackResolved : activeSrc;

  return (
    <span
      className={`relative overflow-hidden ${className || "inline-block"}`}
      style={{
        ...style,
        width: width ?? style?.width,
        height: height ?? style?.height,
      }}
    >
      {skeleton && status === "loading" && !showFallback && (
        <span
          aria-hidden
          className="absolute inset-0 animate-pulse bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04]"
        />
      )}

      <img
        ref={imgRef}
        key={displaySrc}
        src={displaySrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={decoding}
        referrerPolicy={referrerPolicy}
        className={`${imgClassName} transition-opacity duration-300 ${
          blurUp && status === "loading" && !showFallback
            ? "opacity-0"
            : "opacity-100"
        }`}
        onLoad={handleLoad}
        onError={showFallback ? undefined : handleError}
        {...rest}
      />
    </span>
  );
}

function SafeImage(props) {
  const fb =
    props.fallbackSrc ||
    (props.fallback === "media" ? FALLBACK_MEDIA : FALLBACK_AVATAR);

  return (
    <ImageErrorBoundary
      fallback={
        <span
          className={`relative overflow-hidden ${props.className || "inline-block"}`}
          style={props.style}
        >
          <img
            src={fb}
            alt={props.alt || ""}
            className={props.imgClassName || "h-full w-full object-cover"}
            loading="lazy"
          />
        </span>
      }
    >
      <SafeImageInner {...props} />
    </ImageErrorBoundary>
  );
}

export default memo(SafeImage);
export { ImageErrorBoundary };
