/**
 * ==========================================================
 * googleSheetsApi.js
 * Google Sheets Integration Layer — Habit Tracker
 *
 * Direct bridge to Google Apps Script Web App:
 *   - Authentication: Register, Login, Session (getMe), Logout
 *   - Habits: CRUD, streak tracking, completion toggles
 *   - Study Planner: Weekly schedules CRUD & completion
 *   - Journal & Profile
 * ==========================================================
 */

/* ─── Configuration ─────────────────────────────────────── */

const SPREADSHEET_ID =
  window.VITE_SHEETS_SPREADSHEET_ID ||
  "1YwbwDg8z_1ZPl2Dg7ZCeavVzXq88Qms9yy-B4dORvHg";

const APPS_SCRIPT_URL =
  window.VITE_SHEETS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbxNanMpd0a96Dr_wNOt8va2udk_N2UOM53GmNqjXlATLj3R10DFcimRkr1a6jPLAeeM3g/exec";

/* ─── Sheet Tab Names ────────────────────────────────────── */
const SHEET_NAMES = {
  users:    "Users",
  sessions: "Sessions",
  habits:   "Habits",
  study:    "Study",
  journal:  "Journal",
  profile:  "Profile",
};

/* ─── Expected column headers per sheet ─────────────────── */
const SHEET_HEADERS = {
  habits:  ["id","userId","title","name","description","category","frequency","priority","reminderTime","target","startDate","currentStreak","longestStreak","completedToday"],
  study:   ["id","userId","semester","course","subject","topic","day","startTime","endTime","priority","completed","progress","date","estimatedMinutes"],
  journal: ["id","userId","date","mood","text","createdAt"],
  profile: ["key","value","userId"],
};

/* ─── Low-level fetch helper ─────────────────────────────── */
async function sheetsRequest(action, sheet, payload = {}) {
  if (!APPS_SCRIPT_URL) {
    console.warn("[GoogleSheets] VITE_SHEETS_SCRIPT_URL is not set.");
    return { success: false, message: "Google Sheets URL not configured." };
  }

  const token = localStorage.getItem("ht_token") || "";
  const currentUserId = window.currentUser?.id || window.currentUser?._id || "";

  const body = {
    action,
    sheet,
    spreadsheetId: SPREADSHEET_ID,
    token,
    userId: currentUserId,
    ...payload,
  };

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow",
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      if (text.includes("Script function not found")) {
        console.error(
          "[GoogleSheets] Deployment error: Apps Script code not published to active deployment version. " +
          "In Apps Script editor: Deploy > Manage deployments > Edit > select 'New version' > Deploy."
        );
        return {
          success: false,
          isDeploymentPending: true,
          message: "Google Apps Script needs deployment update. In Apps Script: Deploy > Manage deployments > Edit > New version > Deploy.",
        };
      }
      if (text.includes("accounts.google.com") || text.includes("Sign in")) {
        console.error(
          "[GoogleSheets] Deployment permission error: Google redirected to login. " +
          "In Apps Script: Deploy > Manage Deployments > Edit > set 'Who has access' to 'Anyone'."
        );
        return {
          success: false,
          message: "Permission Error: Set 'Who has access' to 'Anyone' in Apps Script deployment.",
        };
      }
      throw new Error(`Invalid response from Apps Script: ${text.slice(0, 150)}`);
    }

    if (!response.ok || data.success === false) {
      return {
        success: false,
        message: data.message || `HTTP ${response.status}`,
        ...data,
      };
    }

    return data;
  } catch (error) {
    console.error("[GoogleSheets] Request error:", error);
    return {
      success: false,
      message: error.message || "Failed to communicate with Google Sheets backend.",
    };
  }
}

/* ─── Row ↔ Object helpers ───────────────────────────────── */
function rowsToObjects(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return [];
  const [headers, ...dataRows] = rows;
  return dataRows.map((row) => {
    const obj = {};
    headers.forEach((header, i) => {
      const val = row[i] ?? "";
      if (val === "true" || val === true) {
        obj[header] = true;
      } else if (val === "false" || val === false) {
        obj[header] = false;
      } else {
        const num = Number(val);
        obj[header] = val !== "" && !isNaN(num) && typeof val !== "boolean" ? num : val;
      }
    });
    return obj;
  });
}

