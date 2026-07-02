import jwt from "jsonwebtoken";

const ACCESS_TOKEN_EXPIRY = "15m";
const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;

export const signAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

export { ACCESS_TOKEN_EXPIRY, ACCESS_TOKEN_MAX_AGE_MS };
