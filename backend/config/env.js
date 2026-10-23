require("dotenv").config();
console.log("CLIENT_URL =", process.env.CLIENT_URL || "Not set (using default)");

/**
 * Centralized, validated access point for all environment variables.
 */
if (!process.env.MONGO_URI) {
  console.error(
    "❌ CRITICAL ERROR: MONGO_URI environment variable is missing!\n" +
    "👉 Please go to Railway Dashboard -> Service -> Variables tab and add MONGO_URI."
  );
}

const config = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || "http://127.0.0.1:5500",

  mongoUri: process.env.MONGO_URI,

  jwtSecret: process.env.JWT_SECRET || "habit_tracker_jwt_secret_key_2026",
  jwtExpire: process.env.JWT_EXPIRE || "7d",
  jwtCookieExpire: parseInt(process.env.JWT_COOKIE_EXPIRE, 10) || 7,

  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "habit_tracker_jwt_refresh_secret_key_2026",
  jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || "30d",

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromName: process.env.FROM_NAME || "Habit Tracker",
    fromEmail: process.env.FROM_EMAIL || "noreply@habittracker.com",
  },

  sms: {
    fast2smsApiKey: process.env.FAST2SMS_API_KEY,
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
  },

  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
};

module.exports = config;
