import Account from "../models/Account.js";
import TrackedCompetitor from "../models/TrackedCompetitor.js";
import SavedReport from "../models/SavedReport.js";
import Snapshot from "../models/Snapshot.js";

// @desc    Perform global search
// @route   GET /api/search
// @access  Private
export const globalSearch = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const escapeRegExp = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    const cleanQuery = escapeRegExp(query);
    const regex = new RegExp(cleanQuery, "i");

    // Search Accounts
    const accounts = await Account.find({
      userId: req.user._id,
      $or: [{ name: regex }, { platform: regex }],
    }).limit(10);

    // Search Competitors
    const competitors = await TrackedCompetitor.find({
      userId: req.user._id,
      $or: [{ accountName: regex }, { platform: regex }],
    }).limit(10);

    // Search Saved Reports
    const reports = await SavedReport.find({
      userId: req.user._id,
      $or: [{ title: regex }, { type: regex }, { source: regex }],
    }).limit(10);

    // Search History Snapshots by joining/populating Account
    const snapshots = await Snapshot.find({ userId: req.user._id })
      .populate("account", "name platform")
      .sort({ capturedAt: -1 })
      .limit(100);

    // Filter snapshots based on query match on account name or platform
    const filteredSnapshots = snapshots
      .filter((snap) => {
        const nameMatch = snap.account?.name && regex.test(snap.account.name);
        const platformMatch = snap.account?.platform && regex.test(snap.account.platform);
        return nameMatch || platformMatch;
      })
      .slice(0, 10)
      .map((snap) => ({
        _id: snap._id,
        accountName: snap.account?.name || "Unknown",
        platform: snap.account?.platform || "Unknown",
        followers: snap.followers,
        views: snap.views,
        capturedAt: snap.capturedAt,
      }));

    res.json({
      success: true,
      data: {
        accounts,
        competitors,
        reports,
        history: filteredSnapshots,
      },
    });
  } catch (error) {
    next(error);
  }
};
