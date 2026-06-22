import nodemailer from "nodemailer";

/**
 * Returns a configured Nodemailer transporter
 */
export const getTransporter = () => {
  const host = process.env.EMAIL_HOST || "smtp.ethereal.email";
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER || "";
  const pass = process.env.EMAIL_PASS || "";

  // If no custom SMTP credentials provided, log warning and use ethereal mock fallback
  if (!user || !pass) {
    console.log("[Email Service] SMTP credentials not fully configured in env. Using Ethereal mock smtp server.");
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
    const transporter = getTransporter();
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Social IQ Reports" <reports@socialiq.ai>',
      to,
      subject,
      html: htmlBody,
    });

    console.log(`[Email Service] Message sent successfully. Message ID: ${info.messageId}`);
    // If using Ethereal fallback, log test URL
    if (nodemailer.getTestMessageUrl(info)) {
      console.log(`[Email Service] Mock Ethereal View URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return true;
  } catch (error) {
    console.error("[Email Service Error] Failed to dispatch email report:", error.message);
    return false;
  }
};
