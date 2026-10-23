const express = require("express");
const router = express.Router();

const {
  createHabit,
  getHabits,
  getHabitById,
  updateHabit,
  deleteHabit,
  logCompletion,
  removeCompletion,
  getStreak,
} = require("../controllers/habitController");

const { protect } = require("../middlewares/authMiddleware");

const {
  createHabitValidator,
  updateHabitValidator,
  habitIdValidator,
  logCompletionValidator,
} = require("../validators/habitValidator");

router.use(protect);

router.route("/").post(createHabitValidator, createHabit).get(getHabits);

router
  .route("/:id")
  .get(habitIdValidator, getHabitById)
  .put(updateHabitValidator, updateHabit)
  .delete(habitIdValidator, deleteHabit);

router.get("/:id/streak", habitIdValidator, getStreak);
router.post("/:id/log", logCompletionValidator, logCompletion);
router.delete("/:id/log/:date", habitIdValidator, removeCompletion);

module.exports = router;
