import {
  revokeRefreshToken,
  revokeAllSessions,
  revokeOtherSessions,
} from "../../services/sessionService.js";
import { clearAuthCookies } from "../../services/cookieService.js";

export const logout = async (req, res, next) => {
  try {
    await revokeRefreshToken(req.cookies.socialiq_refresh_token);
    clearAuthCookies(res, req);

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const logoutAll = async (req, res, next) => {
  try {
    await revokeAllSessions(req.user._id);
    clearAuthCookies(res, req);

    res.json({
      success: true,
      message: "Logged out of all sessions successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const logoutOtherDevices = async (req, res, next) => {
  try {
    await revokeOtherSessions(
      req.user._id,
      req.cookies.socialiq_refresh_token,
    );

    res.json({
      success: true,
      message: "Logged out of other devices successfully",
    });
  } catch (error) {
    next(error);
  }
};
