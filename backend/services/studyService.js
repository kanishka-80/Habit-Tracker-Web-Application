const StudySession = require("../models/StudySession");

// Create Study Session
const createStudySession = async (data) => {
  return await StudySession.create(data);
};

// Get All Study Sessions of Logged-in User
const getStudySessions = async (userId) => {
  return await StudySession.find({ user: userId }).sort({
    day: 1,
    startTime: 1,
  });
};

// Get Single Study Session
const getStudySessionById = async (id, userId) => {
  return await StudySession.findOne({
    _id: id,
    user: userId,
  });
};

// Update Study Session
const updateStudySession = async (id, userId, data) => {
  return await StudySession.findOneAndUpdate(
    {
      _id: id,
      user: userId,
    },
    data,
    {
      new: true,
      runValidators: true,
    }
  );
};

// Delete Study Session
const deleteStudySession = async (id, userId) => {
  return await StudySession.findOneAndDelete({
    _id: id,
    user: userId,
  });
};

// Toggle Complete Status
const toggleStudySession = async (id, userId) => {
  const session = await StudySession.findOne({
    _id: id,
    user: userId,
  });

  if (!session) return null;

  session.completed = !session.completed;

  await session.save();

  return session;
};

module.exports = {
  createStudySession,
  getStudySessions,
  getStudySessionById,
  updateStudySession,
  deleteStudySession,
  toggleStudySession,
};