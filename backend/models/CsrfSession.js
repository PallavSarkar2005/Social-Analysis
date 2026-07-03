import mongoose from "mongoose";

const csrfSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    csrfToken: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

csrfSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const CsrfSession = mongoose.model("CsrfSession", csrfSessionSchema);

export default CsrfSession;
