const { verifyAccessToken } = require("../utils/generateToken");
const { AppError } = require("../utils/sendResponse");
const asyncHandler = require("./asyncHandler");
const User = require("../models/User");

/**
 * Protects routes by requiring a valid JWT access token, sent either
 * as an httpOnly cookie ("token") or as a Bearer token in the
 * Authorization header. Attaches the authenticated user to req.user.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new AppError("Not authorized. Please log in to continue.", 401);
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    throw new AppError("Session expired or invalid. Please log in again.", 401);
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    throw new AppError("The user belonging to this token no longer exists.", 401);
  }

  if (!user.isActive) {
    throw new AppError("This account has been deactivated.", 403);
  }

  req.user = user;
  next();
});

/**
 * Optionally attaches req.user if a valid token is present, but does
 * not block the request if it's missing or invalid. Useful for
 * public routes that behave differently for logged-in users.
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) {
      req.user = user;
    }
  } catch (err) {
    // Invalid token on an optional route is not an error; continue as guest
  }

  next();
});

module.exports = {
  protect,
  optionalAuth,
};
