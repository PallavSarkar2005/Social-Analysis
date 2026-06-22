import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";
import { scrapeXProfile } from "../scrapers/xScraper.js";

/*
========================================
Convert Followers
========================================
*/

const parseNumber = (value) => {
  if (!value) return 0;

  const clean = value.replace(/,/g, "");

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

/*
========================================
Extract Username
========================================
*/

const extractUsername = (url) => {
  try {
    const match = url.match(/(?:x|twitter)\.com\/([^/?]+)/i);

    return match?.[1] || null;
  } catch {
    return null;
  }
};

/*
========================================
Analyze X Profile
========================================
*/

export const analyzeXProfile = async (req, res, next) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL is required",
      });
    }

    const username = extractUsername(url);

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Invalid X URL",
      });
    }

    console.log("================================");
    console.log("REQUEST URL:", url);
    console.log("USERNAME:", username);
    console.log("================================");

    let profile;
    try {
      profile = await scrapeXProfile(username);
    } catch (scrapeErr) {
      console.error("[X Controller Scraper Error]:", scrapeErr.message);
      return res.status(502).json({
        success: false,
        message: `Scraper Access Restricted: Failed to parse X profile for @${username}. X.com is currently rate-limiting or blocking automated access.`,
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: `Profile @${username} was not found on X.com.`,
      });
    }

    /*
    ========================================
    FIND OR CREATE ACCOUNT
    ========================================
    */

    let account = await Account.findOne({
      accountId: username,
      userId: req.user._id,
    });

    if (!account) {
      account = await Account.create({
        name: profile.name,
        platform: "x",
        accountId: username,
        profileUrl: profile.profileUrl,
        userId: req.user._id,
      });
    } else {
      account.name = profile.name;
      account.profileUrl = profile.profileUrl;

      await account.save();
    }

    /*
    ========================================
    SAVE SNAPSHOT ONLY IF CHANGED
    ========================================
    */

    const followerCount = parseNumber(profile.followers);

    const latestSnapshot = await Snapshot.findOne({
      account: account._id,
      userId: req.user._id,
    }).sort({
      capturedAt: -1,
    });

    if (!latestSnapshot || latestSnapshot.followers !== followerCount) {
      await Snapshot.create({
        account: account._id,
        followers: followerCount,
        views: 0,
        engagementRate: 0,
        userId: req.user._id,
      });

      console.log("NEW SNAPSHOT SAVED");
    } else {
      console.log("FOLLOWER COUNT UNCHANGED");
    }

    /*
    ========================================
    HISTORY
    ========================================
    */

    const history = await Snapshot.find({
      account: account._id,
      userId: req.user._id,
    })
      .sort({ capturedAt: 1 })
      .lean();

    /*
    ========================================
    RESPONSE
    ========================================
    */

    return res.json({
      success: true,
      type: "x",

      data: {
        mongoId: account._id,

        username: profile.username,

        name: profile.name,

        bio: profile.bio,

        followers: profile.followers,

        following: profile.following,

        posts: profile.posts,

        profileUrl: profile.profileUrl,

        history: history.map((item) => ({
          date: new Date(item.capturedAt).toLocaleDateString(),
          followers: item.followers,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
