import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export const fetchWithTwscrape = async (username) => {
  console.log(`[Twscrape Provider] Attempting to fetch X profile for @${username}`);
  
  const cleanUsername = username.replace("@", "").trim();
  
  try {
    // Executes: twscrape user_by_username <username>
    const { stdout } = await execPromise(`twscrape user_by_username ${cleanUsername}`);
    
    const data = JSON.parse(stdout.trim());
    
    console.log(`[Twscrape Provider] Successfully fetched data for @${username}`);
    return {
      username: data.username || cleanUsername,
      name: data.displayname || data.name || cleanUsername,
      bio: data.rawDescription || data.bio || "",
      followers: Number(data.followersCount || data.followers || 0),
      following: Number(data.friendsCount || data.following || 0),
      tweetCount: Number(data.statusesCount || data.tweetCount || 0),
      verified: !!data.verified,
      profileImage: data.profileImageUrl || data.profileImage || "",
      recentTweets: data.recentTweets || [],
      source: "Live Data",
    };
  } catch (err) {
    const isMissing = err.message.includes("not recognized") || 
                      err.message.includes("not found") || 
                      err.message.includes("ENOENT") || 
                      err.message.includes("command not found");
    if (isMissing) {
      const runErr = new Error("Python runtime unavailable");
      runErr.isRuntimeUnavailable = true;
      runErr.provider = "twscrape";
      throw runErr;
    }
    throw new Error(`Twscrape failed: ${err.message}`);
  }
};
