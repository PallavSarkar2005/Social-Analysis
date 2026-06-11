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
    const match = url.match(/x\.com\/([^/?]+)/i);
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

export const analyzeXProfile = async (req, res) => {
  try {
    const { url } = req.body;

    console.log("REQUEST URL:", url);

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

    console.log("STEP 1 - Username:", username);

    const profile = await scrapeXProfile(username);

    console.log("PROFILE VALUE:");
    console.log(profile);
    console.log("PROFILE TYPE:", typeof profile);
    console.log("PROFILE EXISTS:", !!profile);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    let account = await Account.findOne({
      accountId: username,
    });

    if (!account) {
      account = await Account.create({
        name: profile.name,
        platform: "x",
        accountId: username,
        profileUrl: profile.profileUrl,
      });
    }

    await Snapshot.create({
      account: account._id,
      followers: parseNumber(profile.followers),
      views: 0,
      engagementRate: 0,
    });

    const history = await Snapshot.find({
      account: account._id,
    })
      .sort({ capturedAt: 1 })
      .lean();

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
    console.error("X Controller Error:");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
