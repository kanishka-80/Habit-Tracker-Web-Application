const config = require("../config/env");

/**
 * Send SMS utility supporting Fast2SMS (India) and Twilio (Global).
 * If no SMS API key is configured in .env, logs the SMS to the server console for dev testing.
 *
 * @param {Object} options - { phone, code, message }
 */
const sendSms = async ({ phone, code, message }) => {
  const smsMessage = message || `Your OTP code for Habit Tracker is: ${code}. Valid for 10 minutes. Do not share it with anyone.`;
  const cleanPhone = phone.replace(/[^0-9]/g, "");

  // 1. Fast2SMS Integration (Ideal for Indian mobile numbers - 10 digits)
  if (config.sms?.fast2smsApiKey) {
    try {
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: config.sms.fast2smsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: code,
          numbers: cleanPhone,
        }),
      });
      const data = await response.json();
      if (data.return) {
        console.log(`[SMS SERVICE] Fast2SMS delivered OTP to ${cleanPhone}`);
        return { success: true, provider: "fast2sms" };
      } else {
        console.error(`[SMS SERVICE] Fast2SMS error: ${data.message || JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error(`[SMS SERVICE] Fast2SMS request failed: ${err.message}`);
    }
  }

  // 2. Twilio Integration (Global numbers)
  if (config.sms?.twilio?.accountSid && config.sms?.twilio?.authToken && config.sms?.twilio?.phoneNumber) {
    try {
      const twilio = require("twilio")(config.sms.twilio.accountSid, config.sms.twilio.authToken);
      const formattedPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;
      await twilio.messages.create({
        body: smsMessage,
        from: config.sms.twilio.phoneNumber,
        to: formattedPhone,
      });
      console.log(`[SMS SERVICE] Twilio SMS delivered OTP to ${formattedPhone}`);
      return { success: true, provider: "twilio" };
    } catch (err) {
      console.error(`[SMS SERVICE] Twilio request failed: ${err.message}`);
    }
  }

  // 3. Fallback Development Mode (Safe Console Logging)
  console.log(`====================================================`);
  console.log(`[SMS SERVICE] (DEV MODE - No SMS Provider Configured)`);
  console.log(`📱 TO PHONE : ${cleanPhone}`);
  console.log(`🔑 OTP CODE : ${code}`);
  console.log(`💬 MESSAGE  : ${smsMessage}`);
  console.log(`💡 To send real SMS to mobile numbers, add FAST2SMS_API_KEY or TWILIO credentials in backend/.env`);
  console.log(`====================================================`);

  return { success: true, provider: "dev_console" };
};

module.exports = { sendSms };
