import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";

import { getChannelStats } from "../services/youtubeService.js";

export const syncAllYoutubeChannels =
  async () => {
    try {
      const accounts =
        await Account.find({
          platform: "youtube",
          isActive: true,
        });

      console.log(
        `Syncing ${accounts.length} channels...`
      );

      for (const account of accounts) {
        const channel =
          await getChannelStats(
            account.accountId
          );

        await Snapshot.create({
          account: account._id,

          followers: Number(
            channel.statistics
              .subscriberCount
          ),

          views: Number(
            channel.statistics
              .viewCount
          ),
        });

        console.log(
          `Synced ${account.name}`
        );
      }

      console.log(
        "Sync Complete"
      );
    } catch (error) {
      console.error(error);
    }
  };