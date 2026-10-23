const { body, param } = require("express-validator");

const CATEGORY_VALUES = [
  "health",
  "fitness",
  "study",
  "productivity",
  "mindfulness",
  "finance",
  "social",
  "creativity",
  "other",
];

const FREQUENCY_VALUES = ["daily", "weekly", "custom"];
const PRIORITY_VALUES = ["low", "medium", "high"];

const createHabitValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Habit title is required")
    .isLength({ max: 100 })
    .withMessage("Title cannot exceed 100 characters"),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("category")
    .optional()
    .isIn(CATEGORY_VALUES)
    .withMessage(`Category must be one of: ${CATEGORY_VALUES.join(", ")}`),

  body("color")
    .optional()
    .matches(/^#([0-9A-Fa-f]{3}){1,2}$/)
    .withMessage("Color must be a valid hex code"),

  body("frequency")
    .optional()
    .isIn(FREQUENCY_VALUES)
    .withMessage(`Frequency must be one of: ${FREQUENCY_VALUES.join(", ")}`),

  body("customDays")
    .optional()
    .isArray()
    .withMessage("customDays must be an array")
    .custom((arr) => arr.every((d) => Number.isInteger(d) && d >= 0 && d <= 6))
    .withMessage("customDays values must be integers between 0 and 6"),

  body("target")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Target must be a positive integer"),

  body("priority")
    .optional()
    .isIn(PRIORITY_VALUES)
    .withMessage(`Priority must be one of: ${PRIORITY_VALUES.join(", ")}`),

  body("reminderTime")
    .optional({ nullable: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("reminderTime must be in HH:mm 24-hour format"),
];

const updateHabitValidator = [
  param("id").isMongoId().withMessage("Invalid habit id"),

  body("title")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Title must be between 1 and 100 characters"),

  body("category")
    .optional()
    .isIn(CATEGORY_VALUES)
    .withMessage(`Category must be one of: ${CATEGORY_VALUES.join(", ")}`),

  body("frequency")
    .optional()
    .isIn(FREQUENCY_VALUES)
    .withMessage(`Frequency must be one of: ${FREQUENCY_VALUES.join(", ")}`),

  body("target")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Target must be a positive integer"),

  body("priority")
    .optional()
    .isIn(PRIORITY_VALUES)
    .withMessage(`Priority must be one of: ${PRIORITY_VALUES.join(", ")}`),
];

const habitIdValidator = [param("id").isMongoId().withMessage("Invalid habit id")];

const logCompletionValidator = [
  param("id").isMongoId().withMessage("Invalid habit id"),

  body("date")
    .notEmpty()
    .withMessage("Date is required")
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Date must be in YYYY-MM-DD format"),

  body("completed")
    .optional()
    .isBoolean()
    .withMessage("completed must be a boolean"),

  body("note")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Note cannot exceed 500 characters"),
];

module.exports = {
  createHabitValidator,
  updateHabitValidator,
  habitIdValidator,
  logCompletionValidator,
};
