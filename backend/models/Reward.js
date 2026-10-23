const mongoose = require("mongoose");

const rewardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    habit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Habit",
      required: true,
    },
    type: {
      type: String,
      enum: ["streak_7", "streak_30", "streak_100", "milestone", "custom"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "award",
    },
    badgeColor: {
      type: String,
      default: "#3B82F6",
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
    isSeen: {
      type: Boolean,
      default: false, // used to trigger the "animated unlock" UI once
    },
  },
  {
    timestamps: true,
  }
);

rewardSchema.index({ user: 1, unlockedAt: -1 });
// Prevent the same streak-based badge being awarded twice for one habit
rewardSchema.index({ user: 1, habit: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("Reward", rewardSchema);
