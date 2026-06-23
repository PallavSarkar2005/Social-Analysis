import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";
import { scrapeXProfile } from "../scrapers/xScraper.js";

/*
========================================
Convert Followers
========================================
*/
const parseNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;

  const clean = String(value).replace(/,/g, "").trim();

  if (clean.endsWith("K")) {
    return Math.round(parseFloat(clean) * 1000);
  }

  if (clean.endsWith("M")) {
    return Math.round(parseFloat(clean) * 1000000);
  }

  if (clean.endsWith("B")) {
    return Math.round(parseFloat(clean) * 1000000000);
  }

  return Number(clean) || 0;
};

/*
========================================
Unescape URL
========================================
Converts HTML entities (like &#x2F;, &amp;) back to normal characters.
Global XSS sanitization encodes URL characters, which we must reverse.
*/
const unescapeUrl = (str) => {
  if (typeof str !== "string") return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
};

/*
========================================
Extract X Data
========================================
Parses user profiles and post/tweet URLs for X/Twitter.
Supports watch, mobile, status, and custom domain variations.
*/
export const extractXData = (url) => {
  console.log("INPUT URL:", url);
  
  if (!url || typeof url !== "string") {
    console.log("PARSED RESULT: null (empty or invalid string)");
    return null;
  }

  const unescaped = unescapeUrl(url.trim());
  console.log("UNESCAPED URL:", unescaped);

  // If it's a handle starting with @
  if (unescaped.startsWith("@")) {
    const username = unescaped.slice(1);
    if (/^[a-zA-Z0-9_]{1,15}$/.test(username)) {
      const result = { type: "profile", username };
      console.log("PARSED RESULT:", result);
      return result;
    }
  }

  // Prepend protocol if missing
  let urlWithProtocol = unescaped;
  if (!/^https?:\/\//i.test(unescaped)) {
    urlWithProtocol = "https://" + unescaped;
  }

  try {
    const parsedUrl = new URL(urlWithProtocol);
    const host = parsedUrl.hostname.toLowerCase();
    
    // Check if the domain is X or Twitter
    const isXDomain = host === "x.com" || 
                      host === "twitter.com" || 
                      host.endsWith(".x.com") || 
                      host.endsWith(".twitter.com") ||
                      host === "t.co";
                      
    if (!isXDomain) {
      console.log("PARSED RESULT: null (not an X/Twitter domain)");
      return null;
    }

    const path = parsedUrl.pathname;
    const parts = path.split("/").filter(Boolean);

    if (parts.length === 0) {
      console.log("PARSED RESULT: null (pathname is empty)");
      return null;
    }

    const username = parts[0];
    const reservedWords = ["home", "explore", "notifications", "messages", "search", "settings", "i", "tos", "privacy", "rules", "about", "status", "hashtag"];
    if (reservedWords.includes(username.toLowerCase()) || !/^[a-zA-Z0-9_]{1,15}$/.test(username)) {
      console.log("PARSED RESULT: null (invalid username or reserved word:", username, ")");
      return null;
    }

    // Check if it's a status/post link
    if (parts.length >= 2 && parts[1].toLowerCase() === "status") {
      const tweetId = parts[2];
      if (tweetId && /^\d+$/.test(tweetId)) {
        const result = { type: "post", username, tweetId };
        console.log("PARSED RESULT:", result);
        return result;
      } else {
        console.log("PARSED RESULT: null (missing or invalid tweetId for status path)");
        return null;
      }
    }

    // Otherwise, it's a profile
    const result = { type: "profile", username };
    console.log("PARSED RESULT:", result);
    return result;
  } catch (err) {
    console.error("LOG: [extractXData] Parsing URL failed:", err.message);
    try {
      const postRegex = /(?:x|twitter)\.com(?:\/|&#x2F;)(?:mobile\.)?([a-zA-Z0-9_]{1,15})(?:\/|&#x2F;)status(?:\/|&#x2F;)(\d+)/i;
      const profileRegex = /(?:x|twitter)\.com(?:\/|&#x2F;)(?:mobile\.)?([a-zA-Z0-9_]{1,15})/i;

      const postMatch = unescaped.match(postRegex);
      if (postMatch) {
        const result = { type: "post", username: postMatch[1], tweetId: postMatch[2] };
        console.log("PARSED RESULT (regex backup post):", result);
        return result;
      }

      const profileMatch = unescaped.match(profileRegex);
      if (profileMatch) {
        const result = { type: "profile", username: profileMatch[1] };
        console.log("PARSED RESULT (regex backup profile):", result);
        return result;
      }
    } catch (regexErr) {
      console.error("LOG: [extractXData] Regex backup failed:", regexErr.message);
    }
  }

  console.log("PARSED RESULT: null (failed all parsing)");
  return null;
};

/*
========================================
Get Parsing Error Reason
========================================
Inspects URLs to return granular error descriptions.
*/
export const getParsingErrorReason = (url) => {
  const clean = unescapeUrl(url || "").trim();
  if (!clean) return "Invalid URL format";
  
  let urlWithProtocol = clean;
  if (!/^https?:\/\//i.test(clean)) {
    urlWithProtocol = "https://" + clean;
  }
  
  try {
    const parsed = new URL(urlWithProtocol);
    const host = parsed.hostname.toLowerCase();
    const isXDomain = host === "x.com" || 
                      host === "twitter.com" || 
                      host.endsWith(".x.com") || 
                      host.endsWith(".twitter.com") ||
                      host === "t.co";
    
    if (!isXDomain) return "Invalid URL format";
    
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "Username missing";
    
    const username = parts[0];
    if (username.toLowerCase() === "status") return "Username missing";
    
    if (parts.length >= 2 && parts[1].toLowerCase() === "status") {
      if (parts.length < 3 || !parts[2]) {
        return "Tweet ID missing";
      }
    }
    
    return "Unsupported X URL format";
  } catch (err) {
    return "Invalid URL format";
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

    if (!url || typeof url !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid URL format",
      });
    }

    const parsed = extractXData(url);

    if (!parsed) {
      const reason = getParsingErrorReason(url);
      return res.status(400).json({
        success: false,
        message: reason,
      });
    }

    if (parsed.type === "post") {
      // Returns exact response when X API integration (needed for posts) is not configured yet
      return res.status(400).json({
        success: false,
        message: "X API integration not configured",
      });
    }

    const { username } = parsed;

    let profile;
    try {
      profile = await scrapeXProfile(username);
    } catch (scrapeErr) {
      console.error("[X Controller Scraper Error]:", scrapeErr.message);
      return res.status(403).json({
        success: false,
        message: "X API integration not configured. Current implementation relies on scraping and X is blocking access.",
        reason: scrapeErr.message
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
        source: profile.source || "Live Data",
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

/*
========================================
Test Cases documentation & references:
========================================
The extractXData helper is verified against:
- https://x.com/elonmusk                 => { type: 'profile', username: 'elonmusk' }
- https://twitter.com/elonmusk           => { type: 'profile', username: 'elonmusk' }
- https://x.com/elonmusk/status/123456   => { type: 'post', username: 'elonmusk', tweetId: '123456' }
- https://twitter.com/elonmusk/status/12 => { type: 'post', username: 'elonmusk', tweetId: '12' }
- x.com/elonmusk                         => { type: 'profile', username: 'elonmusk' }
- twitter.com/elonmusk                   => { type: 'profile', username: 'elonmusk' }
- https://mobile.twitter.com/elonmusk    => { type: 'profile', username: 'elonmusk' }
- https:&#x2F;&#x2F;x.com&#x2F;elonmusk      => { type: 'profile', username: 'elonmusk' }
*/
