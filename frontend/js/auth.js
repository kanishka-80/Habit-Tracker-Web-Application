/* ==========================================================
   auth.js — login & register validation, password visibility
   Demo only: no credentials are stored, no backend is called.
   ========================================================== */

function setFieldError(input, message) {
  if (!input) return;
  const holder = document.getElementById(`${input.id}Error`);
  if (message) {
    input.classList.add("invalid");
    input.setAttribute("aria-invalid", "true");
    if (holder) {
      holder.textContent = message;
      holder.classList.add("show");
    }
  } else {
    input.classList.remove("invalid");
    input.removeAttribute("aria-invalid");
    if (holder) holder.classList.remove("show");
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function isValidPhone(value) {
  return /^[0-9]{10}$/.test(value.trim());
}

function initPasswordToggles() {
  document.querySelectorAll(".toggle-password").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.target);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.innerHTML = `<i class="fa-solid ${show ? "fa-eye-slash" : "fa-eye"}" aria-hidden="true"></i>`;
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });
}

function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const emailGroup = document.getElementById("emailGroup");
  const phoneGroup = document.getElementById("phoneGroup");
  const passwordGroup = document.getElementById("passwordGroup");
  const otpGroup = document.getElementById("otpGroup");

  const emailInput = document.getElementById("loginEmail");
  const phoneInput = document.getElementById("loginPhone");
  const passwordInput = document.getElementById("loginPassword");
  const otpInput = document.getElementById("loginOtp");
  const sendOtpBtn = document.getElementById("sendLoginOtpBtn");
  const submitBtn = document.getElementById("loginSubmitBtn");

  let currentMode = "email"; // 'email', 'phone', 'otp'

  // Tab switcher
  document.querySelectorAll(".login-tab-btn").forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => {
      document.querySelectorAll(".login-tab-btn").forEach((b) => b.classList.remove("active"));
      tabBtn.classList.add("active");
      currentMode = tabBtn.dataset.mode;

      // Clear errors
      [emailInput, phoneInput, passwordInput, otpInput].forEach((inp) => inp && setFieldError(inp, ""));

      if (currentMode === "email") {
        emailGroup.classList.remove("d-none");
        phoneGroup.classList.add("d-none");
        passwordGroup.classList.remove("d-none");
        otpGroup.classList.add("d-none");
        submitBtn.textContent = "Login with Email";
      } else if (currentMode === "phone") {
        emailGroup.classList.add("d-none");
        phoneGroup.classList.remove("d-none");
        passwordGroup.classList.remove("d-none");
        otpGroup.classList.add("d-none");
        submitBtn.textContent = "Login with Phone";
      } else if (currentMode === "otp") {
        emailGroup.classList.add("d-none");
        phoneGroup.classList.remove("d-none");
        passwordGroup.classList.add("d-none");
        otpGroup.classList.remove("d-none");
        submitBtn.textContent = "Verify & Login via OTP";
      }
    });
  });

  // Send OTP button
  if (sendOtpBtn) {
    sendOtpBtn.addEventListener("click", async () => {
      const phoneVal = phoneInput.value.trim();
      if (!isValidPhone(phoneVal)) {
        setFieldError(phoneInput, "Enter a valid 10-digit mobile number.");
        return;
      }
      setFieldError(phoneInput, "");
      setButtonLoading(sendOtpBtn, true, "Sending...");

      try {
        const res = await AuthAPI.sendOtp(phoneVal, "login");
        if (res.success) {
          showToast(res.message || "OTP sent successfully to your mobile number.", "success");
        } else {
          showToast(res.message || "Failed to send OTP.", "danger");
        }
      } catch (err) {
        showToast(err.message || "Failed to send OTP.", "danger");
      } finally {
        setButtonLoading(sendOtpBtn, false);
      }
    });
  }

  // Submit Handler
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    let valid = true;

    if (currentMode === "email") {
      if (!emailInput.value.trim()) {
        setFieldError(emailInput, "Email is required.");
        valid = false;
      } else if (!isValidEmail(emailInput.value)) {
        setFieldError(emailInput, "Enter a valid email address.");
        valid = false;
      } else {
        setFieldError(emailInput, "");
      }

      if (!passwordInput.value) {
        setFieldError(passwordInput, "Password is required.");
        valid = false;
      } else if (passwordInput.value.length < 6) {
        setFieldError(passwordInput, "Password must be at least 6 characters.");
        valid = false;
      } else {
        setFieldError(passwordInput, "");
      }
    } else if (currentMode === "phone") {
      if (!isValidPhone(phoneInput.value)) {
        setFieldError(phoneInput, "Enter a valid 10-digit phone number.");
        valid = false;
      } else {
        setFieldError(phoneInput, "");
      }

      if (!passwordInput.value) {
        setFieldError(passwordInput, "Password is required.");
        valid = false;
      } else if (passwordInput.value.length < 6) {
        setFieldError(passwordInput, "Password must be at least 6 characters.");
        valid = false;
      } else {
        setFieldError(passwordInput, "");
      }
    } else if (currentMode === "otp") {
      if (!isValidPhone(phoneInput.value)) {
        setFieldError(phoneInput, "Enter a valid 10-digit phone number.");
        valid = false;
      } else {
        setFieldError(phoneInput, "");
      }

      if (!otpInput.value || otpInput.value.trim().length !== 6) {
        setFieldError(otpInput, "Enter a valid 6-digit OTP.");
        valid = false;
      } else {
        setFieldError(otpInput, "");
      }
    }

    if (!valid) {
      showToast("Please fix the highlighted fields.", "danger");
      return;
    }

    setButtonLoading(submitBtn, true, "Authenticating...");

    try {
      let response;
      if (currentMode === "email") {
        response = await AuthAPI.login(emailInput.value.trim(), passwordInput.value);
      } else if (currentMode === "phone") {
        response = await AuthAPI.login(phoneInput.value.trim(), passwordInput.value);
      } else if (currentMode === "otp") {
        response = await AuthAPI.loginWithOtp(phoneInput.value.trim(), otpInput.value.trim());
      }

      if (response && response.success) {
        showToast("Login Successful", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 700);
      } else {
        showToast(response?.message || "Login Failed", "danger");
      }
    } catch (error) {
      showToast(error.message || "An error occurred during login.", "danger");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  [emailInput, phoneInput, passwordInput, otpInput].forEach((input) => {
    if (input) input.addEventListener("input", () => setFieldError(input, ""));
  });

  const forgot = document.getElementById("forgotPassword");
  if (forgot) {
    forgot.addEventListener("click", (event) => {
      event.preventDefault();
      const emailOrPhone = (emailInput.value || phoneInput.value).trim();
      if (!emailOrPhone) {
        showToast("Please enter your email or phone number to reset password.", "info");
        return;
      }
      showToast("Password reset link sent.", "success");
    });
  }
}

