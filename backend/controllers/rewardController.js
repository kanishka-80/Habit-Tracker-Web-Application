const Reward = require("../models/Reward");
const asyncHandler = require("../middlewares/asyncHandler");
const { AppError, sendSuccess } = require("../utils/sendResponse");

// @desc    Get all rewards unlocked by the logged-in user
// @route   GET /api/rewards
// @access  Private
const getRewards = asyncHandler(async (req, res) => {
  const rewards = await Reward.find({ user: req.user._id })
    .sort({ unlockedAt: -1 })
    .populate("habit", "title color icon");

  sendSuccess(res, 200, "Rewards fetched successfully.", rewards, { count: rewards.length });
});

// @desc    Get rewards for a specific habit
// @route   GET /api/rewards/habit/:habitId
// @access  Private
const getRewardsByHabit = asyncHandler(async (req, res) => {
  const rewards = await Reward.find({
    user: req.user._id,
    habit: req.params.habitId,
  }).sort({ unlockedAt: -1 });

  sendSuccess(res, 200, "Rewards fetched successfully.", rewards, { count: rewards.length });
});

// @desc    Mark a reward as seen (used to stop the unlock animation
//          from re-triggering on subsequent visits)
// @route   PATCH /api/rewards/:id/seen
// @access  Private
const markRewardSeen = asyncHandler(async (req, res) => {
  const reward = await Reward.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isSeen: true },
    { new: true }
  );

  if (!reward) {
    throw new AppError("Reward not found.", 404);
  }

  sendSuccess(res, 200, "Reward marked as seen.", reward);
});

// @desc    Get count of unseen rewards (for a notification badge)
// @route   GET /api/rewards/unseen-count
// @access  Private
const getUnseenCount = asyncHandler(async (req, res) => {
  const count = await Reward.countDocuments({ user: req.user._id, isSeen: false });
  sendSuccess(res, 200, "Unseen reward count fetched.", { count });
});

module.exports = {
  getRewards,
  getRewardsByHabit,
  markRewardSeen,
  getUnseenCount,
};
