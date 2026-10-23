const crypto = require("crypto");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const asyncHandler = require("../middlewares/asyncHandler");
const { AppError, sendSuccess } = require("../utils/sendResponse");
const { sendTokenResponse, verifyRefreshToken, generateAccessToken } = require("../utils/generateToken");
const { sendEmail, emailTemplates } = require("../utils/sendEmail");
const { sendSms } = require("../utils/sendSms");
const config = require("../config/env");

const handleValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400, errors.array());
  }
};

// Temporary in-memory OTP cache for registration verification
const tempOtpStore = {};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { name, email, phone, password, otp } = req.body;

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new AppError("An account with this email already exists.", 409);
  }

  const existingPhone = await User.findOne({ phone });
  if (existingPhone) {
    throw new AppError("An account with this phone number already exists.", 409);
  }

  if (otp) {
    const tempOtpData = tempOtpStore[phone] || tempOtpStore[email];
    if (!tempOtpData || tempOtpData.code !== otp) {
      throw new AppError("Invalid OTP code. Please check and try again.", 400);
    }
    if (new Date() > tempOtpData.expiresAt) {
      throw new AppError("OTP has expired. Please request a new OTP.", 400);
    }
    delete tempOtpStore[phone];
    delete tempOtpStore[email];
  }

  const user = await User.create({ name, email, phone, password });

  const verifyToken = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${config.clientUrl}/verify-email?token=${verifyToken}`;
  const template = emailTemplates.verifyEmail(user.name, verifyUrl);

  try {
    await sendEmail({ to: user.email, ...template });
  } catch (err) {
    console.error(`Failed to send verification email: ${err.message}`);
  }

  sendTokenResponse(res, user._id, 201, user.toSafeObject());
});

// @desc    Log in an existing user (Email or Phone + Password)
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { email, phone, password } = req.body;

  let query;
  if (email) {
    query = { email: email.trim().toLowerCase() };
  } else if (phone) {
    query = { phone: phone.trim() };
  } else {
    throw new AppError("Email or Phone number is required to login.", 400);
  }

  const user = await User.findOne(query).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid login credentials or password.", 401);
  }

  if (!user.isActive) {
    throw new AppError("This account has been deactivated.", 403);
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(res, user._id, 200, user.toSafeObject());
});

// @desc    Send OTP to phone or email
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = asyncHandler(async (req, res) => {
  const { phone, email, purpose } = req.body;
  const identifier = (phone || email || "").trim();

  if (!identifier) {
    throw new AppError("Phone number or email is required to send OTP.", 400);
  }

  if (purpose === "login") {
    const userExists = await User.findOne({ $or: [{ phone: identifier }, { email: identifier }] });
    if (!userExists) {
      throw new AppError("No registered account found with this phone/email.", 404);
    }
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  let user = await User.findOne({ $or: [{ phone: identifier }, { email: identifier }] }).select("+otp.code +otp.expiresAt");
  if (user) {
    user.otp = { code: otpCode, expiresAt };
    await user.save({ validateBeforeSave: false });
  }

  tempOtpStore[identifier] = { code: otpCode, expiresAt };

  // Dispatch SMS
  await sendSms({ phone: identifier, code: otpCode });

  // Also dispatch Email if email address is present in req.body or on user profile
  const recipientEmail = email || (identifier.includes("@") ? identifier : user?.email);
  if (recipientEmail && recipientEmail.includes("@")) {
    try {
      const template = emailTemplates.otpEmail(otpCode);
      await sendEmail({ to: recipientEmail, ...template });
    } catch (err) {
      console.error(`[OTP EMAIL] Failed to send OTP email: ${err.message}`);
    }
  }

  sendSuccess(res, 200, "OTP sent successfully. Please check your mobile or email inbox.", {
    identifier
  });
});

// @desc    Log in user using OTP
// @route   POST /api/auth/login-otp
// @access  Public
const loginWithOtp = asyncHandler(async (req, res) => {
  const { phone, email, otp } = req.body;
  const identifier = (phone || email || "").trim();

  if (!identifier || !otp) {
    throw new AppError("Phone/Email and OTP are required.", 400);
  }

  const user = await User.findOne({ $or: [{ phone: identifier }, { email: identifier }] }).select("+otp.code +otp.expiresAt");

  if (!user) {
    throw new AppError("No account found with this phone number or email.", 404);
  }

  const tempOtpData = tempOtpStore[identifier];
  const userOtpCode = user.otp?.code;
  const userOtpExpire = user.otp?.expiresAt;

  const validCode = userOtpCode === otp || (tempOtpData && tempOtpData.code === otp);
  const validExpiry = (userOtpExpire && new Date() <= userOtpExpire) || (tempOtpData && new Date() <= tempOtpData.expiresAt);

  if (!validCode) {
    throw new AppError("Invalid OTP. Please check and try again.", 400);
  }

  if (!validExpiry) {
    throw new AppError("OTP has expired. Please request a new one.", 400);
  }

  if (user.otp) {
    user.otp = undefined;
  }
  delete tempOtpStore[identifier];

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(res, user._id, 200, user.toSafeObject());
});

// @desc    Log out the current user (clears auth cookies)
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  res.cookie("token", "none", { expires: new Date(Date.now() + 1000), httpOnly: true });
  res.cookie("refreshToken", "none", { expires: new Date(Date.now() + 1000), httpOnly: true });
  sendSuccess(res, 200, "Logged out successfully.");
});

// @desc    Get the currently authenticated user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, "Current user fetched.", req.user.toSafeObject());
});

// @desc    Refresh the access token using a valid refresh token
// @route   POST /api/auth/refresh
// @access  Public (requires refreshToken cookie)
const refreshAccessToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    throw new AppError("No refresh token provided. Please log in again.", 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (err) {
    throw new AppError("Refresh token expired or invalid. Please log in again.", 401);
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new AppError("User not found or deactivated.", 401);
  }

  const accessToken = generateAccessToken(user._id);

  res
    .cookie("token", accessToken, {
      expires: new Date(Date.now() + config.jwtCookieExpire * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: config.env === "production",
      sameSite: config.env === "production" ? "none" : "lax",
    })
    .status(200)
    .json({ success: true, accessToken });
});

// @desc    Verify a user's email using the token from the verification email
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new AppError("Verification token is required.", 400);
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() },
  }).select("+emailVerificationToken +emailVerificationExpire");

  if (!user) {
    throw new AppError("Verification link is invalid or has expired.", 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, 200, "Email verified successfully.");
});

// @desc    Request a password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return sendSuccess(
      res,
      200,
      "If an account with that email exists, a reset link has been sent."
    );
  }

  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;
  const template = emailTemplates.resetPassword(user.name, resetUrl);

  try {
    await sendEmail({ to: user.email, ...template });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError("Failed to send password reset email. Please try again.", 500);
  }

  sendSuccess(res, 200, "If an account with that email exists, a reset link has been sent.");
});

// @desc    Reset password using a valid reset token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { token, password } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select("+resetPasswordToken +resetPasswordExpire");

  if (!user) {
    throw new AppError("Reset link is invalid or has expired.", 400);
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(res, user._id, 200, user.toSafeObject());
});

// @desc    Change password for the logged-in user
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError("Current password is incorrect.", 401);
  }

  user.password = newPassword;
  await user.save();

  sendSuccess(res, 200, "Password changed successfully.");
});

module.exports = {
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
};
