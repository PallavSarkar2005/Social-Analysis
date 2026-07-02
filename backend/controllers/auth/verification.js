import crypto from "crypto";
import User from "../../models/User.js";
import { hashToken } from "../../utils/crypto.js";
import { sendEmailReport } from "../../services/emailService.js";
import { getAppUrl } from "../../services/authService.js";
import {
  getWelcomeEmail,
  getVerifyEmailTemplate,
} from "../../services/emailTemplateService.js";

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    const hashedTokenVal = hashToken(token);
    const user = await User.findOne({
      emailVerificationToken: hashedTokenVal,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Verification token is invalid or has expired",
      });
    }

    user.isEmailVerified = true;
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    try {
      const welcomeHtml = getWelcomeEmail(user.name);
      await sendEmailReport(
        user.email,
        "Social IQ - Welcome to the Platform!",
        welcomeHtml,
      );
    } catch (mailError) {
      console.error(
        "[Mail Delivery Warning] Failed to dispatch welcome email:",
        mailError.message,
      );
    }

    res.json({
      success: true,
      message:
        "Email verified successfully. You can now access your workspace.",
    });
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const email = req.body?.email || req.user?.email;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required to resend verification link.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        success: true,
        message: "If the email exists, a verification link has been resent.",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "This email address is already verified.",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = hashToken(verificationToken);
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const verificationLink = `${getAppUrl(req)}/verify-email?token=${verificationToken}`;
    const emailHtml = getVerifyEmailTemplate(user.name, verificationLink);
    await sendEmailReport(
      user.email,
      "Social IQ - Verify Your Account",
      emailHtml,
    );

    res.json({
      success: true,
      message: "If the email exists, a verification link has been resent.",
    });
  } catch (error) {
    next(error);
  }
};
