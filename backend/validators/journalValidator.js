const { body, param } = require("express-validator");

const MOOD_VALUES = [
  "great",
  "good",
  "neutral",
  "bad",
  "terrible",
  "motivated",
  "focused",
  "calm",
  "tired",
  "stressed",
];

const createJournalValidator = [
  body("habit")
    .optional({ nullable: true })
    .isMongoId()
    .withMessage("Invalid habit id"),

  body("date")
    .notEmpty()
    .withMessage("Date is required")
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Date must be in YYYY-MM-DD format"),

  body("title")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Title cannot exceed 100 characters"),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Journal content is required")
    .isLength({ max: 2000 })
    .withMessage("Journal entry cannot exceed 2000 characters"),

  body("mood")
    .optional()
    .isIn(MOOD_VALUES)
    .withMessage(`Mood must be one of: ${MOOD_VALUES.join(", ")}`),

  body("tags")
    .optional()
    .isArray()
    .withMessage("tags must be an array"),
];

const updateJournalValidator = [
  param("id").isMongoId().withMessage("Invalid journal entry id"),

  body("title")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Title cannot exceed 100 characters"),

  body("content")
    .optional()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Journal entry must be between 1 and 2000 characters"),

  body("mood")
    .optional()
    .isIn(MOOD_VALUES)
    .withMessage(`Mood must be one of: ${MOOD_VALUES.join(", ")}`),
];

const journalIdValidator = [
  param("id").isMongoId().withMessage("Invalid journal entry id"),
];

module.exports = {
  createJournalValidator,
  updateJournalValidator,
  journalIdValidator,
};
