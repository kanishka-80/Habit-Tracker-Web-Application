const { body } = require("express-validator");

exports.studySessionValidator = [
  body("semester")
    .trim()
    .notEmpty()
    .withMessage("Semester is required"),

  body("course")
    .trim()
    .notEmpty()
    .withMessage("Course is required"),

  body("subject")
    .trim()
    .notEmpty()
    .withMessage("Subject is required"),

  body("day")
    .notEmpty()
    .withMessage("Study day is required")
    .isIn([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ])
    .withMessage("Invalid study day"),

  body("startTime")
    .notEmpty()
    .withMessage("Start time is required"),

  body("endTime")
    .notEmpty()
    .withMessage("End time is required"),

  body("priority")
    .optional()
    .isIn(["High", "Medium", "Low"])
    .withMessage("Priority must be High, Medium or Low"),
];