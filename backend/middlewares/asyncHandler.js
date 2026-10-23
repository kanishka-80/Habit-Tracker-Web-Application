/**
 * Wraps an async Express route handler so that any rejected promise
 * (thrown error) is automatically forwarded to the global error
 * middleware via next(err), instead of requiring a try/catch block
 * in every controller function.
 *
 * Usage:
 *   router.get("/", asyncHandler(async (req, res) => { ... }));
 *
 * @param {Function} fn - async (req, res, next) => {}
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
