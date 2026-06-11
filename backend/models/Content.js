import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    contentId: {
      type: String,
      required: true,
      unique: true,
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

export default mongoose.model(
  "Content",
  contentSchema
);