/**
 * Sends a standardized success response.
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {object|array|null} data
 * @param {object} [meta] - optional pagination/meta info
 */
const sendSuccess = (res, statusCode = 200, message = "Success", data = null, meta = undefined) => {
  const body = {
    success: true,
    message,
  };

  if (data !== null) {
    body.data = data;
  }

  if (meta !== undefined) {
    body.meta = meta;
  }

  return res.status(statusCode).json(body);
};

/**
 * Sends a standardized error response.
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {array|object|null} errors - optional validation error details
 */
const sendError = (res, statusCode = 500, message = "Something went wrong", errors = null) => {
  const body = {
    success: false,
    message,
  };

  if (errors !== null) {
    body.errors = errors;
  }

  return res.status(statusCode).json(body);
};

/**
 * Custom error class carrying an HTTP status code, for use with
 * asyncHandler + errorMiddleware.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  sendSuccess,
  sendError,
  AppError,
};
