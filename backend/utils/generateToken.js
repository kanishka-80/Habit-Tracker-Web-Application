const jwt = require("jsonwebtoken");
const config = require("../config/env");

/**
 * Generates a short-lived access token containing the user's id.
 * @param {string} userId - MongoDB ObjectId of the user
 * @returns {string} signed JWT
 */
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  });
};

/**
 * Generates a long-lived refresh token containing the user's id.
 * @param {string} userId - MongoDB ObjectId of the user
 * @returns {string} signed JWT
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpire,
  });
};

/**
 * Verifies an access token and returns its decoded payload.
 * Throws if the token is invalid or expired.
 * @param {string} token
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};

/**
 * Verifies a refresh token and returns its decoded payload.
 * Throws if the token is invalid or expired.
 * @param {string} token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwtRefreshSecret);
};

/**
 * Sets the access token as an httpOnly cookie on the response
 * and sends the user payload back in the JSON body.
 * @param {import('express').Response} res
 * @param {string} userId
 * @param {number} statusCode
 * @param {object} userPayload - safe user object to return to the client
 */
const sendTokenResponse = (res, userId, statusCode, userPayload) => {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  const cookieOptions = {
    expires: new Date(
      Date.now() + config.jwtCookieExpire * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: config.env === "production",
    sameSite: config.env === "production" ? "none" : "lax",
  };

  res
    .status(statusCode)
    .cookie("token", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .json({
      success: true,
      accessToken,
      user: userPayload,
    });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  sendTokenResponse,
};
