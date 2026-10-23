/* ==========================================================
   settings.js — appearance, notifications, reminders, account
   ========================================================== */

const SETTING_TOGGLES = [
  "browserNotifications",
  "habitReminders",
  "studyReminders",
  "emailReminders",
];

function loadSettingsIntoForm() {
  const settings = HabitStore.loadSettings();
  SETTING_TOGGLES.forEach((key) => {
    const input = document.getElementById(key);
    if (input) input.checked = Boolean(settings[key]);
  });
  document.getElementById("defaultReminderTime").value = settings.defaultReminderTime;
  document.getElementById("reminderSound").value = settings.reminderSound;
}

async function persistSettings() {
  const settings = HabitStore.loadSettings();
  SETTING_TOGGLES.forEach((key) => {
    const input = document.getElementById(key);
    if (input) settings[key] = input.checked;
  });
  const defaultTime = document.getElementById("defaultReminderTime");
  const reminderSound = document.getElementById("reminderSound");
  if (defaultTime) settings.defaultReminderTime = defaultTime.value;
  if (reminderSound) settings.reminderSound = reminderSound.value;

  if (window.ProfileAPI) {
    await ProfileAPI.updateNotifications({
      emailReminders: settings.emailReminders,
      browserNotifications: settings.browserNotifications,
      weeklySummary: settings.habitReminders
    });
  }

  HabitStore.saveSettings(settings);
  showToast("Preferences saved.", "success");
}

function initSettingsPage() {
  loadSettingsIntoForm();

  SETTING_TOGGLES.forEach((key) => {
    const input = document.getElementById(key);
    if (input) input.addEventListener("change", persistSettings);
  });
  const defaultTime = document.getElementById("defaultReminderTime");
  if (defaultTime) defaultTime.addEventListener("change", persistSettings);
  const sound = document.getElementById("reminderSound");
  if (sound) sound.addEventListener("change", persistSettings);

  const resetBtn = document.getElementById("resetDemoData");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      HabitStore.seedHabits();
      HabitStore.seedStudyPlan();
      HabitStore.seedJournal();
      showToast("Demo data restored.", "success");
    });
  }

  const logoutBtn = document.getElementById("settingsLogout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (window.AuthAPI) {
        try {
          await AuthAPI.logout();
        } catch (e) {
          console.warn("Logout error:", e);
        }
      }
      localStorage.removeItem("ht_session");
      localStorage.removeItem("ht_token");
      showToast("Signed out. Redirecting...", "success");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 500);
    });
  }
}

document.addEventListener("app:ready", () => {
  if (!document.getElementById("defaultReminderTime")) return;
  initSettingsPage();
});
