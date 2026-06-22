import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    platform: {
      type: String,
      required: true,
      enum: ["youtube", "instagram", "x"],
    },

    accountId: {
      type: String,
      required: true,
    },

    profileUrl: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isCompetitor: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to allow different users to track the same accountId
accountSchema.index({ accountId: 1, userId: 1 }, { unique: true });

const Account = mongoose.model("Account", accountSchema);

export default Account;
