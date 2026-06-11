import cron from "node-cron";
import axios from "axios";

import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";

export const startSnapshotJob = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("Running daily snapshot job...");

      const accounts = await Account.find({
        platform: "youtube",
      });

      for (const account of accounts) {
        const response = await axios.get(
          "https://www.googleapis.com/youtube/v3/channels",
          {
            params: {
              part: "statistics",
              id: account.accountId,
              key: process.env.YOUTUBE_API_KEY,
            },
          },
        );

        const channel = response.data.items?.[0];

        if (!channel) continue;

        await Snapshot.create({
          account: account._id,
          followers: Number(channel.statistics.subscriberCount || 0),
          views: Number(channel.statistics.viewCount || 0),
        });

        console.log(`Snapshot saved for ${account.name}`);
      }
    } catch (error) {
      console.error(error);
    }
  });
};
