import * as SessionRepository from "../../repositories/SessionRepository.js";
import User from "../../models/User.js";
import { logSecurityEvent } from "../../utils/securityLogger.js";
import { extractIpAddress } from "../../utils/requestMeta.js";
import {
  findUserByRefreshToken,
  rotateRefreshToken,
} from "../../services/tokenService.js";
import { handleTokenReuseBreach } from "../../services/sessionService.js";
import {
  setRefreshTokenCookieWithMaxAge,
} from "../../services/cookieService.js";

export const refresh = async (req, res, next) => {
  const ipAddress = extractIpAddress(req);

  try {
    const refreshTokenVal = req.cookies.socialiq_refresh_token;

    if (!refreshTokenVal) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is missing",
      });
    }

    const { user, session } = await findUserByRefreshToken(
      User,
      refreshTokenVal,
    );

    if (!user || !session) {
      await logSecurityEvent({
        action: "refresh_failed_invalid_token",
        details: "Refresh attempt with unrecognized refresh token.",
        ipAddress,
      });
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    if (session.revoked) {
      await handleTokenReuseBreach(user._id, res, req);

      await logSecurityEvent({
        userId: user._id,
        action: "refresh_token_reuse_breach",
        details:
          "Reused refresh token submitted! Revoking all sessions for this user.",
        ipAddress,
      });

      return res.status(401).json({
        success: false,
        message:
          "Breach detected: Session has already been refreshed. Terminating all logins.",
      });
    }

    if (session.expiresAt < new Date()) {
      await SessionRepository.deleteById(session._id);
      return res.status(401).json({
        success: false,
        message: "Refresh token has expired",
      });
    }

    const { accessToken, refreshToken, maxAgeMs, payload } =
      await rotateRefreshToken(user, session, req);

    setRefreshTokenCookieWithMaxAge(res, req, refreshToken, maxAgeMs);

    res.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    next(error);
  }
};
