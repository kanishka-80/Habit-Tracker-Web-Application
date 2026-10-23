const mongoose = require("mongoose");

const completionLogSchema = new mongoose.Schema(
  {
    date: {
      type: String, // stored as YYYY-MM-DD for easy calendar lookups
      required: true,
    },
    completed: {
      type: Boolean,
      default: true,
    },
    note: {
      type: String,
      maxlength: [500, "Note cannot exceed 500 characters"],
      default: "",
    },
  },
  { _id: false }
);

const habitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Habit title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    category: {
      type: String,
      enum: [
        "health",
        "fitness",
        "study",
        "productivity",
        "mindfulness",
        "finance",
        "social",
        "creativity",
        "other",
      ],
      default: "other",
    },
    color: {
      type: String,
      default: "#3B82F6", // blue-500, matches the app's blue-glow theme
      match: [/^#([0-9A-Fa-f]{3}){1,2}$/, "Color must be a valid hex code"],
    },
    icon: {
      type: String,
      default: "target",
    },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "custom"],
      default: "daily",
    },
    customDays: {
      // used when frequency === "custom"; 0 = Sunday .. 6 = Saturday
      type: [Number],
      default: [],
      validate: {
        validator: (arr) => arr.every((d) => d >= 0 && d <= 6),
        message: "customDays must contain values between 0 and 6",
      },
    },
    target: {
      type: Number,
      default: 1,
      min: [1, "Target must be at least 1"],
    },
    targetUnit: {
      type: String,
      default: "times",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    reminderTime: {
      type: String, // "HH:mm" 24-hour format
      default: null,
    },
    isReminderEnabled: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    totalCompletions: {
      type: Number,
      default: 0,
    },
    completionLogs: {
      type: [completionLogSchema],
      default: [],
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ---------- Indexes ----------
habitSchema.index({ user: 1, isArchived: 1 });
habitSchema.index({ user: 1, category: 1 });

// ---------- Instance Methods ----------

/**
 * Recalculates currentStreak and longestStreak from completionLogs.
 * Called whenever a completion log is added or removed.
 */
habitSchema.methods.recalculateStreaks = function recalculateStreaks() {
  const completedDates = this.completionLogs
    .filter((log) => log.completed)
    .map((log) => log.date)
    .sort();

  if (completedDates.length === 0) {
    this.currentStreak = 0;
    this.longestStreak = 0;
    this.totalCompletions = 0;
    return;
  }

  let longest = 1;
  let running = 1;

  for (let i = 1; i < completedDates.length; i += 1) {
    const prev = new Date(completedDates[i - 1]);
    const curr = new Date(completedDates[i]);
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      running += 1;
    } else if (diffDays > 1) {
      running = 1;
    }
    longest = Math.max(longest, running);
  }

  // Determine if the current streak is still active (last completion
  // was today or yesterday relative to server date).
  const lastDate = new Date(completedDates[completedDates.length - 1]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);
  const gapFromToday = Math.round((today - lastDate) / (1000 * 60 * 60 * 24));

  this.currentStreak = gapFromToday <= 1 ? running : 0;
  this.longestStreak = longest;
  this.totalCompletions = completedDates.length;
};

module.exports = mongoose.model("Habit", habitSchema);
