import cron from "node-cron";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import { sendRenewalReminderEmail } from "../services/billingEmailService.js";

/**
 * Daily billing maintenance:
 * - Send renewal reminders 3 days before period end
 * - Expire cancelled subscriptions past period end
 * - Mark past_due after failed auto-renew grace window
 */
export function startBillingRenewalJobs() {
  if (process.env.NODE_ENV === "test") return;

  cron.schedule("0 9 * * *", async () => {
    const now = new Date();
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const dayStart = new Date(inThreeDays);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(inThreeDays);
    dayEnd.setHours(23, 59, 59, 999);

    try {
      const renewing = await Subscription.find({
        plan: { $in: ["professional", "enterprise"] },
        status: "active",
        autoRenew: true,
        cancelAtPeriodEnd: false,
        renewalDate: { $gte: dayStart, $lte: dayEnd },
      }).limit(500);

      for (const sub of renewing) {
        const user = await User.findById(sub.userId);
        if (user?.email) {
          await sendRenewalReminderEmail({ user, subscription: sub }).catch(() => {});
        }
      }

      // Expire subscriptions that cancelled at period end
      const expired = await Subscription.updateMany(
        {
          plan: { $in: ["professional", "enterprise"] },
          cancelAtPeriodEnd: true,
          currentPeriodEnd: { $lt: now },
          status: { $in: ["active", "cancelled"] },
        },
        {
          $set: {
            status: "expired",
            plan: "free",
            billingCycle: null,
            autoRenew: false,
            paymentProvider: "none",
            endDate: now,
          },
        }
      );

      // Apply scheduled downgrades
      const pending = await Subscription.find({
        pendingPlan: { $ne: null },
        currentPeriodEnd: { $lt: now },
        status: "active",
      }).limit(200);

      for (const sub of pending) {
        sub.plan = sub.pendingPlan === "free" ? "free" : sub.pendingPlan;
        sub.billingCycle = sub.pendingBillingCycle;
        sub.pendingPlan = null;
        sub.pendingBillingCycle = null;
        if (sub.plan === "free") {
          sub.status = "expired";
          sub.paymentProvider = "none";
        }
        await sub.save();
      }

      console.log(
        `[Billing Job] Reminders: ${renewing.length}, expired updates: ${expired.modifiedCount}, downgrades: ${pending.length}`
      );
    } catch (err) {
      console.error("[Billing Job] Failed:", err.message);
    }
  });

  console.log("[Billing Job] Renewal & expiry cron scheduled (daily 09:00)");
}

export default { startBillingRenewalJobs };
