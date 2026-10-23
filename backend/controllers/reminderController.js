const Reminder = require("../models/Reminder");
const Habit = require("../models/Habit");
const asyncHandler = require("../middlewares/asyncHandler");
const { AppError, sendSuccess } = require("../utils/sendResponse");

// @desc    Create a reminder for a habit
// @route   POST /api/reminders
// @access  Private
const createReminder = asyncHandler(async (req, res) => {
  const { habit: habitId, time, channel, days, message } = req.body;

  if (!habitId || !time) {
    throw new AppError("habit and time are required.", 400);
  }

  const habit = await Habit.findOne({ _id: habitId, user: req.user._id });
  if (!habit) {
    throw new AppError("Habit not found.", 404);
  }

  const reminder = await Reminder.create({
    user: req.user._id,
    habit: habitId,
    time,
    channel,
    days,
    message,
  });

  habit.isReminderEnabled = true;
  habit.reminderTime = time;
  await habit.save();

  sendSuccess(res, 201, "Reminder created successfully.", reminder);
});

// @desc    Get all reminders for the logged-in user
// @route   GET /api/reminders
// @access  Private
const getReminders = asyncHandler(async (req, res) => {
  const reminders = await Reminder.find({ user: req.user._id })
    .sort({ time: 1 })
    .populate("habit", "title color icon");

  sendSuccess(res, 200, "Reminders fetched successfully.", reminders, {
    count: reminders.length,
  });
});

// @desc    Update a reminder
// @route   PUT /api/reminders/:id
// @access  Private
const updateReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOne({ _id: req.params.id, user: req.user._id });

  if (!reminder) {
    throw new AppError("Reminder not found.", 404);
  }

  const updatableFields = ["time", "channel", "days", "message", "isActive"];
  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      reminder[field] = req.body[field];
    }
  });

  await reminder.save();

  sendSuccess(res, 200, "Reminder updated successfully.", reminder);
});

// @desc    Delete a reminder
// @route   DELETE /api/reminders/:id
// @access  Private
const deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, user: req.user._id });

  if (!reminder) {
    throw new AppError("Reminder not found.", 404);
  }

  sendSuccess(res, 200, "Reminder deleted successfully.");
});

module.exports = {
  createReminder,
  getReminders,
  updateReminder,
  deleteReminder,
};
