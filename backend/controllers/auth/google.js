import axios from "axios";
import User from "../../models/User.js";
import { logSecurityEvent } from "../../utils/securityLogger.js";
import { sendTokenResponse } from "../../services/authService.js";

const isGoogleEmailVerified = (value) => value === true || value === "true";

/**
 * Verify a Google ID token with Google's tokeninfo endpoint and enforce
 * audience + email_verified checks. No development token shortcuts.
 */
const resolveGooglePayload = async (idToken) => {
  if (typeof idToken !== "string" || idToken.length < 20 || idToken.length > 4096) {
    throw new Error("Invalid Google ID token format");
  }

  // Reject known bypass tokens explicitly (defense in depth)
  if (idToken === "dummy-developer-token") {
    throw new Error("Invalid Google ID token");
  }

  const ticket = await axios.get(
    "https://oauth2.googleapis.com/tokeninfo",
    {
      params: { id_token: idToken },
      timeout: 10000,
      validateStatus: (status) => status < 500,
    },
  );

  if (ticket.status !== 200 || !ticket.data?.sub) {
    throw new Error("Google token verification failed");
  }

  const payload = ticket.data;
  const expectedAud = process.env.GOOGLE_CLIENT_ID;

  if (!expectedAud) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  if (payload.aud !== expectedAud) {
    throw new Error("Google token audience mismatch");
  }

  if (!payload.email || !isGoogleEmailVerified(payload.email_verified)) {
    throw new Error("Google account email is not verified");
  }

  return payload;
};

export const googleSignIn = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: "Google ID Token is required.",
    });
  }

  try {
    const payload = await resolveGooglePayload(idToken);
    const { sub, email, name, picture } = payload;

    // Prefer lookup by Google subject to avoid email-based account takeover
    let user = await User.findOne({ googleId: sub });

    if (!user) {
      const existingByEmail = await User.findOne({ email: email.toLowerCase() });

      if (existingByEmail) {
        // Do not silently link Google to a password-based account
        if (
          existingByEmail.passwordHash ||
          existingByEmail.provider === "local"
        ) {
          return res.status(409).json({
            success: false,
            message:
              "An account with this email already exists. Sign in with your password, then link Google from Settings.",
          });
        }

        // Existing Google-linked account missing googleId (legacy) — attach subject
        if (existingByEmail.googleId && existingByEmail.googleId !== sub) {
          return res.status(409).json({
            success: false,
            message: "This email is already linked to a different Google account.",
          });
        }

        user = existingByEmail;
        user.googleId = sub;
        user.provider = "google";
        user.isEmailVerified = true;
        user.isVerified = true;
        if (!user.avatar && picture) {
          user.avatar = picture;
        }
        await user.save();
      } else {
        user = await User.create({
          name: name || email.split("@")[0],
          email: email.toLowerCase(),
          avatar:
            picture ||
            `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || email)}`,
          isVerified: true,
          isEmailVerified: true,
          provider: "google",
          googleId: sub,
          role: "user",
          plan: "free",
        });
      }
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

export const googleConnect = async (req, res) => {
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

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

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

    // Prevent linking a Google identity whose email belongs to another user
    const emailOwner = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: user._id },
    });
    if (emailOwner) {
      return res.status(400).json({
        success: false,
        message:
          "This Google account email is already associated with another user.",
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
  } catch {
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
