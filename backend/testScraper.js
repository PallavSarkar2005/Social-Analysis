import { scrapeXProfile } from "./scrapers/xScraper.js";

const usernames = ["elonmusk", "nasa", "OpenAI", "github", "netflix"];

async function testScraper() {
  const results = [];

  for (const username of usernames) {
    try {
      const profile = await scrapeXProfile(username);

      results.push({
        Username: profile.username,
        Name: profile.name,
        Followers: profile.followers,
        Following: profile.following,
        Posts: profile.posts,
      });
    } catch (error) {
      results.push({
        Username: username,
        Error: error.message,
      });
    }
  }

  console.table(results);
}

await testScraper();
