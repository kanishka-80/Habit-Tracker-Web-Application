/**
 * ==========================================================
 * googleSheetsApi.js
 * Google Sheets Integration Layer — Habit Tracker
 *
 * Architecture:
 *   Browser → Google Apps Script Web App (acts as a proxy)
 *          → Google Sheets API (private sheet, service-account level)
 *
 * The "proxy" is a Google Apps Script deployed as a Web App.
 * It lives alongside the sheet and has Owner-level access,
 * so NO service-account JSON file is exposed in the browser.
 *
 * Sheet Layout (one sheet tab per data type):
 *   Sheet1 "Habits"   → id | name | description | category | frequency | priority | reminderTime | startDate | currentStreak | longestStreak | completedToday
 *   Sheet2 "Study"    → id | subject | topic | date | estimatedMinutes | priority | completed | progress
 *   Sheet3 "Journal"  → id | date | mood | text
 *   Sheet4 "Profile"  → key | value  (single-row key-value pairs)
 *
 * SPREADSHEET_ID and APPS_SCRIPT_URL are set in your .env file:
 *   VITE_SHEETS_SPREADSHEET_ID
 *   VITE_SHEETS_SCRIPT_URL
 * ==========================================================
 */

/* ─── Configuration ─────────────────────────────────────── */

const SPREADSHEET_ID =
  window.VITE_SHEETS_SPREADSHEET_ID ||
  "1YwbwDg8z_1ZPl2Dg7ZCeavVzXq88Qms9yy-B4dORvHg"; // your sheet ID

const APPS_SCRIPT_URL =
  window.VITE_SHEETS_SCRIPT_URL ||
  ""; // paste your deployed Apps Script URL here after step 4 of the guide

/* ─── Sheet Tab Names ────────────────────────────────────── */
const SHEET_NAMES = {
  habits:  "Habits",
  study:   "Study",
  journal: "Journal",
  profile: "Profile",
};

/* ─── Expected column headers per sheet ─────────────────── */
const SHEET_HEADERS = {
  habits:  ["id","name","description","category","frequency","priority","reminderTime","startDate","currentStreak","longestStreak","completedToday"],
  study:   ["id","subject","topic","date","estimatedMinutes","priority","completed","progress"],
  journal: ["id","date","mood","text"],
  profile: ["key","value"],
};

/* ─── Low-level fetch helper ─────────────────────────────── */
async function sheetsRequest(action, sheet, payload = {}) {
  if (!APPS_SCRIPT_URL) {
    console.error(
      "[GoogleSheets] VITE_SHEETS_SCRIPT_URL is not set. " +
      "Deploy the Apps Script and add the URL to your .env file."
    );
    return { success: false, message: "Google Sheets URL not configured." };
  }

  const body = { action, sheet, spreadsheetId: SPREADSHEET_ID, ...payload };

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[GoogleSheets] Request error:", error);
    return { success: false, message: error.message || "Sheets request failed." };
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
      if (val === "true")  { obj[header] = true;  return; }
      if (val === "false") { obj[header] = false; return; }
      const num = Number(val);
      obj[header] = val !== "" && !isNaN(num) ? num : val;
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
  if (!headers) return { success: false, message: "Unknown sheet." };
  const row = objectToRow(obj, headers);
  return sheetsRequest("append", sheetName, { row });
}

async function updateRow(sheetName, id, obj) {
  const key = Object.keys(SHEET_NAMES).find((k) => SHEET_NAMES[k] === sheetName);
  const headers = SHEET_HEADERS[key];
  if (!headers) return { success: false, message: "Unknown sheet." };
  const row = objectToRow(obj, headers);
  return sheetsRequest("update", sheetName, { id, row });
}

async function deleteRow(sheetName, id) {
  return sheetsRequest("delete", sheetName, { id });
}

/* ─── Habit Sheets API ───────────────────────────────────── */
const SheetsHabitAPI = {
  async getHabits() {
    const rows = await readSheet(SHEET_NAMES.habits);
    return { success: true, data: rows };
  },
  async getHabitById(id) {
    const rows = await readSheet(SHEET_NAMES.habits);
    const habit = rows.find((r) => String(r.id) === String(id));
    return habit ? { success: true, data: habit } : { success: false, message: "Habit not found." };
  },
  async createHabit(habitData) {
    const newHabit = {
      id: `h_${Date.now().toString(36)}`,
      currentStreak: 0,
      longestStreak: 0,
      completedToday: false,
      ...habitData,
    };
    const res = await appendRow(SHEET_NAMES.habits, newHabit);
    return res.success ? { success: true, data: newHabit } : res;
  },
  async updateHabit(id, habitData) {
    const res = await updateRow(SHEET_NAMES.habits, id, { id, ...habitData });
    return res.success ? { success: true, data: { id, ...habitData } } : res;
  },
  async deleteHabit(id) {
    return deleteRow(SHEET_NAMES.habits, id);
  },
  async logCompletion(id, _date, completed = true) {
    const res = await this.getHabitById(id);
    if (!res.success) return res;
    const habit = res.data;
    const updated = {
      ...habit,
      completedToday: completed,
      currentStreak: completed ? habit.currentStreak + 1 : Math.max(0, habit.currentStreak - 1),
      longestStreak: Math.max(habit.longestStreak, completed ? habit.currentStreak + 1 : habit.longestStreak),
    };
    return this.updateHabit(id, updated);
  },
};

