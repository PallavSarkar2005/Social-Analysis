import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../../models/User.js";
import { hashToken } from "../../utils/crypto.js";
import { logSecurityEvent } from "../../utils/securityLogger.js";
import { sendEmailReport } from "../../services/emailService.js";
import { getAppUrl } from "../../services/authService.js";
import {
  revokeAllSessions,
  revokeOtherSessions,
} from "../../services/sessionService.js";
import {
  getForgotPasswordTemplate,
  getPasswordChangedTemplate,
} from "../../services/emailTemplateService.js";

const PASSWORD_HISTORY_LIMIT = 5;

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        success: true,
        message:
          "Password reset link has been dispatched if the email was registered.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = hashToken(resetToken);
    user.passwordResetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000);
    await user.save();

    const resetLink = `${getAppUrl(req)}/reset-password?token=${resetToken}`;

    try {
      const emailHtml = getForgotPasswordTemplate(user.name, resetLink);
      await sendEmailReport(
        user.email,
        "Social IQ - Reset Password",
        emailHtml,
      );
    } catch (mailError) {
      console.error(
        "[Mail Delivery Warning] Failed to dispatch forgot-password email:",
        mailError.message,
      );
    }

    res.json({
      success: true,
      message:
        "Password reset link has been dispatched if the email was registered.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Verification token and new password are required",
      });
    }

    const user = await User.findOne({
      passwordResetToken: hashToken(token),
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Password reset token is invalid or has expired",
      });
    }

    if (user.passwordHash) {
      const matchesHistory = await Promise.all(
        user.passwordHistory.map((hash) => bcrypt.compare(password, hash)),
      );

      if (matchesHistory.includes(true)) {
        return res.status(400).json({
          success: false,
          message: `You cannot reuse any of your last ${PASSWORD_HISTORY_LIMIT} passwords`,
        });
      }

      user.passwordHistory.push(user.passwordHash);
      if (user.passwordHistory.length > PASSWORD_HISTORY_LIMIT) {
        user.passwordHistory.shift();
      }
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await revokeAllSessions(user._id);
    await user.save();

    await logSecurityEvent({
      userId: user._id,
      action: "password_reset",
      details: "User password successfully reset via link.",
      email: user.email,
    });

    try {
      const emailHtml = getPasswordChangedTemplate(user.name);
      await sendEmailReport(
        user.email,
        "Social IQ - Password Reset Confirmation",
        emailHtml,
      );
    } catch (mailError) {
      console.error(
        "[Mail Delivery Warning] Failed to dispatch password reset confirmation email:",
        mailError.message,
      );
    }

    res.json({
      success: true,
      message: "Password reset successfully. You can now login.",
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.provider === "google" && !user.passwordHash) {
      const salt = await bcrypt.genSalt(12);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      await user.save();

      return res.json({
        success: true,
        message: "Local password set successfully",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const matchesHistory = await Promise.all(
      user.passwordHistory.map((hash) => bcrypt.compare(newPassword, hash)),
    );

    if (matchesHistory.includes(true)) {
      return res.status(400).json({
        success: false,
        message: `You cannot reuse any of your last ${PASSWORD_HISTORY_LIMIT} passwords`,
      });
    }

    user.passwordHistory.push(user.passwordHash);
    if (user.passwordHistory.length > PASSWORD_HISTORY_LIMIT) {
      user.passwordHistory.shift();
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);

    await revokeOtherSessions(user._id, req.cookies.socialiq_refresh_token);
    await user.save();

    await logSecurityEvent({
      userId: user._id,
      action: "password_changed",
      details: "User changed password successfully.",
      email: user.email,
    });

    try {
      const emailHtml = getPasswordChangedTemplate(user.name);
      await sendEmailReport(
        user.email,
        "Social IQ - Password Changed",
        emailHtml,
      );
    } catch (mailError) {
      console.error(
        "[Mail Delivery Warning] Failed to dispatch password changed confirmation email:",
        mailError.message,
      );
    }

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};
