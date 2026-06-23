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

    const requestUrl = `https://x.com/${username}`;
    
    // Attempt navigation with domcontentloaded wait state
    const pageResponse = await page.goto(requestUrl, {
      waitUntil: "domcontentloaded",
      timeout: 8000,
    });

    await page.waitForTimeout(2000);

    const html = await page.content();
    
    // Map response metadata to standard console.log format requested
    const response = {
      status: pageResponse ? pageResponse.status() : 500,
      headers: pageResponse ? pageResponse.headers() : {}
    };

    console.log("USERNAME:", username);
    console.log("REQUEST URL:", requestUrl);
    console.log("HTTP STATUS:", response.status);
    console.log("CONTENT TYPE:", response.headers["content-type"] || "unknown");
    console.log("HTML LENGTH:", html?.length || 0);

    const data = await page.evaluate(() => {
      const body = document.body.innerText;
      return {
        body,
        title: document.title,
      };
    });

    const bodyText = data.body;
    const lowerBody = bodyText.toLowerCase();
    const lowerTitle = data.title.toLowerCase();

    // Granular block reasons checks
    if (page.url().includes("login") || lowerBody.includes("log in") || lowerBody.includes("sign in") || lowerTitle.includes("login")) {
      throw new Error("X returned login page");
    }
    if (lowerBody.includes("rate limit") || lowerBody.includes("rate_limit") || lowerBody.includes("too many requests")) {
      throw new Error("X returned rate limit page");
    }
    if (lowerBody.includes("suspicious activity") || lowerBody.includes("suspicious")) {
      throw new Error("suspicious activity detected");
    }
    if (lowerBody.includes("javascript is not enabled") || lowerBody.includes("javascript required") || lowerBody.includes("enable javascript")) {
      throw new Error("javascript required");
    }
    if (lowerBody.includes("this account doesn’t exist") || lowerBody.includes("account doesn't exist")) {
      throw new Error("Profile not found");
    }

    const followers = bodyText.match(/([\d.,]+[KMB]?)\s*Followers/i)?.[1];
    
    if (!followers) {
      if (response.status === 403 || response.status === 401) {
        throw new Error("X returned access denied");
      }
      throw new Error("HTML structure changed");
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
