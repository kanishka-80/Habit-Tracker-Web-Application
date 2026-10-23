const { validationResult } = require("express-validator");
const Habit = require("../models/Habit");
const asyncHandler = require("../middlewares/asyncHandler");
const { AppError, sendSuccess } = require("../utils/sendResponse");
const { checkAndUnlockRewards } = require("../services/rewardService");
const sheetsSync = require("../services/googleSheetsSyncService");

const handleValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400, errors.array());
  }
};

// @desc    Create a new habit
// @route   POST /api/habits
// @access  Private
const createHabit = asyncHandler(async (req, res) => {
  handleValidation(req);

  const habit = await Habit.create({
    ...req.body,
    user: req.user._id,
  });

  sheetsSync.syncHabitCreate(habit);

  sendSuccess(res, 201, "Habit created successfully.", habit);
});

// @desc    Get all habits for the logged-in user (with optional filters)
// @route   GET /api/habits
// @access  Private
const getHabits = asyncHandler(async (req, res) => {
  const { category, isArchived, frequency, search } = req.query;

  const filter = { user: req.user._id };

  if (category) filter.category = category;
  if (frequency) filter.frequency = frequency;
  filter.isArchived = isArchived === "true";

  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  const habits = await Habit.find(filter).sort({ createdAt: -1 });

  sendSuccess(res, 200, "Habits fetched successfully.", habits, { count: habits.length });
});

// @desc    Get a single habit by id
// @route   GET /api/habits/:id
// @access  Private
const getHabitById = asyncHandler(async (req, res) => {
  const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });

  if (!habit) {
    throw new AppError("Habit not found.", 404);
  }

  sendSuccess(res, 200, "Habit fetched successfully.", habit);
});

// @desc    Update a habit
// @route   PUT /api/habits/:id
// @access  Private
const updateHabit = asyncHandler(async (req, res) => {
  handleValidation(req);

  const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });

  if (!habit) {
    throw new AppError("Habit not found.", 404);
  }

  const updatableFields = [
    "title",
    "description",
    "category",
    "color",
    "icon",
    "frequency",
    "customDays",
    "target",
    "targetUnit",
    "priority",
    "reminderTime",
    "isReminderEnabled",
    "isArchived",
  ];

  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      habit[field] = req.body[field];
    }
  });

  await habit.save();

  sheetsSync.syncHabitUpdate(habit);

  sendSuccess(res, 200, "Habit updated successfully.", habit);
});

// @desc    Delete a habit
// @route   DELETE /api/habits/:id
// @access  Private
const deleteHabit = asyncHandler(async (req, res) => {
  const habit = await Habit.findOneAndDelete({ _id: req.params.id, user: req.user._id });

  if (!habit) {
    throw new AppError("Habit not found.", 404);
  }

  sheetsSync.syncHabitDelete(req.params.id);

  sendSuccess(res, 200, "Habit deleted successfully.");
});

// @desc    Log (or update) a completion entry for a specific date,
//          recalculate streaks, and check for newly unlocked rewards
// @route   POST /api/habits/:id/log
// @access  Private
const logCompletion = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { date, completed = true, note = "" } = req.body;

  const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });

  if (!habit) {
    throw new AppError("Habit not found.", 404);
  }

  const existingLogIndex = habit.completionLogs.findIndex((log) => log.date === date);

  if (existingLogIndex >= 0) {
    habit.completionLogs[existingLogIndex].completed = completed;
    habit.completionLogs[existingLogIndex].note = note;
  } else {
    habit.completionLogs.push({ date, completed, note });
  }

  habit.recalculateStreaks();
  await habit.save();

  sheetsSync.syncHabitUpdate(habit);

  const newRewards = await checkAndUnlockRewards(habit);

  sendSuccess(res, 200, "Completion logged successfully.", {
    habit,
    newRewards,
  });
});

// @desc    Remove a completion entry for a specific date and recalculate streaks
// @route   DELETE /api/habits/:id/log/:date
// @access  Private
const removeCompletion = asyncHandler(async (req, res) => {
  const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });

  if (!habit) {
    throw new AppError("Habit not found.", 404);
  }

  habit.completionLogs = habit.completionLogs.filter(
    (log) => log.date !== req.params.date
  );

  habit.recalculateStreaks();
  await habit.save();

  sheetsSync.syncHabitUpdate(habit);

  sendSuccess(res, 200, "Completion entry removed.", habit);
});

// @desc    Get streak details (current, longest, completion history) for a habit
// @route   GET /api/habits/:id/streak
// @access  Private
const getStreak = asyncHandler(async (req, res) => {
  const habit = await Habit.findOne({ _id: req.params.id, user: req.user._id });

  if (!habit) {
    throw new AppError("Habit not found.", 404);
  }

  sendSuccess(res, 200, "Streak details fetched successfully.", {
    currentStreak: habit.currentStreak,
    longestStreak: habit.longestStreak,
    totalCompletions: habit.totalCompletions,
    completionLogs: habit.completionLogs,
  });
});

module.exports = {
  createHabit,
  getHabits,
  getHabitById,
  updateHabit,
  deleteHabit,
  logCompletion,
  removeCompletion,
  getStreak,
};
