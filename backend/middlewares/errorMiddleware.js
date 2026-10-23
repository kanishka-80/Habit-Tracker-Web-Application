const config = require("../config/env");
const { AppError } = require("../utils/sendResponse");

/**
 * Converts common error types (Mongoose CastError, duplicate key,
 * ValidationError, JWT errors) into a consistent AppError so the
 * client always receives a predictable { success, message } shape.
 */
const normalizeError = (err) => {
  let error = err;

  // Invalid MongoDB ObjectId
  if (err.name === "CastError") {
    error = new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }

  // Duplicate unique field (e.g. email already registered)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    error = new AppError(`This ${field} is already in use.`, 409);
  }

  // Mongoose schema validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    error = new AppError(messages.join(". "), 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid authentication token.", 401);
  }
  if (err.name === "TokenExpiredError") {
    error = new AppError("Authentication token has expired.", 401);
  }

  return error;
};

/**
 * Express global error-handling middleware. Must be registered last,
 * after all routes, with four arguments so Express recognizes it as
 * an error handler.
 */
const errorMiddleware = (err, req, res, next) => {
  const error = normalizeError(err);
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  if (config.env === "development") {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(error.errors && { errors: error.errors }),
    ...(config.env === "development" && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;