function initRegisterForm() {
  const form = document.getElementById("registerForm");
  if (!form) return;
  const name = document.getElementById("registerName");
  const email = document.getElementById("registerEmail");
  const phone = document.getElementById("registerPhone");
  const password = document.getElementById("registerPassword");
  const confirm = document.getElementById("registerConfirm");
  const otpInput = document.getElementById("registerOtp");
  const sendOtpBtn = document.getElementById("sendRegisterOtpBtn");
  const terms = document.getElementById("registerTerms");

  // Send OTP handler
  if (sendOtpBtn) {
    sendOtpBtn.addEventListener("click", async () => {
      const phoneVal = phone.value.trim();
      if (!isValidPhone(phoneVal)) {
        setFieldError(phone, "Enter a valid 10-digit mobile number.");
        return;
      }
      setFieldError(phone, "");
      setButtonLoading(sendOtpBtn, true, "Sending...");

      try {
        const res = await AuthAPI.sendOtp(phoneVal, "signup");
        if (res.success) {
          showToast(res.message || "OTP sent successfully to your mobile number.", "success");
        } else {
          showToast(res.message || "Failed to send OTP.", "danger");
        }
      } catch (err) {
        showToast(err.message || "Failed to send OTP.", "danger");
      } finally {
        setButtonLoading(sendOtpBtn, false);
      }
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    let valid = true;

    if (name.value.trim().length < 3) {
      setFieldError(name, "Enter your full name (min 3 characters).");
      valid = false;
    } else setFieldError(name, "");

    if (!isValidEmail(email.value)) {
      setFieldError(email, "Enter a valid email address.");
      valid = false;
    } else setFieldError(email, "");

    if (!isValidPhone(phone.value)) {
      setFieldError(phone, "Enter a valid 10-digit phone number.");
      valid = false;
    } else setFieldError(phone, "");

    if (password.value.length < 6) {
      setFieldError(password, "Password must be at least 6 characters.");
      valid = false;
    } else setFieldError(password, "");

    if (confirm.value !== password.value || !confirm.value) {
      setFieldError(confirm, "Passwords do not match.");
      valid = false;
    } else setFieldError(confirm, "");

    const termsError = document.getElementById("registerTermsError");
    if (!terms.checked) {
      termsError.classList.add("show");
      valid = false;
    } else termsError.classList.remove("show");

    if (!valid) {
      showToast("Please fix the highlighted fields.", "danger");
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    setButtonLoading(button, true, "Creating account...");

    try {
      const response = await AuthAPI.register({
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        password: password.value,
        otp: otpInput ? otpInput.value.trim() : undefined
      });

      if (response.success) {
        showToast("Account Created Successfully!", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 800);
      } else {
        showToast(response.message || "Registration Failed", "danger");
      }
    } catch (error) {
      showToast(error.message || "Registration failed.", "danger");
    } finally {
      setButtonLoading(button, false);
    }
  });

  [name, email, phone, password, confirm, otpInput].forEach((input) => {
    if (input) input.addEventListener("input", () => setFieldError(input, ""));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initPasswordToggles();
  initLoginForm();
  initRegisterForm();
});