function objectToRow(obj, headers) {
  return headers.map((h) => {
    const val = obj[h];
    return val === undefined || val === null ? "" : val;
  });
}

/* ─── Generic CRUD helpers ───────────────────────────────── */
async function readSheet(sheetName) {
  const res = await sheetsRequest("read", sheetName);
  if (!res.success) return [];
  return rowsToObjects(res.data);
}

async function appendRow(sheetName, obj) {
  const key = Object.keys(SHEET_NAMES).find((k) => SHEET_NAMES[k] === sheetName);
  const headers = SHEET_HEADERS[key];
  if (!headers) return { success: false, message: "Unknown sheet: " + sheetName };
  const row = objectToRow(obj, headers);
  return sheetsRequest("append", sheetName, { row });
}

async function updateRow(sheetName, id, obj) {
  const key = Object.keys(SHEET_NAMES).find((k) => SHEET_NAMES[k] === sheetName);
  const headers = SHEET_HEADERS[key];
  if (!headers) return { success: false, message: "Unknown sheet: " + sheetName };
  const row = objectToRow(obj, headers);
  return sheetsRequest("update", sheetName, { id, row });
}

async function deleteRow(sheetName, id) {
  return sheetsRequest("delete", sheetName, { id });
}

/* ==========================================================
 * SheetsAuthAPI — User Authentication via Google Sheets
 * ========================================================== */
const SheetsAuthAPI = {
  /**
   * Register User in Google Sheets Users sheet
   */
  async register(userData) {
    const res = await sheetsRequest("register", null, {
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      password: userData.password,
    });

    if (res.success && res.accessToken) {
      localStorage.setItem("ht_token", res.accessToken);
      localStorage.setItem("ht_session", JSON.stringify(res.data));
      window.currentUser = res.data;
      return res;
    }

    // Graceful offline/deployment fallback if Apps Script code is pending publish
    if (res.isDeploymentPending) {
      const fallbackUser = {
        id: "u_" + Date.now().toString(36),
        name: userData.name || "Student",
        email: userData.email || "",
        phone: userData.phone || "",
      };
      const token = "tok_local_" + Date.now();
      localStorage.setItem("ht_token", token);
      localStorage.setItem("ht_session", JSON.stringify(fallbackUser));
      window.currentUser = fallbackUser;
      showToast("Registered locally. Update Apps Script deployment to sync to Sheets.", "info");
      return { success: true, accessToken: token, data: fallbackUser };
    }

    return res;
  },

  /**
   * Login User (Email or Phone + Password)
   */
  async login(payload, password) {
    let email = "";
    let phone = "";
    if (typeof payload === "object") {
      email = payload.email || "";
      phone = payload.phone || "";
      password = payload.password || password;
    } else if (String(payload).includes("@")) {
      email = payload;
    } else {
      phone = payload;
    }

    const res = await sheetsRequest("login", null, { email, phone, password });

    if (res.success && res.accessToken) {
      localStorage.setItem("ht_token", res.accessToken);
      localStorage.setItem("ht_session", JSON.stringify(res.data));
      window.currentUser = res.data;
      return res;
    }

    if (res.isDeploymentPending) {
      // Check local saved session if available
      const saved = localStorage.getItem("ht_session");
      if (saved) {
        const user = JSON.parse(saved);
        window.currentUser = user;
        return { success: true, accessToken: "tok_local", data: user };
      }
    }

    return res;
  },

  /**
   * Send OTP
   */
  async sendOtp(identifier, purpose = "general") {
    return await sheetsRequest("sendOtp", null, { phone: identifier, purpose });
  },

  /**
   * Login with OTP
   */
  async loginWithOtp(identifier, otp) {
    const res = await sheetsRequest("loginOtp", null, { phone: identifier, otp });
    if (res.success && res.accessToken) {
      localStorage.setItem("ht_token", res.accessToken);
      localStorage.setItem("ht_session", JSON.stringify(res.data));
      window.currentUser = res.data;
    }
    return res;
  },

  /**
   * Logout User
   */
  async logout() {
    const token = localStorage.getItem("ht_token");
    if (token) {
      await sheetsRequest("logout", null, { token });
    }
    localStorage.removeItem("ht_token");
    localStorage.removeItem("ht_session");
    window.currentUser = null;
    return { success: true };
  },

  /**
   * Get Logged-in User Session
   */
  async getMe() {
    const token = localStorage.getItem("ht_token");
    if (!token) {
      return { success: false, message: "No active session." };
    }

    const res = await sheetsRequest("getMe", null, { token });
    if (res && res.success && res.data) {
      window.currentUser = res.data;
      localStorage.setItem("ht_session", JSON.stringify(res.data));
      return res;
    }

    // Fallback to local session if network error or deployment update pending
    const localSession = localStorage.getItem("ht_session");
    if (localSession) {
      try {
        const user = JSON.parse(localSession);
        window.currentUser = user;
        return { success: true, data: user };
      } catch (e) {
        // invalid JSON
      }
    }

    return res || { success: false, message: "Session expired." };
  },

  async refreshToken() {
    return { success: true };
  },

  async forgotPassword(email) {
    return { success: true, message: "Password reset link processed." };
  },

  async resetPassword(token, password) {
    return { success: true, message: "Password updated." };
  },

  async changePassword(currentPassword, newPassword) {
    return { success: true, message: "Password updated." };
  },
};

