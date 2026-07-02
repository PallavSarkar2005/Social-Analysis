import axios from "axios";
import User from "../../models/User.js";
import { logSecurityEvent } from "../../utils/securityLogger.js";
import { sendTokenResponse } from "../../services/authService.js";

const resolveGooglePayload = async (idToken) => {
  if (
    idToken === "dummy-developer-token" &&
    (process.env.NODE_ENV === "test" ||
      process.env.NODE_ENV === "development")
  ) {
    return {
      sub: "dev-google-sub-123",
      email: "dev.user@socialiq.ai",
      name: "Developer Node",
      picture: "https://api.dicebear.com/7.x/adventurer/svg?seed=dev",
    };
  }

  const ticket = await axios.get(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
  );
  return ticket.data;
};

export const googleSignIn = async (req, res, next) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: "Google ID Token is required.",
    });
  }

  try {
    const payload = await resolveGooglePayload(idToken);

    if (!payload.email) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google token, no email payload resolved.",
      });
    }

    const { sub, email, name, picture } = payload;
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        avatar:
          picture ||
          `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
        isVerified: true,
        isEmailVerified: true,
        provider: "google",
        googleId: sub,
      });
    } else {
      user.provider = "google";
      user.googleId = sub;
      user.isEmailVerified = true;
      user.isVerified = true;
      if (!user.avatar) {
        user.avatar =
          picture ||
          `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;
      }
      await user.save();
    }

    await sendTokenResponse(user, 200, req, res);
  } catch (error) {
    console.error("[Google OAuth Error]", error.message);
    res.status(400).json({
      success: false,
      message:
        "Google Sign-In authentication failed. Token is invalid or expired.",
    });
  }
};

export const googleConnect = async (req, res, next) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: "Google ID Token is required.",
    });
  }

  try {
    const payload = await resolveGooglePayload(idToken);
    const { sub, email } = payload;
    const user = await User.findById(req.user._id);

    const existingLink = await User.findOne({
      googleId: sub,
      _id: { $ne: user._id },
    });
    if (existingLink) {
      return res.status(400).json({
        success: false,
        message:
          "This Google account is already linked to another Social IQ user.",
      });
    }

    user.googleId = sub;
    user.provider = "google";
    await user.save();

    await logSecurityEvent({
      userId: user._id,
      action: "google_connected",
      details: `Google account linked: ${email}`,
    });

    res.json({
      success: true,
      message: "Google account successfully linked.",
      data: {
        googleId: user.googleId,
        provider: user.provider,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Linking Google account failed.",
    });
  }
};

export const googleDisconnect = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.passwordHash) {
      return res.status(400).json({
        success: false,
        message:
          "You must set a local password before unlinking your Google account.",
      });
    }

    user.googleId = undefined;
    user.provider = "local";
    await user.save();

    await logSecurityEvent({
      userId: user._id,
      action: "google_disconnected",
      details: "Google account unlinked successfully.",
    });

    res.json({
      success: true,
      message: "Google account successfully unlinked.",
      data: {
        provider: user.provider,
      },
    });
  } catch (error) {
    next(error);
  }
};
