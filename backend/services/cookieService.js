import {
  getHttpOnlyCookieOptions,
  getCsrfCookieOptions,
} from "../utils/cookies.js";
import { ACCESS_TOKEN_MAX_AGE_MS } from "../utils/jwt.js";
import { CSRF_COOKIE_NAME } from "./csrfService.js";

export const REFRESH_COOKIE_NAME = "socialiq_refresh_token";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const setRefreshTokenCookie = (res, req, refreshToken, rememberMe) => {
  res.cookie(
    REFRESH_COOKIE_NAME,
    refreshToken,
    getHttpOnlyCookieOptions(req, {
      maxAge: rememberMe ? THIRTY_DAYS_MS : SEVEN_DAYS_MS,
    }),
  );
};

export const setRefreshTokenCookieWithMaxAge = (
  res,
  req,
  refreshToken,
  maxAgeMs,
) => {
  res.cookie(
    REFRESH_COOKIE_NAME,
    refreshToken,
    getHttpOnlyCookieOptions(req, { maxAge: maxAgeMs }),
  );
};

export const clearAuthCookies = (res, req) => {
  const httpOnlyOptions = getHttpOnlyCookieOptions(req);
  res.clearCookie(REFRESH_COOKIE_NAME, httpOnlyOptions);
  res.clearCookie(CSRF_COOKIE_NAME, getCsrfCookieOptions(req));
};

export { SEVEN_DAYS_MS, THIRTY_DAYS_MS };
