const express = require("express");
const router = express.Router();

const {
  createReminder,
  getReminders,
  updateReminder,
  deleteReminder,
} = require("../controllers/reminderController");

const { protect } = require("../middlewares/authMiddleware");

router.use(protect);

router.route("/").post(createReminder).get(getReminders);

router.route("/:id").put(updateReminder).delete(deleteReminder);

module.exports = router;
