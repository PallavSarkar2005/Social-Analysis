import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";

const execPromise = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

export const fetchWithTwikit = async (username) => {
  const cleanUsername = username.replace("@", "").trim();
  const scriptPath = path.join(__dirname, "../../scripts/twikit_fetch.py");
  const command = `python "${scriptPath}" ${cleanUsername}`;
  const providerName = "twikit";
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
    console.log("stdout:", err.stdout || "(empty)");
    console.log("stderr:", err.stderr || "(empty)");
    console.log("provider failure reason:", err.message);
    console.log("--- Diagnostic Log End ---\n");

    const runErr = new Error(err.message);
    runErr.provider = providerName;
    runErr.command = command;
    runErr.stdout = err.stdout || "";
    runErr.stderr = err.stderr || "";
    runErr.pythonVersion = pythonVersion;
    runErr.errorDetails = err.stderr ? err.stderr.trim() : err.message;
    throw runErr;
  }
};
