const { validationResult } = require("express-validator");
const asyncHandler = require("../middlewares/asyncHandler");

const studyService = require("../services/studyService");
const sheetsSync = require("../services/googleSheetsSyncService");

// @desc    Create Study Session
// @route   POST /api/study
// @access  Private
exports.createStudySession = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  const session = await studyService.createStudySession({
    ...req.body,
    user: req.user._id,
  });

  sheetsSync.syncStudyCreate(session);

  res.status(201).json({
    success: true,
    message: "Study session created successfully",
    data: session,
  });
});

// @desc    Get All Study Sessions
// @route   GET /api/study
// @access  Private
exports.getStudySessions = asyncHandler(async (req, res) => {
  const sessions = await studyService.getStudySessions(req.user._id);

  res.status(200).json({
    success: true,
    count: sessions.length,
    data: sessions,
  });
});

// @desc    Update Study Session
// @route   PUT /api/study/:id
// @access  Private
exports.updateStudySession = asyncHandler(async (req, res) => {
  const session = await studyService.updateStudySession(
    req.params.id,
    req.user._id,
    req.body
  );

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Study session not found",
    });
  }

  sheetsSync.syncStudyUpdate(session);

  res.status(200).json({
    success: true,
    message: "Study session updated successfully",
    data: session,
  });
});

// @desc    Delete Study Session
// @route   DELETE /api/study/:id
// @access  Private
exports.deleteStudySession = asyncHandler(async (req, res) => {
  const session = await studyService.deleteStudySession(
    req.params.id,
    req.user._id
  );

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Study session not found",
    });
  }

  sheetsSync.syncStudyDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Study session deleted successfully",
  });
});

// @desc    Toggle Complete
// @route   PATCH /api/study/:id/complete
// @access  Private
exports.toggleStudySession = asyncHandler(async (req, res) => {
  const session = await studyService.toggleStudySession(
    req.params.id,
    req.user._id
  );

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Study session not found",
    });
  }

  sheetsSync.syncStudyUpdate(session);

  res.status(200).json({
    success: true,
    message: "Study session status updated",
    data: session,
  });
});