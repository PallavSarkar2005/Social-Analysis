import { fetchXProfileData } from "../services/xService.js";

export const scrapeXProfile = async (username) => {
  // Delegate fetching to the fallback provider abstraction layer
  const profile = await fetchXProfileData(username);
  
  // Format the output object to match the schema expected by downstream controllers, jobs, and tools
  return {
    username: profile.username,
    name: profile.name,
    bio: profile.bio || "",
    followers: String(profile.followers),
    following: String(profile.following),
    posts: String(profile.tweetCount || 0),
    joinedDate: "", // Default empty string as we don't scrape it now
    profileUrl: `https://x.com/${profile.username}`,
    isFallback: profile.source !== "Live Data",
    source: profile.source, // Keep the source identifier ("Live Data", "Cached Data", "Demo Data")
    verified: profile.verified,
    profileImage: profile.profileImage || "",
    recentTweets: profile.recentTweets || []
  };
};
