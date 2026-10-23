const nodemailer = require("nodemailer");
const config = require("../config/env");

/**
 * Creates a reusable Nodemailer transporter using SMTP credentials
 * from the environment configuration.
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465, // true for 465, false for other ports
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
};

/**
 * Sends an email.
 * @param {object} options
 * @param {string} options.to - recipient email address
 * @param {string} options.subject - email subject line
 * @param {string} options.html - HTML body content
 * @param {string} [options.text] - plain text fallback
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ""),
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

/**
 * Pre-built templates for common transactional emails used across
 * the app (verification, password reset, habit reminders, weekly summary).
 */
const emailTemplates = {
  verifyEmail: (name, verifyUrl) => ({
    subject: "Verify your Habit Tracker account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background:#0b0f19; color:#e5e7eb; padding: 32px; border-radius: 16px;">
        <h2 style="color:#3B82F6;">Welcome to Habit Tracker, ${name}!</h2>
        <p>Please verify your email address to activate your account and start building better habits.</p>
        <a href="${verifyUrl}" style="display:inline-block; margin-top:16px; padding:12px 24px; background:#3B82F6; color:#ffffff; text-decoration:none; border-radius:8px;">Verify Email</a>
        <p style="margin-top:24px; font-size:12px; color:#9ca3af;">If you did not create this account, you can safely ignore this email.</p>
      </div>
    `,
  }),

  resetPassword: (name, resetUrl) => ({
    subject: "Reset your Habit Tracker password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background:#0b0f19; color:#e5e7eb; padding: 32px; border-radius: 16px;">
        <h2 style="color:#3B82F6;">Password Reset Request</h2>
        <p>Hi ${name}, we received a request to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block; margin-top:16px; padding:12px 24px; background:#3B82F6; color:#ffffff; text-decoration:none; border-radius:8px;">Reset Password</a>
        <p style="margin-top:24px; font-size:12px; color:#9ca3af;">If you did not request this, please ignore this email or contact support.</p>
      </div>
    `,
  }),

  habitReminder: (name, habitTitle) => ({
    subject: `Reminder: ${habitTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background:#0b0f19; color:#e5e7eb; padding: 32px; border-radius: 16px;">
        <h2 style="color:#3B82F6;">Time for "${habitTitle}"</h2>
        <p>Hi ${name}, this is your scheduled reminder to complete your habit today. Keep your streak alive!</p>
      </div>
    `,
  }),

  weeklySummary: (name, stats) => ({
    subject: "Your Weekly Habit Summary",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background:#0b0f19; color:#e5e7eb; padding: 32px; border-radius: 16px;">
        <h2 style="color:#3B82F6;">Weekly Summary for ${name}</h2>
        <p>Completion rate: <strong>${stats.completionRate}%</strong></p>
        <p>Habits completed: <strong>${stats.completed}</strong> / ${stats.total}</p>
        <p>Longest active streak: <strong>${stats.longestStreak} days</strong></p>
      </div>
    `,
  }),
  otpEmail: (otpCode) => ({
    subject: `Your OTP Code: ${otpCode} - Habit Tracker`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background:#0b0f19; color:#e5e7eb; padding: 32px; border-radius: 16px;">
        <h2 style="color:#EAB308;">Your Habit Tracker Verification Code</h2>
        <p>Use the following 6-digit OTP code to complete your verification:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #EAB308; background: #1f293d; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
          ${otpCode}
        </div>
        <p style="font-size: 13px; color: #9ca3af;">This OTP code is valid for 10 minutes. Please do not share this code with anyone.</p>
      </div>
    `,
  }),
};

module.exports = {
  sendEmail,
  emailTemplates,
};