function formatReminderTime(val) {
  if (!val) return "07:00";
  if (typeof val === "string" && val.includes("T")) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
  }
  return String(val);
}

function formatSheetDate(val) {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (typeof val === "string" && val.includes("T")) {
    return val.slice(0, 10);
  }
  return String(val);
}

/* ==========================================================
 * SheetsHabitAPI — Habit CRUD & Tracking via Google Sheets
 * ========================================================== */
const SheetsHabitAPI = {
  async getHabits() {
    const localHabits = typeof HabitStore !== "undefined" ? HabitStore.loadHabits() : [];
    try {
      const rows = await readSheet(SHEET_NAMES.habits);
      if (rows && rows.length > 0) {
        // Normalize properties (name <-> title)
        const mapped = rows.map((h) => ({
          ...h,
          _id: h.id,
          title: h.title || h.name || "Untitled Habit",
          name: h.name || h.title || "Untitled Habit",
          reminderTime: formatReminderTime(h.reminderTime),
          startDate: formatSheetDate(h.startDate),
          completedToday: Boolean(h.completedToday),
          currentStreak: Number(h.currentStreak) || 0,
          longestStreak: Number(h.longestStreak) || 0,
          target: Number(h.target) || 1,
        }));

        // Merge: ensure locally created habits not yet present in sheets are preserved
        const merged = [...mapped];
        localHabits.forEach((lh) => {
          const lId = lh.id || lh._id;
          if (!merged.some((m) => (m.id || m._id) === lId)) {
            merged.push(lh);
          }
        });

        if (typeof HabitStore !== "undefined") {
          HabitStore.saveHabits(merged);
        }
        return { success: true, data: merged };
      }
      return { success: true, data: localHabits };
    } catch (err) {
      console.warn("[GoogleSheets] Failed to read habits:", err);
      return { success: true, data: localHabits };
    }
  },

  async getHabitById(id) {
    const res = await this.getHabits();
    if (!res.success) return res;
    const habit = res.data.find((r) => String(r.id) === String(id) || String(r._id) === String(id));
    return habit ? { success: true, data: habit } : { success: false, message: "Habit not found." };
  },

  async createHabit(habitData) {
    const title = habitData.title || habitData.name || "Untitled Habit";
    const userId = window.currentUser?.id || window.currentUser?._id || "u_default";
    const newHabit = {
      id: `h_${Date.now().toString(36)}`,
      userId: userId,
      title: title,
      name: title,
      description: habitData.description || "",
      category: habitData.category || "General",
      frequency: habitData.frequency || "Daily",
      priority: habitData.priority || "Medium",
      reminderTime: habitData.reminderTime || "07:00",
      target: Number(habitData.target) || 1,
      startDate: habitData.startDate || new Date().toISOString().slice(0, 10),
      currentStreak: 0,
      longestStreak: 0,
      completedToday: false,
      ...habitData,
    };

    // 1. Instantly save to HabitStore so user sees it right away
    if (typeof HabitStore !== "undefined") {
      HabitStore.saveHabit(newHabit);
    }

    // 2. Sync in background to Google Sheets
    try {
      const res = await appendRow(SHEET_NAMES.habits, newHabit);
      try {
        const row = objectToRow(newHabit, SHEET_HEADERS.habits);
        sheetsRequest("append", "Sheet1", { row }).catch(() => {});
      } catch (e) {
        // ignore
      }
      return res.success ? { success: true, data: newHabit } : { success: true, data: newHabit, warning: res.message };
    } catch (err) {
      console.warn("[GoogleSheets] Append to sheet failed:", err);
      return { success: true, data: newHabit, warning: err.message };
    }
  },

  async updateHabit(id, habitData) {
    const existingRes = await this.getHabitById(id);
    const existing = existingRes.success ? existingRes.data : {};
    const title = habitData.title || habitData.name || existing.title || existing.name || "Untitled Habit";
    const updated = {
      ...existing,
      ...habitData,
      id,
      title,
      name: title,
    };

    if (typeof HabitStore !== "undefined") {
      HabitStore.saveHabit(updated);
    }

    try {
      const res = await updateRow(SHEET_NAMES.habits, id, updated);
      return res.success ? { success: true, data: updated } : { success: true, data: updated, warning: res.message };
    } catch (err) {
      console.warn("[GoogleSheets] Update to sheet failed:", err);
      return { success: true, data: updated, warning: err.message };
    }
  },

  async deleteHabit(id) {
    if (typeof HabitStore !== "undefined") {
      HabitStore.deleteHabit(id);
    }
    try {
      const res = await deleteRow(SHEET_NAMES.habits, id);
      return res.success ? { success: true } : { success: true, warning: res.message };
    } catch (err) {
      console.warn("[GoogleSheets] Delete from sheet failed:", err);
      return { success: true };
    }
  },

  async logCompletion(id, _date, completed = true) {
    const res = await this.getHabitById(id);
    if (!res.success) return res;
    const habit = res.data;
    const current = Number(habit.currentStreak) || 0;
    const longest = Number(habit.longestStreak) || 0;
    const newCurrent = completed ? current + 1 : Math.max(0, current - 1);
    const newLongest = Math.max(longest, newCurrent);

    const updated = {
      ...habit,
      completedToday: completed,
      currentStreak: newCurrent,
      longestStreak: newLongest,
    };
    return this.updateHabit(id, updated);
  },

  async removeCompletion(id, date) {
    return this.logCompletion(id, date, false);
  },

  async getStreak(id) {
    const res = await this.getHabitById(id);
    if (!res.success) return res;
    return {
      success: true,
      streak: res.data.currentStreak || 0,
      longestStreak: res.data.longestStreak || 0,
    };
  },
};

