import { PlaywrightCrawler } from "crawlee";

export const scrapeXProfile = async (username) => {
  let profileData = null;

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 1,

    launchContext: {
      launchOptions: {
        headless: true,
      },
    },

    async requestHandler({ page }) {
      try {
        await page.goto(`https://x.com/${username}`, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });

        await page.waitForTimeout(8000);

        const bodyText =
          (await page.evaluate(() => document.body.innerText)) || "";

        const nameElement = await page
          .locator('[data-testid="UserName"]')
          .first()
          .textContent()
          .catch(() => "");

        const bioElement = await page
          .locator('[data-testid="UserDescription"]')
          .textContent()
          .catch(() => "");

        const name = nameElement?.split("@")[0]?.trim() || username;

        const followersMatch = bodyText.match(/([\d.,]+[KMB]?)\sFollowers/i);

        const followingMatch = bodyText.match(/([\d.,]+[KMB]?)\sFollowing/i);

        const postsMatch = bodyText.match(/([\d.,]+[KMB]?)\sposts/i);

        profileData = {
          username,

          name,

          bio: bioElement || "",

          followers: followersMatch?.[1] || "0",

          following: followingMatch?.[1] || "0",

          posts: postsMatch?.[1] || "0",

          profileUrl: `https://x.com/${username}`,
        };

        console.log("X PROFILE:");
        console.log(profileData);

        // Debug output
        const followingIndex = bodyText.indexOf("Following");

        if (followingIndex > -1) {
          console.log(
            "\n===== FOLLOWING DEBUG =====\n",
            bodyText.substring(
              Math.max(0, followingIndex - 100),
              followingIndex + 100,
            ),
          );
        }
      } catch (error) {
        console.error("X Scraper Error:", error.message);
      }
    },
  });

  await crawler.run([`https://x.com/${username}`]);

  return profileData;
};
