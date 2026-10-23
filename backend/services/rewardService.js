const Reward = require("../models/Reward");

const STREAK_MILESTONES = [
  { days: 7, type: "streak_7", title: "7 Day Streak", icon: "flame", badgeColor: "#3B82F6" },
  { days: 30, type: "streak_30", title: "30 Day Streak", icon: "trophy", badgeColor: "#8B5CF6" },
  { days: 100, type: "streak_100", title: "100 Day Streak", icon: "crown", badgeColor: "#F59E0B" },
];

/**
 * Checks a habit's current streak against milestone thresholds and
 * unlocks any rewards the user has newly earned. Safe to call after
 * every completion log update — relies on the unique
 * (user, habit, type) index to silently skip already-unlocked badges.
 *
 * @param {import('mongoose').Document} habit - populated Habit document
 * @returns {Promise<Array>} newly created reward documents (may be empty)
 */
const checkAndUnlockRewards = async (habit) => {
  const eligible = STREAK_MILESTONES.filter(
    (milestone) => habit.currentStreak >= milestone.days
  );

  if (eligible.length === 0) {
    return [];
  }

  const unlocked = [];

  for (const milestone of eligible) {
    try {
      const reward = await Reward.create({
        user: habit.user,
        habit: habit._id,
        type: milestone.type,
        title: `${milestone.title}: ${habit.title}`,
        description: `You kept "${habit.title}" going for ${milestone.days} days straight. Amazing consistency!`,
        icon: milestone.icon,
        badgeColor: milestone.badgeColor,
      });
      unlocked.push(reward);
    } catch (err) {
      // Duplicate key error (11000) means this badge was already
      // unlocked for this habit — expected and safe to ignore.
      if (err.code !== 11000) {
        throw err;
      }
    }
  }

  return unlocked;
};

module.exports = {
  checkAndUnlockRewards,
  STREAK_MILESTONES,
};
