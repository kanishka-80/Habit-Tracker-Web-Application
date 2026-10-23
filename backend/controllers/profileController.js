const User = require("../models/User");
const asyncHandler = require("../middlewares/asyncHandler");
const { AppError, sendSuccess } = require("../utils/sendResponse");

// @desc    Get the logged-in user's profile
// @route   GET /api/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, "Profile fetched successfully.", req.user.toSafeObject());
});

// @desc    Update profile fields (name, bio, timezone, theme)
// @route   PUT /api/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, bio, timezone, theme } = req.body;

  const user = await User.findById(req.user._id);

  if (name !== undefined) user.name = name;
  if (bio !== undefined) user.bio = bio;
  if (timezone !== undefined) user.timezone = timezone;
  if (theme !== undefined) {
    if (!["dark", "light"].includes(theme)) {
      throw new AppError("Theme must be either 'dark' or 'light'.", 400);
    }
    user.theme = theme;
  }

  await user.save();

  sendSuccess(res, 200, "Profile updated successfully.", user.toSafeObject());
});

// @desc    Update avatar URL (upload handled client-side / via a
//          separate storage provider; this stores the resulting URL)
// @route   PUT /api/profile/avatar
// @access  Private
const updateAvatar = asyncHandler(async (req, res) => {
  const { url, publicId } = req.body;

  if (!url) {
    throw new AppError("Avatar url is required.", 400);
  }

  const user = await User.findById(req.user._id);
  user.avatar = { url, publicId: publicId || "" };
  await user.save();

  sendSuccess(res, 200, "Avatar updated successfully.", user.toSafeObject());
});

// @desc    Update notification preferences
// @route   PUT /api/profile/notifications
// @access  Private
const updateNotificationSettings = asyncHandler(async (req, res) => {
  const { emailReminders, browserNotifications, weeklySummary } = req.body;

  const user = await User.findById(req.user._id);

  if (emailReminders !== undefined) user.notificationSettings.emailReminders = emailReminders;
  if (browserNotifications !== undefined)
    user.notificationSettings.browserNotifications = browserNotifications;
  if (weeklySummary !== undefined) user.notificationSettings.weeklySummary = weeklySummary;

  await user.save();

  sendSuccess(res, 200, "Notification settings updated.", user.notificationSettings);
});

// @desc    Deactivate (soft-delete) the logged-in user's account
// @route   DELETE /api/profile
// @access  Private
const deactivateAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.isActive = false;
  await user.save();

  res.cookie("token", "none", { expires: new Date(Date.now() + 1000), httpOnly: true });
  res.cookie("refreshToken", "none", { expires: new Date(Date.now() + 1000), httpOnly: true });

  sendSuccess(res, 200, "Account deactivated successfully.");
});

module.exports = {
  getProfile,
  updateProfile,
  updateAvatar,
  updateNotificationSettings,
  deactivateAccount,
};
