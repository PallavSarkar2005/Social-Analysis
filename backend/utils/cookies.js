export const isSecureConnection = (req) =>
  req.secure ||
  req.headers["x-forwarded-proto"] === "https" ||
  process.env.NODE_ENV === "production";

export const getCookieOptions = (req, overrides = {}) => {
  const secure = isSecureConnection(req);

  return {
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/",
    ...overrides,
  };
};

export const getHttpOnlyCookieOptions = (req, overrides = {}) =>
  getCookieOptions(req, { httpOnly: true, ...overrides });

export const getCsrfCookieOptions = (req, overrides = {}) =>
  getCookieOptions(req, { httpOnly: false, ...overrides });