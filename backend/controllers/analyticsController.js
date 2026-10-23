const asyncHandler = require("../middlewares/asyncHandler");
const { sendSuccess } = require("../utils/sendResponse");
const analyticsService = require("../services/analyticsService");

// @desc    Get weekly (last 7 days) completion analytics
// @route   GET /api/analytics/weekly
// @access  Private
const getWeekly = asyncHandler(async (req, res) => {
  const data = await analyticsService.getWeeklyAnalytics(req.user._id);
  sendSuccess(res, 200, "Weekly analytics fetched successfully.", data);
});

// @desc    Get monthly (last 30 days) completion analytics
// @route   GET /api/analytics/monthly
// @access  Private
const getMonthly = asyncHandler(async (req, res) => {
  const data = await analyticsService.getMonthlyAnalytics(req.user._id);
  sendSuccess(res, 200, "Monthly analytics fetched successfully.", data);
});

// @desc    Get yearly (last 12 months) completion analytics
// @route   GET /api/analytics/yearly
// @access  Private
const getYearly = asyncHandler(async (req, res) => {
  const data = await analyticsService.getYearlyAnalytics(req.user._id);
  sendSuccess(res, 200, "Yearly analytics fetched successfully.", data);
});

// @desc    Get completion analytics broken down by category
// @route   GET /api/analytics/category
// @access  Private
const getCategory = asyncHandler(async (req, res) => {
  const data = await analyticsService.getCategoryAnalytics(req.user._id);
  sendSuccess(res, 200, "Category analytics fetched successfully.", data);
});

// @desc    Get overall success rate across all active habits
// @route   GET /api/analytics/success-rate
// @access  Private
const getSuccessRate = asyncHandler(async (req, res) => {
  const data = await analyticsService.getSuccessRate(req.user._id);
  sendSuccess(res, 200, "Success rate fetched successfully.", data);
});

module.exports = {
  getWeekly,
  getMonthly,
  getYearly,
  getCategory,
  getSuccessRate,
};
