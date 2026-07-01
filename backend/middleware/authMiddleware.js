import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";

export const protect = async (req, res, next) => {
  let token;

  const cookies = req.cookies || {};
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (cookies.socialiq_access_token) {
    token = cookies.socialiq_access_token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.sessionId) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid token session format",
      });
    }

    // Verify session exists and is active in DB
    const session = await Session.findOne({
      _id: decoded.sessionId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, session expired or revoked",
      });
    }

    // Throttle lastActivity updates to once per minute
    if (!session.lastActivity || new Date() - new Date(session.lastActivity) > 60 * 1000) {
      session.lastActivity = new Date();
      await session.save();
    }

    // Get user from the token, attach to request
    req.user = await User.findById(decoded.id).select("-passwordHash");
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user not found",
      });
    }

    req.sessionId = session._id;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
    });
  }
};

export const requireVerification = (req, res, next) => {
  next();
};

export const authenticateUser = protect;

export const optionalAuth = async (req, res, next) => {
  let token;
  const cookies = req.cookies || {};
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (cookies.socialiq_access_token) {
    token = cookies.socialiq_access_token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.sessionId) {
        const session = await Session.findOne({
          _id: decoded.sessionId,
          isRevoked: false,
          expiresAt: { $gt: new Date() },
        });

        if (session) {
          req.user = await User.findById(decoded.id).select("-passwordHash");
          req.sessionId = session._id;

          if (!session.lastActivity || new Date() - new Date(session.lastActivity) > 60 * 1000) {
            session.lastActivity = new Date();
            await session.save();
          }
        }
      }
    } catch (error) {
      // Ignore token verification failure for optional authentication
    }
  }
  next();
};

export const requireVerifiedEmail = (req, res, next) => {
  next();
};

export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin role required.",
    });
  }
  next();
};

export const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user && req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${role}' required.`,
      });
    }
    next();
  };
};
