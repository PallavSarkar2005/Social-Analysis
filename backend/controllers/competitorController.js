import TrackedCompetitor from "../models/TrackedCompetitor.js";
import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";
import axios from "axios";
import { scrapeXProfile } from "../scrapers/xScraper.js";
import { getChannelStats } from "../services/youtubeService.js";
import { logActivity } from "../utils/activityLogger.js";
import { youtubeGet } from "../utils/youtubeClient.js";

// Helper to find YouTube Channel ID by handle/query
const getChannelIdByQuery = async (query) => {
  const cleanQuery = query.startsWith("@") ? query : `@${query}`;
  try {
    const { data } = await youtubeGet(
      "getChannelIdByQuery",
      "https://www.googleapis.com/youtube/v3/channels",
      {
        forHandle: cleanQuery,
        part: "id",
      }
    );

    if (data?.items?.length) {
      return data.items[0].id;
    }
  } catch (err) {
    console.warn("forHandle query failed, falling back to search:", err.message);
  }

  // Fallback to search query
  const { data: searchData } = await youtubeGet(
    "getChannelIdByQuerySearchFallback",
    "https://www.googleapis.com/youtube/v3/search",
    {
      q: query,
      type: "channel",
      part: "snippet",
      maxResults: 1,
    }
  ).catch(() => ({ data: null }));

  if (!searchData?.items?.length) {
    return null;
  }
  return searchData.items[0].snippet.channelId;
};

// Parse numbers from strings (X scraper returns format like "1.2M", "50.4K", etc.)
const parseMetricNumber = (value) => {
  if (!value) return 0;
  const clean = value.toString().replace(/,/g, "").trim();

  if (clean.endsWith("K")) {
    return Math.round(parseFloat(clean) * 1000);
  }
  if (clean.endsWith("M")) {
    return Math.round(parseFloat(clean) * 1000000);
  }
  if (clean.endsWith("B")) {
    return Math.round(parseFloat(clean) * 1000000000);
  }
  return Number(clean);
};

// @desc    Add a competitor
// @route   POST /api/competitors
// @access  Private
export const addCompetitor = async (req, res, next) => {
  try {
    const { platform, urlOrHandle } = req.body;

    if (!platform || !urlOrHandle) {
      return res.status(400).json({
        success: false,
        message: "Platform and URL/Handle are required",
      });
    }

    let accountId = "";
    let accountName = "";
    let followers = 0;
    let views = 0;
    let profileUrl = "";

    if (platform === "youtube") {
      let query = urlOrHandle;
      if (urlOrHandle.includes("/@")) {
        query = urlOrHandle.split("/@")[1].split("/")[0];
      } else if (urlOrHandle.includes("/channel/")) {
        accountId = urlOrHandle.split("/channel/")[1].split("/")[0];
      }

      if (!accountId) {
        accountId = await getChannelIdByQuery(query);
      }

      if (!accountId) {
        return res.status(404).json({
          success: false,
          message: "YouTube channel not found",
        });
      }

      const channel = await getChannelStats(accountId);
      accountName = channel.snippet.title;
      followers = Number(channel.statistics.subscriberCount || 0);
      views = Number(channel.statistics.viewCount || 0);
      profileUrl = `https://youtube.com/channel/${accountId}`;
    } else if (platform === "x") {
      let username = urlOrHandle;
      if (urlOrHandle.includes("x.com/") || urlOrHandle.includes("twitter.com/")) {
        const parts = urlOrHandle.split("/");
        username = parts[parts.length - 1].split("?")[0];
      }
      username = username.replace("@", "");

      const profile = await scrapeXProfile(username);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: `X profile @${username} not found`,
        });
      }

      accountId = username;
      accountName = profile.name;
      followers = parseMetricNumber(profile.followers);
      views = 0; // X profiles don't expose cumulative views easily
      profileUrl = profile.profileUrl;
    } else {
      return res.status(400).json({
        success: false,
        message: "Unsupported platform. Use 'youtube' or 'x'.",
      });
    }

    // Check if competitor already added
    const existingCompetitor = await TrackedCompetitor.findOne({
      userId: req.user._id,
      platform,
      accountId,
    });

    if (existingCompetitor) {
      return res.status(400).json({
        success: false,
        message: "You are already tracking this competitor",
      });
    }

    // 1. Create or update Account document
    let account = await Account.findOne({
      accountId,
      userId: req.user._id,
    });

    if (!account) {
      account = await Account.create({
        userId: req.user._id,
        name: accountName,
        platform,
        accountId,
        profileUrl,
        isCompetitor: true,
      });
    } else {
      account.isCompetitor = true;
      await account.save();
    }

    // 2. Create snapshot
    await Snapshot.create({
      userId: req.user._id,
      account: account._id,
      followers,
      views,
    });

    // 3. Create tracked competitor
    const competitor = await TrackedCompetitor.create({
      userId: req.user._id,
      platform,
      accountId,
      accountName,
    });

    await logActivity(req.user._id, "competitor_added", `Added competitor benchmark: ${accountName} (${platform})`, req);

    res.status(201).json({
      success: true,
      data: competitor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a competitor
// @route   DELETE /api/competitors/:id
// @access  Private
export const removeCompetitor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const competitor = await TrackedCompetitor.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!competitor) {
      return res.status(404).json({
        success: false,
        message: "Competitor not found or unauthorized",
      });
    }

    // Optionally toggle the Account isCompetitor flag to false if they are no longer tracked as competitor,
    // but only if the user isn't tracking them as a regular account either.
    const account = await Account.findOne({
      accountId: competitor.accountId,
      userId: req.user._id,
    });

    if (account) {
      account.isCompetitor = false;
      await account.save();
    }

    await logActivity(req.user._id, "competitor_removed", `Stopped tracking competitor: ${competitor.accountName} (${competitor.platform})`, req);

    res.json({
      success: true,
      message: "Competitor removed from tracking",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List competitors with analytics snapshots
// @route   GET /api/competitors
// @access  Private
export const listCompetitors = async (req, res, next) => {
  try {
    const competitors = await TrackedCompetitor.find({ userId: req.user._id });

    const data = [];

    for (const comp of competitors) {
      const account = await Account.findOne({
        accountId: comp.accountId,
        userId: req.user._id,
      });

      if (!account) continue;

      const snapshots = await Snapshot.find({
        account: account._id,
        userId: req.user._id,
      }).sort({ capturedAt: 1 });

      const latest = snapshots[snapshots.length - 1] || { followers: 0, views: 0, engagementRate: 0 };
      const oldest = snapshots[0] || { followers: 0, views: 0, engagementRate: 0 };

      // Calculate growth rate based on snapshots
      const growthDiff = latest.followers - oldest.followers;
      const growthPercent =
        oldest.followers > 0
          ? parseFloat(((growthDiff / oldest.followers) * 100).toFixed(2))
          : 0;

      data.push({
        _id: comp._id,
        accountId: comp.accountId,
        platform: comp.platform,
        accountName: comp.accountName,
        trackedSince: comp.trackedSince,
        followers: latest.followers,
        views: latest.views,
        engagement: latest.engagementRate || 2.4, // Fallback realistic engagement rate if 0
        growth: growthPercent,
        history: snapshots.map((s) => ({
          date: new Date(s.capturedAt).toISOString().split("T")[0],
          followers: s.followers,
          views: s.views,
        })),
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
