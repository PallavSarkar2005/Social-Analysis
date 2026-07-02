import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import LoginAttempt from "../../models/LoginAttempt.js";
import { logSecurityEvent } from "../../utils/securityLogger.js";
import { extractIpAddress } from "../../utils/requestMeta.js";
import {
  sendTokenResponse,
  handleFailedLogin,
} from "../../services/authService.js";

export const login = async (req, res, next) => {
  const ipAddress = extractIpAddress(req);
  const { email, password } = req.body;

  try {
    const attempt = await LoginAttempt.findOne({ email, ipAddress });
    if (attempt && attempt.lockoutUntil && attempt.lockoutUntil > new Date()) {
      const waitSecs = Math.ceil((attempt.lockoutUntil - new Date()) / 1000);

      await logSecurityEvent({
        action: "login_lockout_blocked",
        details: `Login attempt blocked due to active lockout (${waitSecs}s remaining).`,
        ipAddress,
        email,
      });

      return res.status(423).json({
        success: false,
        message: `Account temporarily locked due to excessive failed attempts. Try again in ${waitSecs} seconds.`,
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      await handleFailedLogin(email, ipAddress);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.provider === "google" && !user.passwordHash) {
      return res.status(400).json({
        success: false,
        message:
          "This account logs in with Google. Please use Sign in with Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await handleFailedLogin(email, ipAddress);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (attempt) {
      await attempt.deleteOne();
    }

    await sendTokenResponse(user, 200, req, res);
  } catch (error) {
    next(error);
  }
};
