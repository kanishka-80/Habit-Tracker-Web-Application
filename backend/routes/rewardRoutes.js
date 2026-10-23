const express = require("express");
const router = express.Router();

const {
  getRewards,
  getRewardsByHabit,
  markRewardSeen,
  getUnseenCount,
} = require("../controllers/rewardController");

const { protect } = require("../middlewares/authMiddleware");

router.use(protect);

router.get("/", getRewards);
router.get("/unseen-count", getUnseenCount);
router.get("/habit/:habitId", getRewardsByHabit);
router.patch("/:id/seen", markRewardSeen);

module.exports = router;
