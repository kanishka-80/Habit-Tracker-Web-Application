const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
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
    time: {
      type: String, // "HH:mm" 24-hour format
      required: [true, "Reminder time is required"],
    },
    channel: {
      type: String,
      enum: ["email", "browser", "both"],
      default: "browser",
    },
    days: {
      // 0 = Sunday .. 6 = Saturday; empty array means every day
      type: [Number],
      default: [],
    },
    message: {
      type: String,
      default: "",
      maxlength: [200, "Message cannot exceed 200 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reminderSchema.index({ user: 1, isActive: 1 });
reminderSchema.index({ habit: 1 });

module.exports = mongoose.model("Reminder", reminderSchema);
