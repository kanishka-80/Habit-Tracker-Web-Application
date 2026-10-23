const express = require("express");
const router = express.Router();

const {
  getWeekly,
  getMonthly,
  getYearly,
  getCategory,
  getSuccessRate,
} = require("../controllers/analyticsController");

const { protect } = require("../middlewares/authMiddleware");

router.use(protect);

router.get("/weekly", getWeekly);
router.get("/monthly", getMonthly);
router.get("/yearly", getYearly);
router.get("/category", getCategory);
router.get("/success-rate", getSuccessRate);

module.exports = router;
