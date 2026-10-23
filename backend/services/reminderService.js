const Reminder = require("../models/Reminder");
const Habit = require("../models/Habit");
const User = require("../models/User");
const { sendEmail, emailTemplates } = require("../utils/sendEmail");

/**
 * Formats the current server time as "HH:mm" to match reminder.time.
 */
const currentHHMM = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

/**
 * Finds all active reminders that are due right now (matching the
 * current time and day of week), and dispatches them via the
 * configured channel(s). Intended to be called from a scheduled
 * job (e.g. a cron task) roughly once per minute.
 */
const dispatchDueReminders = async () => {
  const nowTime = currentHHMM();
  const nowDay = new Date().getDay(); // 0 = Sunday .. 6 = Saturday

  const dueReminders = await Reminder.find({
    isActive: true,
    time: nowTime,
  }).populate("user habit");

  const results = [];

  for (const reminder of dueReminders) {
    const appliesToday =
      reminder.days.length === 0 || reminder.days.includes(nowDay);

    if (!appliesToday || !reminder.user || !reminder.habit) {
      continue;
    }

    if (
      (reminder.channel === "email" || reminder.channel === "both") &&
      reminder.user.notificationSettings.emailReminders
    ) {
      const template = emailTemplates.habitReminder(
        reminder.user.name,
        reminder.habit.title
      );
      await sendEmail({ to: reminder.user.email, ...template });
    }

    reminder.lastSentAt = new Date();
    await reminder.save();

    results.push({
      reminderId: reminder._id,
      habit: reminder.habit.title,
      channel: reminder.channel,
    });
  }

  return results;
};

/**
 * Sends a weekly summary email to every user who has opted in,
 * intended to be triggered by a weekly scheduled job.
 */
const sendWeeklySummaries = async () => {
  const { getWeeklyAnalytics } = require("./analyticsService");

  const users = await User.find({
    isActive: true,
    "notificationSettings.weeklySummary": true,
  });

  const results = [];

  for (const user of users) {
    const weeklyData = await getWeeklyAnalytics(user._id);
    const habits = await Habit.find({ user: user._id, isArchived: false });

    const totalCompleted = weeklyData.reduce((sum, d) => sum + d.completed, 0);
    const totalPossible = weeklyData.reduce((sum, d) => sum + d.total, 0);
    const longestStreak = habits.reduce(
      (max, h) => Math.max(max, h.currentStreak),
      0
    );

    const stats = {
      completionRate:
        totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0,
      completed: totalCompleted,
      total: totalPossible,
      longestStreak,
    };

    const template = emailTemplates.weeklySummary(user.name, stats);
    await sendEmail({ to: user.email, ...template });
    results.push({ userId: user._id, stats });
  }

  return results;
};

module.exports = {
  dispatchDueReminders,
  sendWeeklySummaries,
};
