import { chromium } from "playwright";

let browser = null;

export const getBrowser = async () => {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    console.log("BROWSER CREATED");
  }

  return browser;
};