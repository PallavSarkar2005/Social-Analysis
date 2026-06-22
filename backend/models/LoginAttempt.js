import mongoose from "mongoose";

const loginAttemptSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 1,
    },
    lockoutUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on email and IP for tracking brute force patterns
loginAttemptSchema.index({ email: 1, ipAddress: 1 }, { unique: true });

const LoginAttempt = mongoose.model("LoginAttempt", loginAttemptSchema);

export default LoginAttempt;
