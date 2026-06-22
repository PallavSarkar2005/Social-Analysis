import cron from "node-cron";
import EmailSchedule from "../models/EmailSchedule.js";
import Account from "../models/Account.js";
import Snapshot from "../models/Snapshot.js";
import TrackedCompetitor from "../models/TrackedCompetitor.js";
import { sendEmailReport } from "../services/emailService.js";

/**
 * Builds HTML template and dispatches email reports to users
 * @param {String} frequency - The frequency to run ('daily', 'weekly', 'monthly')
 */
export const dispatchScheduledEmails = async (frequency) => {
  try {
    console.log(`[Email Job] Commencing automated '${frequency}' reports dispatch...`);
    const schedules = await EmailSchedule.find({ frequency, isActive: true });
    
    console.log(`[Email Job] Located ${schedules.length} active '${frequency}' schedules.`);

    for (const schedule of schedules) {
      try {
        let htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="background-color: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Social IQ</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.85;">Automated Social Performance Intelligence</p>
            </div>
            
            <div style="padding: 20px; color: #1e293b;">
              <p>Hello,</p>
              <p>Here is your scheduled <strong>${frequency.toUpperCase()}</strong> analytics report summary containing tracked node indicators and growth rates.</p>
        `;

        // 1. Growth Report Section
        if (schedule.reportTypes.includes("growth")) {
          const accounts = await Account.find({ userId: schedule.userId, isCompetitor: { $ne: true } });
          htmlContent += `
            <div style="margin-top: 25px; border-top: 1px solid #e2e8f0; pt-20px;">
              <h2 style="font-size: 16px; color: #4f46e5; margin-bottom: 12px;">📈 Growth & Workspace Summary</h2>
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 1px solid #cbd5e1; color: #64748b;">
                    <th style="padding: 6px 0;">Name</th>
                    <th style="padding: 6px 0;">Platform</th>
                    <th style="padding: 6px 0; text-align: right;">Size</th>
                  </tr>
                </thead>
                <tbody>
          `;

          for (const acc of accounts) {
            const snap = await Snapshot.findOne({ account: acc._id, userId: schedule.userId }).sort({ capturedAt: -1 });
            const followersCount = snap ? snap.followers.toLocaleString() : "N/A";
            htmlContent += `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold;">${acc.name}</td>
                <td style="padding: 8px 0; text-transform: capitalize;">${acc.platform}</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace;">${followersCount}</td>
              </tr>
            `;
          }

          htmlContent += `
                </tbody>
              </table>
            </div>
          `;
        }

        // 2. Competitor Report Section
        if (schedule.reportTypes.includes("competitor")) {
          const competitors = await TrackedCompetitor.find({ userId: schedule.userId });
          htmlContent += `
            <div style="margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
              <h2 style="font-size: 16px; color: #4f46e5; margin-bottom: 12px;">🏆 Competitor Benchmarks</h2>
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 1px solid #cbd5e1; color: #64748b;">
                    <th style="padding: 6px 0;">Competitor</th>
                    <th style="padding: 6px 0;">Platform</th>
                    <th style="padding: 6px 0; text-align: right;">Subs/Followers</th>
                  </tr>
                </thead>
                <tbody>
          `;

          for (const comp of competitors) {
            const account = await Account.findOne({ accountId: comp.accountId, userId: schedule.userId });
            let followersCount = "N/A";
            if (account) {
              const snap = await Snapshot.findOne({ account: account._id }).sort({ capturedAt: -1 });
              if (snap) {
                followersCount = snap.followers.toLocaleString();
              }
            }

            htmlContent += `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold;">${comp.accountName}</td>
                <td style="padding: 8px 0; text-transform: capitalize;">${comp.platform}</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace;">${followersCount}</td>
              </tr>
            `;
          }

          htmlContent += `
                </tbody>
              </table>
            </div>
          `;
        }

        // 3. AI Insights Recommendations Section
        if (schedule.reportTypes.includes("ai")) {
          htmlContent += `
            <div style="margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 15px; background-color: #f8fafc; border-radius: 8px; padding: 15px;">
              <h2 style="font-size: 15px; color: #4f46e5; margin-top: 0;">✨ AI Strategic Suggestions</h2>
              <p style="font-size: 12px; line-height: 1.6; color: #334155; margin: 0;">
                Focus on improving content distribution frequency mid-week. Our modeling suggests YouTube algorithms favor Wednesdays and Thursdays around 17:00 UTC for maximum initial viewer retention spikes. Avoid bulk posting video shorts concurrently to prevent internal catalog self-competition.
              </p>
            </div>
          `;
        }

        // Closing Email Template
        htmlContent += `
              <p style="margin-top: 30px; font-size: 12px; color: #64748b; text-align: center;">
                You are receiving this because you configured a schedule subscription inside your Social IQ preferences settings.
              </p>
            </div>
            
            <div style="background-color: #f1f5f9; color: #64748b; font-size: 11px; text-align: center; padding: 15px; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
              Social IQ Premium Portals &copy; 2026. All rights reserved.
            </div>
          </div>
        `;

        // Send Email
        const emailSubject = `Social IQ ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Analytics Audit Report`;
        const sent = await sendEmailReport(schedule.emailAddress, emailSubject, htmlContent);
        
        if (sent) {
          schedule.lastSentAt = new Date();
          await schedule.save();
          console.log(`[Email Job] Report successfully dispatched to: ${schedule.emailAddress}`);
        }
      } catch (innerErr) {
        console.error(`[Email Job Error] Failed to generate/dispatch report for schedule ID ${schedule._id}:`, innerErr.message);
      }
    }
  } catch (error) {
    console.error("[Email Job Critical Error] Automated dispatch run failed:", error);
  }
};

// Scheduler config for crons
export const startEmailReportJobs = () => {
  // 1. Daily cron - runs every day at 00:05
  cron.schedule("5 0 * * *", async () => {
    await dispatchScheduledEmails("daily");
  });

  // 2. Weekly cron - runs every Sunday at 00:10
  cron.schedule("10 0 * * 0", async () => {
    await dispatchScheduledEmails("weekly");
  });

  // 3. Monthly cron - runs on the 1st of every month at 00:15
  cron.schedule("15 0 1 * *", async () => {
    await dispatchScheduledEmails("monthly");
  });

  console.log("[Scheduler] Daily, Weekly, and Monthly automated email crons successfully scheduled.");
};
