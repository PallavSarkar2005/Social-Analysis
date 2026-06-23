import { fetchWithTwscrape } from "./providers/twscrapeProvider.js";
import { fetchWithTwikit } from "./providers/twikitProvider.js";
import { getCachedProfile, setCachedProfile } from "./providers/cacheProvider.js";

// Demo dataset provider - final fallback
const getDemoData = (username) => {
  console.log(`[Demo Provider] Supplying fallback demo data for @${username}`);
  const cleanUsername = username.replace("@", "").trim();
  return {
    username: cleanUsername,
    name: `${cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1)} (Demo)`,
    bio: `This is a demo profile bio for @${cleanUsername}. Connect with them to learn more!`,
    followers: 12500,
    following: 450,
    tweetCount: 1200,
    verified: true,
    profileImage: "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png",
    recentTweets: [
      { id: "1", text: `Analyzing social trends for @${cleanUsername}. The data looks promising!`, createdAt: new Date().toISOString() },
      { id: "2", text: "Excited to launch our new Social Analytics dashboard today! Check it out.", createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: "3", text: "Building premium tech solutions for modern brands. #Analytics #SocialMedia", createdAt: new Date(Date.now() - 172800000).toISOString() }
    ],
    source: "Demo Data"
  };
};

export const fetchXProfileData = async (username) => {
  let twscrapeErr = null;

  // 1. Try Twscrape
  console.log("Provider Start:", "twscrape");
  try {
    const data = await fetchWithTwscrape(username);
    console.log("Provider Success:", "twscrape");
    await setCachedProfile(username, data);
    return { ...data, source: "Live Data" };
  } catch (err) {
    twscrapeErr = err;
    console.log("Provider Failure:", "twscrape", err.message || err);
  }

  // 2. Try Twikit
  console.log("Provider Start:", "twikit");
  try {
    const data = await fetchWithTwikit(username);
    console.log("Provider Success:", "twikit");
    await setCachedProfile(username, data);
    return { ...data, source: "Live Data" };
  } catch (err) {
    console.log("Provider Failure:", "twikit", err.message || err);

    // Fail loudly with the exact root cause
    const mainErr = twscrapeErr || err;
    const pipelineErr = new Error("X Scraping Pipeline Failed");
    pipelineErr.isPipelineFailure = true;
    pipelineErr.provider = mainErr.provider || "twscrape";
    
    let rootCause = mainErr.errorDetails || mainErr.message;
    if (rootCause.includes("ModuleNotFoundError")) {
      const match = rootCause.match(/ModuleNotFoundError: [^\n]+/);
      if (match) rootCause = match[0];
    }
    
    pipelineErr.errorDetails = rootCause;
    throw pipelineErr;
  }
};
