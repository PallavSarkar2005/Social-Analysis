import Snapshot from "../models/Snapshot.js";

export const getChannelHistory = async (req, res) => {
  try {
    const { accountId } = req.params;

    const snapshots = await Snapshot.find({
      account: accountId,
    }).sort({
      capturedAt: 1,
    });

    const chartData = snapshots.map((snapshot) => ({
      date: new Date(
        snapshot.capturedAt
      ).toLocaleDateString(),

      followers: snapshot.followers,

      views: snapshot.views,
    }));

    res.status(200).json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllHistory = async (req, res) => {
  try {
    const snapshots = await Snapshot.find()
      .populate("account", "name platform accountId")
      .sort({ capturedAt: -1 })
      .limit(100);

    const formattedData = snapshots.map((snapshot) => ({
      id: snapshot._id,
      accountName: snapshot.account?.name || "Unknown Node",
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};