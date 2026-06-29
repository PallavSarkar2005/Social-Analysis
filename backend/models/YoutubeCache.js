import mongoose from "mongoose";

const youtubeCacheSchema = new mongoose.Schema(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    cachedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const YoutubeCache = mongoose.model("YoutubeCache", youtubeCacheSchema);

export default YoutubeCache;
