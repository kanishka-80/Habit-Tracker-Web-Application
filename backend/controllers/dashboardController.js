const Habit = require("../models/Habit");
const Reward = require("../models/Reward");
const asyncHandler = require("../middlewares/asyncHandler");
const { sendSuccess } = require("../utils/sendResponse");
const analyticsService = require("../services/analyticsService");

const todayStr = () => new Date().toISOString().slice(0, 10);

// @desc    Get an aggregated snapshot of the user's dashboard:
//          today's progress, weekly chart, stats, and recent habits
// @route   GET /api/dashboard
// @access  Private
const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const today = todayStr();

  const habits = await Habit.find({ user: userId, isArchived: false }).sort({
    createdAt: -1,
  });

  const todaysLogs = habits.map((habit) => {
    const log = habit.completionLogs.find((l) => l.date === today);
    return {
      habitId: habit._id,
      title: habit.title,
      color: habit.color,
      icon: habit.icon,
      completed: !!(log && log.completed),
      currentStreak: habit.currentStreak,
    };
  });

  const completedToday = todaysLogs.filter((h) => h.completed).length;
  const completionPercentage =
    habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;

  const weeklyChart = await analyticsService.getWeeklyAnalytics(userId);

  const totalStreakDays = habits.reduce((sum, h) => sum + h.currentStreak, 0);
  const longestStreak = habits.reduce((max, h) => Math.max(max, h.longestStreak), 0);

  const recentRewards = await Reward.find({ user: userId })
    .sort({ unlockedAt: -1 })
    .limit(5)
    .populate("habit", "title color icon");

  const recentHabits = habits.slice(0, 5);

  sendSuccess(res, 200, "Dashboard data fetched successfully.", {
    welcome: {
      name: req.user.name,
      date: today,
    },
    todaysProgress: {
      completed: completedToday,
      total: habits.length,
      completionPercentage,
      habits: todaysLogs,
    },
    stats: {
      totalHabits: habits.length,
      totalStreakDays,
      longestStreak,
      totalCompletions: habits.reduce((sum, h) => sum + h.totalCompletions, 0),
    },
    weeklyChart,
    recentHabits,
    recentRewards,
  });
});

module.exports = {
  getDashboard,
};
