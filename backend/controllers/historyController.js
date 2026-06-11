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