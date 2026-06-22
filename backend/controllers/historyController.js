import Snapshot from "../models/Snapshot.js";

export const getChannelHistory = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const snapshots = await Snapshot.find({
      account: accountId,
      userId: req.user._id,
    }).sort({
      capturedAt: 1,
    });

    const chartData = snapshots.map((snapshot) => ({
      date: new Date(snapshot.capturedAt).toLocaleDateString(),
      followers: snapshot.followers,
      views: snapshot.views,
    }));

    res.status(200).json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllHistory = async (req, res, next) => {
  try {
    const snapshots = await Snapshot.find({ userId: req.user._id })
      .populate("account", "name platform accountId")
      .sort({ capturedAt: -1 })
      .limit(100);

    const formattedData = snapshots.map((snapshot) => ({
      id: snapshot._id,
      accountName: snapshot.account?.name || "Unknown Account",
      platform: snapshot.account?.platform || "Unknown",
      followers: snapshot.followers,
      views: snapshot.views,
      date: new Date(snapshot.capturedAt).toLocaleDateString(),
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};