import Subscription from "../models/Subscription.js";
import Usage from "../models/Usage.js";
import Account from "../models/Account.js";

export const PLAN_LIMITS = {
  free: {
    maxTrackedCreators: 2,
    maxAiRequestsCount: 3,
    maxReportsCount: 5,
    allowPdfExport: false,
  },
  professional: {
    maxTrackedCreators: 15,
    maxAiRequestsCount: 100,
    maxReportsCount: 100,
    allowPdfExport: true,
  },
  enterprise: {
    maxTrackedCreators: 1000,
    maxAiRequestsCount: 10000,
    maxReportsCount: 10000,
    allowPdfExport: true,
  },
};

export const checkPlanLimits = (limitType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      // Find active subscription
      let subscription = await Subscription.findOne({
        userId: req.user._id,
        status: "active",
      });

      // Default to free if no subscription
      if (!subscription) {
        subscription = await Subscription.create({
          userId: req.user._id,
          plan: "free",
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Free lasts long
        });
      }

      const plan = subscription.plan;
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

      // Handle tracked creators count limit
      if (limitType === "trackedCreators") {
        const count = await Account.countDocuments({ userId: req.user._id, isCompetitor: { $ne: true } });
        if (count >= limits.maxTrackedCreators) {
          return res.status(403).json({
            success: false,
            message: `Limit exceeded. Your current plan (${plan.toUpperCase()}) allows a maximum of ${limits.maxTrackedCreators} tracked accounts. Please upgrade to add more.`,
          });
        }
        return next();
      }

      // Find or create Usage record for current cycle
      let usage = await Usage.findOne({
        userId: req.user._id,
        billingCycleStart: { $lte: new Date() },
        billingCycleEnd: { $gte: new Date() },
      });

      if (!usage) {
        // Reset usage if billing cycle changed
        usage = await Usage.create({
          userId: req.user._id,
          billingCycleStart: subscription.currentPeriodStart,
          billingCycleEnd: subscription.currentPeriodEnd,
          analysesCount: 0,
          aiRequestsCount: 0,
          reportsCount: 0,
        });
      }

      if (limitType === "aiRequests") {
        if (usage.aiRequestsCount >= limits.maxAiRequestsCount) {
          return res.status(403).json({
            success: false,
            message: `AI Strategy request limit reached. Your plan (${plan.toUpperCase()}) allows ${limits.maxAiRequestsCount} requests per billing cycle. Please upgrade.`,
          });
        }
        // Increment usage
        usage.aiRequestsCount += 1;
        await usage.save();
      }

      if (limitType === "reports") {
        if (usage.reportsCount >= limits.maxReportsCount) {
          return res.status(403).json({
            success: false,
            message: `Reports creation limit reached. Your plan (${plan.toUpperCase()}) allows ${limits.maxReportsCount} reports.`,
          });
        }
        // Increment usage
        usage.reportsCount += 1;
        await usage.save();
      }

      if (limitType === "pdfExport") {
        if (!limits.allowPdfExport) {
          return res.status(403).json({
            success: false,
            message: `PDF/Excel Export is a premium feature. Please upgrade to a Professional or Enterprise plan to unlock exports.`,
          });
        }
      }

      // Store subscription on req for subsequent use if needed
      req.subscription = subscription;
      req.planLimits = limits;
      req.userUsage = usage;

      next();
    } catch (error) {
      console.error("Error checking plan limits:", error);
      next(error);
    }
  };
};
