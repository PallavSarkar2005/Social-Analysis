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
  console.log(`\n========================================`);
  console.log(`[xService] Resolving profile data for @${username}`);
  console.log(`========================================`);
  
  // 1. Try Twscrape
  try {
    const data = await fetchWithTwscrape(username);
    console.log(`[xService] Data supplied by: Twscrape (Live)`);
    // Cache the successful live response
    await setCachedProfile(username, data);
    return { ...data, source: "Live Data" };
  } catch (err) {
    console.warn(`[xService] Twscrape failed: ${err.message}. Trying Twikit...`);
  }

  // 2. Try Twikit
  try {
    const data = await fetchWithTwikit(username);
    console.log(`[xService] Data supplied by: Twikit (Live)`);
    // Cache the successful live response
    await setCachedProfile(username, data);
    return { ...data, source: "Live Data" };
  } catch (err) {
    console.warn(`[xService] Twikit failed: ${err.message}. Trying MongoDB Cache...`);
  }

  // 3. Try MongoDB Cache
  try {
    const data = await getCachedProfile(username);
    if (data) {
      console.log(`[xService] Data supplied by: MongoDB Cache`);
      return { ...data, source: "Cached Data" };
    }
  } catch (err) {
    console.error(`[xService] MongoDB Cache failed:`, err.message);
  }

  // 4. Final Fallback: Demo Dataset
  const data = getDemoData(username);
  console.log(`[xService] Data supplied by: Demo Dataset`);
  return data;
};