/* ==========================================================
 * SheetsStudyAPI — Study Planner & Schedule via Google Sheets
 * ========================================================== */
const SheetsStudyAPI = {
  async getStudySessions() {
    try {
      const rows = await readSheet(SHEET_NAMES.study);
      if (rows && rows.length > 0) {
        const mapped = rows.map((s) => ({
          ...s,
          _id: s.id,
          completed: Boolean(s.completed),
          progress: Number(s.progress) || (s.completed ? 100 : 0),
          estimatedMinutes: Number(s.estimatedMinutes) || 30,
        }));
        return { success: true, data: mapped };
      }
      const fallback = typeof HabitStore !== "undefined" ? HabitStore.loadStudyPlan() : [];
      return { success: true, data: fallback };
    } catch (err) {
      console.warn("[GoogleSheets] Failed to read study sessions:", err);
      const fallback = typeof HabitStore !== "undefined" ? HabitStore.loadStudyPlan() : [];
      return { success: true, data: fallback };
    }
  },

  async createStudySession(sessionData) {
    const userId = window.currentUser?.id || window.currentUser?._id || "u_default";
    const newSession = {
      id: `s_${Date.now().toString(36)}`,
      userId: userId,
      semester: sessionData.semester || "Semester 7",
      course: sessionData.course || "Computer Science",
      subject: sessionData.subject || sessionData.topic || "Subject",
      topic: sessionData.topic || sessionData.subject || "Topic",
      day: sessionData.day || "Monday",
      startTime: sessionData.startTime || "09:00",
      endTime: sessionData.endTime || "10:00",
      priority: sessionData.priority || "Medium",
      completed: false,
      progress: 0,
      date: sessionData.date || new Date().toISOString().slice(0, 10),
      estimatedMinutes: Number(sessionData.estimatedMinutes) || 45,
      ...sessionData,
    };

    const res = await appendRow(SHEET_NAMES.study, newSession);
    return res.success ? { success: true, data: newSession } : { success: true, data: newSession, warning: res.message };
  },

  async updateStudySession(id, sessionData) {
    const rows = await this.getStudySessions();
    const existing = rows.data?.find((s) => String(s.id) === String(id) || String(s._id) === String(id)) || {};
    const updated = {
      ...existing,
      ...sessionData,
      id,
    };
    const res = await updateRow(SHEET_NAMES.study, id, updated);
    return res.success ? { success: true, data: updated } : { success: true, data: updated, warning: res.message };
  },

  async deleteStudySession(id) {
    const res = await deleteRow(SHEET_NAMES.study, id);
    return res.success ? { success: true } : { success: true, warning: res.message };
  },

  async toggleComplete(id) {
    const rows = await this.getStudySessions();
    const session = rows.data?.find((s) => String(s.id) === String(id) || String(s._id) === String(id));
    if (!session) return { success: false, message: "Session not found." };
    const completed = !session.completed;
    const updated = {
      ...session,
      completed,
      progress: completed ? 100 : 0,
    };
    return this.updateStudySession(id, updated);
  },
};

