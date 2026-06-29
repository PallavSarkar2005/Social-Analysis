import nodemailer from "nodemailer";

/**
 * Returns a configured Nodemailer transporter or a dynamic Ethereal test transporter
 */
export const getTransporter = async () => {
  const host = process.env.EMAIL_HOST || "smtp.ethereal.email";
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER || "";
  const pass = process.env.EMAIL_PASS || "";

  // If no custom SMTP credentials provided, log warning and use ethereal mock fallback
  if (!user || !pass) {
    console.log("[Email Service] SMTP credentials not fully configured in env. Creating Ethereal test account dynamically...");
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // True for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Utility to send an HTML email report
 * @param {String} to - Recipient email
 * @param {String} subject - Email subject line
 * @param {String} htmlBody - HTML body content
 */
export const sendEmailReport = async (to, subject, htmlBody) => {
  try {
    const transporter = await getTransporter();
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Social IQ" <reports@socialiq.ai>',
      to,
      subject,
      html: htmlBody,
    });

    console.log(`[Email Service] Message sent successfully. Message ID: ${info.messageId}`);
    console.log("[Email Service] Full transporter.sendMail result:", JSON.stringify(info, null, 2));
    // If using Ethereal fallback, log test URL
    const testUrl = nodemailer.getTestMessageUrl(info);
    if (testUrl) {
      console.log(`[Email Service] Mock Ethereal View URL: ${testUrl}`);
    }
    return true;
  } catch (error) {
    console.error("[Email Service Error] Failed to dispatch email report:", error.message);
    throw error;
  }
};
