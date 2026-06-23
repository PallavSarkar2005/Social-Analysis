import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";

const execPromise = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const fetchWithTwikit = async (username) => {
  console.log(`[Twikit Provider] Attempting to fetch X profile for @${username}`);
  
  const cleanUsername = username.replace("@", "").trim();
  
  try {
    // Executes python script to interact with twikit library
    const scriptPath = path.join(__dirname, "../../scripts/twikit_fetch.py");
    const { stdout } = await execPromise(`python "${scriptPath}" ${cleanUsername}`);
    
    const data = JSON.parse(stdout.trim());
    
    console.log(`[Twikit Provider] Successfully fetched data for @${username}`);
    return {
      username: data.username || cleanUsername,
      name: data.name || cleanUsername,
      bio: data.bio || "",
      followers: Number(data.followers || 0),
      following: Number(data.following || 0),
      tweetCount: Number(data.tweetCount || 0),
      verified: !!data.verified,
      profileImage: data.profileImage || "",
      recentTweets: data.recentTweets || [],
      source: "Live Data",
    };
  } catch (err) {
    console.warn(`[Twikit Provider] Failed for @${username}:`, err.message);
    throw new Error(`Twikit failed: ${err.message}`);
  }
};
