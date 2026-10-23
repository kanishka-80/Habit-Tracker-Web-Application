const express = require("express");
console.log("✅ authRoutes Loaded");
const router = express.Router();
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth Route Working"
  });
});

const {
  register,
  login,
  sendOtp,
  loginWithOtp,
  logout,
  getMe,
  refreshAccessToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
} = require("../controllers/authController");

const { protect } = require("../middlewares/authMiddleware");

const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
} = require("../validators/authValidator");

router.post("/register", registerValidator, register);
router.post("/login", loginValidator, login);
router.post("/send-otp", sendOtp);
router.post("/login-otp", loginWithOtp);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.post("/refresh", refreshAccessToken);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPasswordValidator, forgotPassword);
router.post("/reset-password", resetPasswordValidator, resetPassword);
router.put("/change-password", protect, changePasswordValidator, changePassword);

module.exports = router;