/* ─── Study Planner Sheets API ───────────────────────────── */
const SheetsStudyAPI = {
  async getStudySessions() {
    const rows = await readSheet(SHEET_NAMES.study);
    return { success: true, data: rows };
  },
  async createStudySession(sessionData) {
    const newSession = {
      id: `s_${Date.now().toString(36)}`,
      completed: false,
      progress: 0,
      ...sessionData,
    };
    const res = await appendRow(SHEET_NAMES.study, newSession);
    return res.success ? { success: true, data: newSession } : res;
  },
  async updateStudySession(id, sessionData) {
    const res = await updateRow(SHEET_NAMES.study, id, { id, ...sessionData });
    return res.success ? { success: true, data: { id, ...sessionData } } : res;
  },
  async deleteStudySession(id) {
    return deleteRow(SHEET_NAMES.study, id);
  },
  async toggleComplete(id) {
    const rows = await readSheet(SHEET_NAMES.study);
    const session = rows.find((r) => String(r.id) === String(id));
    if (!session) return { success: false, message: "Session not found." };
    const updated = {
      ...session,
      completed: !session.completed,
      progress: !session.completed ? 100 : session.progress,
    };
    return this.updateStudySession(id, updated);
  },
};

/* ─── Journal Sheets API ─────────────────────────────────── */
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
      date: new Date().toISOString().slice(0, 10),
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

/* ─── Profile Sheets API ─────────────────────────────────── */
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

/* ─── Expose on window ───────────────────────────────────── */
window.SheetsHabitAPI   = SheetsHabitAPI;
window.SheetsStudyAPI   = SheetsStudyAPI;
window.SheetsJournalAPI = SheetsJournalAPI;
window.SheetsProfileAPI = SheetsProfileAPI;

/**
 * SheetsDB — mirrors the HabitStore interface but backed by Google Sheets.
 * Swap HabitStore → SheetsDB to migrate any page.
 */
window.SheetsDB = {
  // ── Habits ──────────────────────────────────────────────
  async loadHabits() {
    const res = await SheetsHabitAPI.getHabits();
    return res.data || [];
  },
  async saveHabit(habit) {
    if (habit.id) return SheetsHabitAPI.updateHabit(habit.id, habit);
    return SheetsHabitAPI.createHabit(habit);
  },
  async deleteHabit(id) {
    return SheetsHabitAPI.deleteHabit(id);
  },
  async logCompletion(id, date, completed) {
    return SheetsHabitAPI.logCompletion(id, date, completed);
  },

  // ── Study Plan ──────────────────────────────────────────
  async loadStudyPlan() {
    const res = await SheetsStudyAPI.getStudySessions();
    return res.data || [];
  },
  async saveStudySession(session) {
    if (session.id) return SheetsStudyAPI.updateStudySession(session.id, session);
    return SheetsStudyAPI.createStudySession(session);
  },
  async deleteStudySession(id) {
    return SheetsStudyAPI.deleteStudySession(id);
  },
  async toggleComplete(id) {
    return SheetsStudyAPI.toggleComplete(id);
  },

  // ── Journal ─────────────────────────────────────────────
  async loadJournal() {
    const res = await SheetsJournalAPI.getJournalEntries();
    return res.data || [];
  },
  async saveJournalEntry(entry) {
    if (entry.id) return SheetsJournalAPI.updateJournalEntry(entry.id, entry);
    return SheetsJournalAPI.createJournalEntry(entry);
  },
  async deleteJournalEntry(id) {
    return SheetsJournalAPI.deleteJournalEntry(id);
  },

  // ── Profile ─────────────────────────────────────────────
  async loadProfile() {
    const res = await SheetsProfileAPI.getProfile();
    return res.data || {};
  },
  async saveProfile(profileData) {
    return SheetsProfileAPI.updateProfile(profileData);
  },
};

console.info("[GoogleSheets] SheetsDB ready. Spreadsheet ID:", SPREADSHEET_ID);
