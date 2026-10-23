const { validationResult } = require("express-validator");
const Journal = require("../models/Journal");
const asyncHandler = require("../middlewares/asyncHandler");
const { AppError, sendSuccess } = require("../utils/sendResponse");

const handleValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400, errors.array());
  }
};

// @desc    Create a journal entry
// @route   POST /api/journal
// @access  Private
const createJournalEntry = asyncHandler(async (req, res) => {
  handleValidation(req);

  const entry = await Journal.create({
    ...req.body,
    user: req.user._id,
  });

  sendSuccess(res, 201, "Journal entry created successfully.", entry);
});

// @desc    Get journal entries for the logged-in user, optionally
//          filtered by habit, date range, or mood
// @route   GET /api/journal
// @access  Private
const getJournalEntries = asyncHandler(async (req, res) => {
  const { habit, mood, from, to, page = 1, limit = 20 } = req.query;

  const filter = { user: req.user._id };
  if (habit) filter.habit = habit;
  if (mood) filter.mood = mood;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(parseInt(limit, 10) || 20, 100);

  const [entries, total] = await Promise.all([
    Journal.find(filter)
      .sort({ date: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate("habit", "title color icon"),
    Journal.countDocuments(filter),
  ]);

  sendSuccess(res, 200, "Journal entries fetched successfully.", entries, {
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
});

// @desc    Get a single journal entry
// @route   GET /api/journal/:id
// @access  Private
const getJournalEntryById = asyncHandler(async (req, res) => {
  const entry = await Journal.findOne({ _id: req.params.id, user: req.user._id }).populate(
    "habit",
    "title color icon"
  );

  if (!entry) {
    throw new AppError("Journal entry not found.", 404);
  }

  sendSuccess(res, 200, "Journal entry fetched successfully.", entry);
});

// @desc    Update a journal entry
// @route   PUT /api/journal/:id
// @access  Private
const updateJournalEntry = asyncHandler(async (req, res) => {
  handleValidation(req);

  const entry = await Journal.findOne({ _id: req.params.id, user: req.user._id });

  if (!entry) {
    throw new AppError("Journal entry not found.", 404);
  }

  const updatableFields = ["title", "content", "mood", "tags"];
  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      entry[field] = req.body[field];
    }
  });

  await entry.save();

  sendSuccess(res, 200, "Journal entry updated successfully.", entry);
});

// @desc    Delete a journal entry
// @route   DELETE /api/journal/:id
// @access  Private
const deleteJournalEntry = asyncHandler(async (req, res) => {
  const entry = await Journal.findOneAndDelete({ _id: req.params.id, user: req.user._id });

  if (!entry) {
    throw new AppError("Journal entry not found.", 404);
  }

  sendSuccess(res, 200, "Journal entry deleted successfully.");
});

module.exports = {
  createJournalEntry,
  getJournalEntries,
  getJournalEntryById,
  updateJournalEntry,
  deleteJournalEntry,
};
