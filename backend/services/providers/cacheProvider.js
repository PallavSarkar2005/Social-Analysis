import XCache from "../../models/XCache.js";

export const getCachedProfile = async (username) => {
  console.log(`[Cache Provider] Checking MongoDB cache for @${username}`);
  
  const cleanUsername = username.replace("@", "").trim().toLowerCase();
  
  try {
    const cached = await XCache.findOne({ username: cleanUsername });
    if (!cached) {
      console.log(`[Cache Provider] Cache miss for @${username}`);
      return null;
    }

    const ageMs = Date.now() - new Date(cached.updatedAt).getTime();
    const oneHourMs = 60 * 60 * 1000;

    if (ageMs > oneHourMs) {
      console.log(`[Cache Provider] Cache expired for @${username} (Age: ${Math.round(ageMs / 1000 / 60)}m)`);
      return null;
    }

    console.log(`[Cache Provider] Cache hit for @${username}`);
    return {
      username: cached.username,
      name: cached.name,
      bio: cached.bio || "",
      followers: cached.followers || 0,
      following: cached.following || 0,
      tweetCount: cached.tweetCount || 0,
      verified: !!cached.verified,
      profileImage: cached.profileImage || "",
      recentTweets: cached.recentTweets || [],
      source: "Cached Data",
    };
  } catch (err) {
    console.error(`[Cache Provider] Error reading cache for @${username}:`, err.message);
    return null;
  }
};

export const setCachedProfile = async (username, data) => {
  const cleanUsername = username.replace("@", "").trim().toLowerCase();
  
  try {
    await XCache.findOneAndUpdate(
      { username: cleanUsername },
      {
        username: cleanUsername,
        name: data.name || cleanUsername,
        bio: data.bio || "",
        followers: Number(data.followers || 0),
        following: Number(data.following || 0),
        tweetCount: Number(data.tweetCount || data.posts || 0),
        verified: !!data.verified,
        profileImage: data.profileImage || "",
        recentTweets: data.recentTweets || [],
      },
      { upsert: true, new: true }
    );
    console.log(`[Cache Provider] Successfully cached profile @${username}`);
  } catch (err) {
    console.error(`[Cache Provider] Error saving cache for @${username}:`, err.message);
  }
};
