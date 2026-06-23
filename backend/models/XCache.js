import mongoose from "mongoose";

const xCacheSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      default: "",
    },
    followers: {
      type: Number,
      default: 0,
    },
    following: {
      type: Number,
      default: 0,
    },
    tweetCount: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
      default: "",
    },
    recentTweets: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true, // Auto-manages createdAt and updatedAt fields
  }
);

const XCache = mongoose.model("XCache", xCacheSchema);

export default XCache;
