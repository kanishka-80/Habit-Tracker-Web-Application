const mongoose = require("mongoose");

const journalSchema = new mongoose.Schema(
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
      default: null, // null means a general (non-habit-specific) journal entry
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
      default: "",
    },
    content: {
      type: String,
      required: [true, "Journal content is required"],
      maxlength: [2000, "Journal entry cannot exceed 2000 characters"],
    },
    mood: {
      type: String,
      enum: [
        "great",
        "good",
        "neutral",
        "bad",
        "terrible",
        "motivated",
        "focused",
        "calm",
        "tired",
        "stressed",
      ],
      default: "neutral",
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

journalSchema.index({ user: 1, date: -1 });
journalSchema.index({ user: 1, habit: 1 });

module.exports = mongoose.model("Journal", journalSchema);
