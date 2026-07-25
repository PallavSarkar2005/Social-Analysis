import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    contentId: {
      type: String,
      required: true,
    },

    title: String,

    thumbnail: String,

    type: {
      type: String,
      enum: ["video", "short"],
      default: "video",
    },

    views: {
      type: Number,
      default: 0,
    },

    likes: {
      type: Number,
      default: 0,
    },

    comments: {
      type: Number,
      default: 0,
    },

    publishedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound index to allow different users to track the same contentId
contentSchema.index({ contentId: 1, userId: 1 }, { unique: true });
contentSchema.index({ userId: 1, views: -1 });
contentSchema.index({ userId: 1, account: 1, publishedAt: -1 });
contentSchema.index({ account: 1, views: -1 });

export default mongoose.model("Content", contentSchema);