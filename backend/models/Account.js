import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
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
      unique: true,
    },

    profileUrl: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Account = mongoose.model("Account", accountSchema);

export default Account;
