const express = require("express");
const router = express.Router();

const {
  createStudySession,
  getStudySessions,
  updateStudySession,
  deleteStudySession,
  toggleStudySession,
} = require("../controllers/studyController");

const { protect } = require("../middlewares/authMiddleware");

const {
  studySessionValidator,
} = require("../validators/studyValidator");

// All routes require login
router.use(protect);

// Create & Get
router
  .route("/")
  .post(studySessionValidator, createStudySession)
  .get(getStudySessions);

// Update & Delete
router
  .route("/:id")
  .put(studySessionValidator, updateStudySession)
  .delete(deleteStudySession);

// Complete / Incomplete
router.patch("/:id/complete", toggleStudySession);

module.exports = router;