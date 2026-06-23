import { fetchWithTwscrape } from "./providers/twscrapeProvider.js";
import { fetchWithTwikit } from "./providers/twikitProvider.js";
import { getCachedProfile, setCachedProfile } from "./providers/cacheProvider.js";


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
