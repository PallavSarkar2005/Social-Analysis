import cron from "node-cron";

import { syncAllYoutubeChannels } from "./youtubeSyncJob.js";

export const startCronJobs = () => {
  cron.schedule(
    "0 */6 * * *",
    async () => {
      console.log(
        "Running Scheduled Sync..."
      );

      await syncAllYoutubeChannels();
    }
  );

  console.log(
    "Cron Jobs Started"
  );
};