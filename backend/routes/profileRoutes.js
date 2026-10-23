const express = require("express");
const router = express.Router();

const {
  getProfile,
  updateProfile,
  updateAvatar,
  updateNotificationSettings,
  deactivateAccount,
} = require("../controllers/profileController");

const { protect } = require("../middlewares/authMiddleware");

router.use(protect);

router.route("/").get(getProfile).put(updateProfile).delete(deactivateAccount);

router.put("/avatar", updateAvatar);
router.put("/notifications", updateNotificationSettings);

module.exports = router;
