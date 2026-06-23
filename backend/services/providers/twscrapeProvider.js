import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

const getPythonVersion = async () => {
  try {
    const { stdout, stderr } = await execPromise("python --version");
    return (stdout || stderr || "").trim();
  } catch (err) {
    try {
      const { stdout, stderr } = await execPromise("python3 --version");
      return (stdout || stderr || "").trim();
    } catch (err2) {
      return "Python not found";
    }
  }
};

export const fetchWithTwscrape = async (username) => {
  const cleanUsername = username.replace("@", "").trim();
  const command = `twscrape user_by_username ${cleanUsername}`;
  const providerName = "twscrape";
  const pythonVersion = await getPythonVersion();

  console.log("\n--- Diagnostic Log Start ---");
  console.log("selected provider:", providerName);
  console.log("executed command:", command);
  console.log("Python version:", pythonVersion);

  try {
    const { stdout, stderr } = await execPromise(command);
    
    console.log("stdout:", stdout || "(empty)");
    console.log("stderr:", stderr || "(empty)");
    console.log("--- Diagnostic Log End ---\n");

    const data = JSON.parse(stdout.trim());
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
    console.log("stdout:", err.stdout || "(empty)");
    console.log("stderr:", err.stderr || "(empty)");
    console.log("provider failure reason:", err.message);
    console.log("--- Diagnostic Log End ---\n");

    const isMissing = err.message.includes("not recognized") || 
                      err.message.includes("not found") || 
                      err.message.includes("ENOENT") || 
                      err.message.includes("command not found");
    
    const runErr = new Error(err.message);
    runErr.provider = providerName;
    runErr.command = command;
    runErr.stdout = err.stdout || "";
    runErr.stderr = err.stderr || "";
    runErr.pythonVersion = pythonVersion;
    
    if (isMissing) {
      runErr.isRuntimeUnavailable = true;
      runErr.errorDetails = "Python runtime unavailable (twscrape command not found)";
    } else {
      runErr.errorDetails = err.stderr ? err.stderr.trim() : err.message;
    }
    throw runErr;
  }
};
