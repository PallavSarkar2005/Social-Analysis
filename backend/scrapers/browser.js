import { chromium } from "playwright";

let browser = null;

export const getBrowser = async () => {
  if (!browser) {
    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-blink-features=AutomationControlled",
        ],
      });
      console.log("PLAYWRIGHT HEADLESS BROWSER LAUNCHED SUCCESS");
    } catch (error) {
      console.error("FAILED TO LAUNCH PLAYWRIGHT CHROMIUM:", error.message);
      throw error;
    }
  }

  return browser;
};