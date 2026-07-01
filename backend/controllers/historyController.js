import mongoose from "mongoose";
import Snapshot from "../models/Snapshot.js";

// @desc    Get snapshot history for a single channel (for charts & growth calculations)
// @route   GET /api/history/:accountId
// @access  Private
export const getChannelHistory = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json({ success: false, message: "Invalid account ID" });
    }

    const snapshots = await Snapshot.find({
      account: accountId,
      userId: req.user._id,
    })
      .populate("account", "profileImage uploadedImage resolvedImage thumbnail imageSource imageUpdatedAt")
      .sort({ capturedAt: 1 });

    const formatted = snapshots.map((snapshot) => ({
      id: snapshot._id,
      capturedAt: snapshot.capturedAt,
      date: new Date(snapshot.capturedAt).toLocaleDateString(),
      followers: snapshot.followers || 0,
      views: snapshot.views || 0,
      videos: snapshot.videos || 0,
      likes: snapshot.likes || 0,
      comments: snapshot.comments || 0,
      engagementRate: snapshot.engagementRate || 0,
      averageEngagement: snapshot.averageEngagement || 0,
      party: snapshot.party || "Independent",
      state: snapshot.state || "Unknown State",
      name: snapshot.name || "",
      profileImage: snapshot.profileImage || snapshot.account?.profileImage || "",
      uploadedImage: snapshot.account?.uploadedImage || "",
      resolvedImage: snapshot.account?.resolvedImage || "",
      thumbnail: snapshot.account?.thumbnail || "",
      imageSource: snapshot.account?.imageSource || "youtube",
      imageUpdatedAt: snapshot.account?.imageUpdatedAt ? new Date(snapshot.account.imageUpdatedAt).getTime() : Date.now(),
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get paginated global history logs for all user channels
// @route   GET /api/history
// @access  Private
export const getAllHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const total = await Snapshot.countDocuments({ userId: req.user._id });
    const snapshots = await Snapshot.find({ userId: req.user._id })
      .populate("account", "name platform accountId party state profileImage uploadedImage resolvedImage thumbnail imageSource imageUpdatedAt")
      .sort({ capturedAt: -1 })
      .skip(skip)
      .limit(limit);

    const formattedData = snapshots.map((snapshot) => ({
      id: snapshot._id,
      accountName: snapshot.name || snapshot.account?.name || "Unknown Account",
      platform: snapshot.account?.platform || "youtube",
      followers: snapshot.followers || 0,
      views: snapshot.views || 0,
      videos: snapshot.videos || 0,
      likes: snapshot.likes || 0,
      comments: snapshot.comments || 0,
      engagementRate: snapshot.engagementRate || 0,
      averageEngagement: snapshot.averageEngagement || 0,
      party: snapshot.party || snapshot.account?.party || "Independent",
      state: snapshot.state || snapshot.account?.state || "Unknown State",
      profileImage: snapshot.profileImage || snapshot.account?.profileImage || "",
      uploadedImage: snapshot.account?.uploadedImage || "",
      resolvedImage: snapshot.account?.resolvedImage || "",
      thumbnail: snapshot.account?.thumbnail || "",
      imageSource: snapshot.account?.imageSource || "youtube",
      imageUpdatedAt: snapshot.account?.imageUpdatedAt ? new Date(snapshot.account.imageUpdatedAt).getTime() : Date.now(),
      date: new Date(snapshot.capturedAt).toLocaleString(),
      capturedAt: snapshot.capturedAt,
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};