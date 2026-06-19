import { getBrowser } from "./browser.js";

export const scrapeXProfile = async (username) => {
  let page;

  try {
    const browser = await getBrowser();

    // Create page with custom User-Agent and headers to prevent basic blocks
    page = await browser.newPage({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
      }
    });

    // Abort media requests to speed up scraping
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (type === "image" || type === "media" || type === "font") {
        return route.abort();
      }
      route.continue();
    });

    console.log(`[X Scraper] Navigating to X profile: https://x.com/${username}`);
    
    // Attempt navigation with domcontentloaded wait state
    await page.goto(`https://x.com/${username}`, {
      waitUntil: "domcontentloaded",
      timeout: 8000,
    });

    await page.waitForTimeout(2000);

    const data = await page.evaluate(() => {
      const body = document.body.innerText;
      return {
        body,
        title: document.title,
      };
    });

    const bodyText = data.body;
    console.log(`[X Scraper] Document Title: ${data.title}`);

    // If redirected to login, X is blocking us
    if (bodyText.includes("Log in to") || bodyText.includes("Sign in") || page.url().includes("login")) {
      console.warn(`[X Scraper] Blocked: Redirected to login page or bot gate encountered.`);
      throw new Error("X.com redirected request to login gateway (rate limit/bot detection).");
    }

    const followers =
      bodyText.match(/([\d.,]+[KMB]?)\s*Followers/i)?.[1];
    
    if (!followers) {
      throw new Error("Followers metric not found in page structure.");
    }

    const following =
      bodyText.match(/([\d.,]+[KMB]?)\s*Following/i)?.[1] || "0";

    const posts =
      bodyText.match(/([\d.,]+[KMB]?)\s*Posts/i)?.[1] ||
      bodyText.match(/([\d.,]+[KMB]?)\s*posts/i)?.[1] ||
      "0";

    let name = username;
    try {
      const txt = await page
        .locator('[data-testid="UserName"]')
        .first()
        .textContent({
          timeout: 2000,
        });

      if (txt) {
        name = txt.split("@")[0].trim();
      }
    } catch {}

    let bio = "";
    try {
      bio =
        (await page.locator('[data-testid="UserDescription"]').textContent({
          timeout: 2000,
        })) || "";
    } catch {}

    const joinedDate = bodyText.match(/Joined\s([A-Za-z]+\s\d{4})/i)?.[1] || "";

    console.log(`[X Scraper] Successfully scraped live profile stats for @${username}`);

    return {
      username,
      name,
      bio,
      followers,
      following,
      posts,
      joinedDate,
      profileUrl: `https://x.com/${username}`,
      isFallback: false,
    };
  } catch (err) {
    console.error(`[X Scraper Failure] Error for @${username}:`, err.message);
    throw err;
  } finally {
    if (page) {
      await page.close();
    }
  }
};
