import { scrapeXProfile } from "../scrapers/xScraper.js";

const extractYoutubeId = (url) => {
  const match = url.match(/@([^/?]+)/);
  return match?.[1];
};

const extractXUsername = (url) => {
  const match = url.match(/x\.com\/([^/?]+)/i);
  return match?.[1];
};

export const compareAccounts = async (req, res) => {
  try {
    const { url1, url2 } = req.body;

    if (!url1 || !url2) {
      return res.status(400).json({
        success: false,
        message: "Both URLs are required",
      });
    }

    /*
      X VS X
    */

    if (url1.includes("x.com") && url2.includes("x.com")) {
      const username1 = extractXUsername(url1);
      const username2 = extractXUsername(url2);

      const account1 = await scrapeXProfile(username1);
      const account2 = await scrapeXProfile(username2);

      return res.json({
        success: true,
        type: "x",
        account1,
        account2,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Only X vs X supported initially",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
