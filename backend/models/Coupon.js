import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    percentOff: { type: Number, min: 0, max: 100 },
    amountOff: { type: Number, min: 0 },
    applicablePlans: [{ type: String, enum: ["professional", "enterprise"] }],
    applicableCycles: [{ type: String, enum: ["monthly", "annual"] }],
    maxRedemptions: { type: Number, default: null },
    redemptionCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