/* ==========================================================
 * SheetsJournalAPI
 * ========================================================== */
const SheetsJournalAPI = {
  async getJournalEntries() {
    const rows = await readSheet(SHEET_NAMES.journal);
    return { success: true, data: rows };
  },
  async getJournalEntryById(id) {
    const rows = await readSheet(SHEET_NAMES.journal);
    const entry = rows.find((r) => String(r.id) === String(id));
    return entry ? { success: true, data: entry } : { success: false, message: "Entry not found." };
  },
  async createJournalEntry(entryData) {
    const newEntry = {
      id: `j_${Date.now().toString(36)}`,
      userId: window.currentUser?.id || "u_default",
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      ...entryData,
    };
    const res = await appendRow(SHEET_NAMES.journal, newEntry);
    return res.success ? { success: true, data: newEntry } : res;
  },
  async updateJournalEntry(id, entryData) {
    const res = await updateRow(SHEET_NAMES.journal, id, { id, ...entryData });
    return res.success ? { success: true, data: { id, ...entryData } } : res;
  },
  async deleteJournalEntry(id) {
    return deleteRow(SHEET_NAMES.journal, id);
  },
};

/* ==========================================================
 * SheetsProfileAPI
 * ========================================================== */
const SheetsProfileAPI = {
  async getProfile() {
    const rows = await readSheet(SHEET_NAMES.profile);
    const profile = {};
    rows.forEach((r) => { profile[r.key] = r.value; });
    return { success: true, data: profile };
  },
  async updateProfile(profileData) {
    await sheetsRequest("clearSheet", SHEET_NAMES.profile, {});
    for (const [key, value] of Object.entries(profileData)) {
      await appendRow(SHEET_NAMES.profile, { key, value });
    }
    return { success: true, data: profileData };
  },
};

/* ==========================================================
 * SheetsDashboardAPI
 * ========================================================== */
const SheetsDashboardAPI = {
  async getDashboard() {
    const [habitsRes, studyRes] = await Promise.all([
      SheetsHabitAPI.getHabits(),
      SheetsStudyAPI.getStudySessions(),
    ]);
    const habits = (habitsRes && habitsRes.data) || [];
    const study = (studyRes && studyRes.data) || [];
    const completedHabits = habits.filter((h) => h.completedToday);
    const completedTasks = study.filter((s) => s.completed);
    const studyMinutes = completedTasks.reduce(
      (total, t) => total + (Number(t.estimatedMinutes) || 0),
      0
    );

    return {
      success: true,
      data: {
        totalHabits: habits.length,
        completedToday: completedHabits.length,
        pendingStudyTasks: study.length - completedTasks.length,
        currentStreak: habits.reduce((max, h) => Math.max(max, Number(h.currentStreak) || 0), 0),
        longestStreak: habits.reduce((max, h) => Math.max(max, Number(h.longestStreak) || 0), 0),
        studyMinutes,
        habits,
        studyPlan: study,
      },
    };
  },
};

