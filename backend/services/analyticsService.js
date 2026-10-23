const Habit = require("../models/Habit");

const toDateStr = (date) => date.toISOString().slice(0, 10);

/**
 * Builds an array of the last N calendar dates (YYYY-MM-DD),
 * oldest first, ending today.
 */
const lastNDates = (n) => {
  const dates = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    dates.push(toDateStr(d));
  }
  return dates;
};

/**
 * Returns weekly (last 7 days) completion counts per day, suitable
 * for a Recharts bar/line chart.
 */
const getWeeklyAnalytics = async (userId) => {
  const habits = await Habit.find({ user: userId, isArchived: false });
  const days = lastNDates(7);

  const data = days.map((date) => {
    const completedCount = habits.reduce((sum, habit) => {
      const log = habit.completionLogs.find((l) => l.date === date);
      return sum + (log && log.completed ? 1 : 0);
    }, 0);
    return {
      date,
      completed: completedCount,
      total: habits.length,
      rate: habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0,
    };
  });

  return data;
};

/**
 * Returns monthly (last 30 days) completion counts per day.
 */
const getMonthlyAnalytics = async (userId) => {
  const habits = await Habit.find({ user: userId, isArchived: false });
  const days = lastNDates(30);

  const data = days.map((date) => {
    const completedCount = habits.reduce((sum, habit) => {
      const log = habit.completionLogs.find((l) => l.date === date);
      return sum + (log && log.completed ? 1 : 0);
    }, 0);
    return {
      date,
      completed: completedCount,
      total: habits.length,
      rate: habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0,
    };
  });

  return data;
};

/**
 * Returns yearly analytics grouped by month (last 12 months).
 */
const getYearlyAnalytics = async (userId) => {
  const habits = await Habit.find({ user: userId, isArchived: false });
  const months = [];

  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthLabel = d.toLocaleString("default", { month: "short", year: "2-digit" });

    let completedCount = 0;
    let possibleCount = 0;

    habits.forEach((habit) => {
      habit.completionLogs.forEach((log) => {
        const logDate = new Date(log.date);
        if (logDate.getFullYear() === year && logDate.getMonth() === month) {
          possibleCount += 1;
          if (log.completed) completedCount += 1;
        }
      });
    });

    months.push({
      month: monthLabel,
      completed: completedCount,
      rate: possibleCount > 0 ? Math.round((completedCount / possibleCount) * 100) : 0,
    });
  }

  return months;
};

/**
 * Returns completion rate broken down by habit category, for a
 * pie/donut chart.
 */
const getCategoryAnalytics = async (userId) => {
  const habits = await Habit.find({ user: userId, isArchived: false });

  const categoryMap = {};

  habits.forEach((habit) => {
    if (!categoryMap[habit.category]) {
      categoryMap[habit.category] = { category: habit.category, completed: 0, total: 0 };
    }
    categoryMap[habit.category].total += 1;
    categoryMap[habit.category].completed += habit.totalCompletions > 0 ? 1 : 0;
  });

  return Object.values(categoryMap);
};

/**
 * Returns the overall success rate (percentage of scheduled
 * completions actually completed) across all active habits.
 */
const getSuccessRate = async (userId) => {
  const habits = await Habit.find({ user: userId, isArchived: false });

  let totalLogs = 0;
  let completedLogs = 0;

  habits.forEach((habit) => {
    habit.completionLogs.forEach((log) => {
      totalLogs += 1;
      if (log.completed) completedLogs += 1;
    });
  });

  return {
    successRate: totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 0,
    totalLogs,
    completedLogs,
    activeHabits: habits.length,
  };
};

module.exports = {
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getYearlyAnalytics,
  getCategoryAnalytics,
  getSuccessRate,
};
