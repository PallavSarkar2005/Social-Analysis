import { getBrowser } from "./browser.js";

export const scrapeXProfile = async (username) => {
  let page;

  try {
    const browser = await getBrowser();

    page = await browser.newPage();

    // Block heavy resources
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();

      if (type === "image" || type === "media" || type === "font") {
        return route.abort();
      }

      route.continue();
    });

    await page.goto(`https://x.com/${username}`, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });

    await page.waitForTimeout(1500);

    const data = await page.evaluate(() => {
      const body = document.body.innerText;

      const extract = (regex) => body.match(regex)?.[1] || "0";

      return {
        body,
        title: document.title,
      };
    });

    const bodyText = data.body;

    const followers =
      bodyText.match(/([\d.,]+[KMB]?)\s*Followers/i)?.[1] || "0";

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
          timeout: 3000,
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

    return {
      username,
      name,
      bio,
      followers,
      following,
      posts,
      joinedDate,
      profileUrl: `https://x.com/${username}`,
    };
  } catch (err) {
    console.error("SCRAPER ERROR:", err.message);

    return null;
  } finally {
    if (page) {
      await page.close();
    }
  }
};