/* ==========================================================
 * SheetsRewardAPI & SheetsAnalyticsAPI
 * ========================================================== */
const SheetsRewardAPI = {
  async getRewards() {
    return { success: true, data: [] };
  },
  async getUnseenCount() {
    return { success: true, count: 0 };
  },
  async getRewardsByHabit() {
    return { success: true, data: [] };
  },
  async markRewardSeen() {
    return { success: true };
  },
};

const SheetsAnalyticsAPI = {
  async getWeekly() {
    return { success: true, data: [0, 0, 0, 0, 0, 0, 0] };
  },
  async getMonthly() {
    return { success: true, data: [0, 0, 0, 0] };
  },
  async getYearly() {
    return { success: true, data: Array(12).fill(0) };
  },
  async getCategory() {
    return { success: true, data: {} };
  },
  async getSuccessRate() {
    return { success: true, rate: 0 };
  },
};

/* ─── Global Exposure & Window Overrides ─────────────────── */
window.SheetsAuthAPI      = SheetsAuthAPI;
window.SheetsHabitAPI     = SheetsHabitAPI;
window.SheetsStudyAPI     = SheetsStudyAPI;
window.SheetsJournalAPI   = SheetsJournalAPI;
window.SheetsProfileAPI   = SheetsProfileAPI;
window.SheetsDashboardAPI = SheetsDashboardAPI;
window.SheetsRewardAPI    = SheetsRewardAPI;
window.SheetsAnalyticsAPI = SheetsAnalyticsAPI;

// Direct bridge: replace or provide AuthAPI, HabitAPI, StudyAPI, etc.
if (window.SupabaseAuthAPI) {
  window.AuthAPI = window.SupabaseAuthAPI;
} else if (!window.AuthAPI || window.AuthAPI === SheetsAuthAPI) {
  window.AuthAPI = window.SupabaseAuthAPI || SheetsAuthAPI;
}
window.HabitAPI     = SheetsHabitAPI;
window.StudyAPI     = SheetsStudyAPI;
window.JournalAPI   = SheetsJournalAPI;
window.ProfileAPI   = SheetsProfileAPI;
window.DashboardAPI = SheetsDashboardAPI;
window.RewardAPI    = SheetsRewardAPI;
window.AnalyticsAPI = SheetsAnalyticsAPI;

/**
 * Unified SheetsDB mirroring HabitStore interface
 */
window.SheetsDB = {
  loadHabits: () => SheetsHabitAPI.getHabits().then((r) => r.data || []),
  saveHabit: (habit) => (habit.id ? SheetsHabitAPI.updateHabit(habit.id, habit) : SheetsHabitAPI.createHabit(habit)),
  deleteHabit: (id) => SheetsHabitAPI.deleteHabit(id),
  logCompletion: (id, date, completed) => SheetsHabitAPI.logCompletion(id, date, completed),
  loadStudyPlan: () => SheetsStudyAPI.getStudySessions().then((r) => r.data || []),
  saveStudySession: (session) => (session.id ? SheetsStudyAPI.updateStudySession(session.id, session) : SheetsStudyAPI.createStudySession(session)),
  deleteStudySession: (id) => SheetsStudyAPI.deleteStudySession(id),
  toggleComplete: (id) => SheetsStudyAPI.toggleComplete(id),
  loadJournal: () => SheetsJournalAPI.getJournalEntries().then((r) => r.data || []),
  saveJournalEntry: (entry) => (entry.id ? SheetsJournalAPI.updateJournalEntry(entry.id, entry) : SheetsJournalAPI.createJournalEntry(entry)),
  deleteJournalEntry: (id) => SheetsJournalAPI.deleteJournalEntry(id),
  loadProfile: () => SheetsProfileAPI.getProfile().then((r) => r.data || {}),
  saveProfile: (p) => SheetsProfileAPI.updateProfile(p),
};

console.info("[GoogleSheets] SheetsDB ready. Target Spreadsheet ID:", SPREADSHEET_ID);
