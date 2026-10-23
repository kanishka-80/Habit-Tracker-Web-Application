/**
 * ==========================================================
 * googleSheetsSyncService.js
 * Dual Sync Service: Asynchronously mirrors MongoDB records
 * into Google Sheets via the Google Apps Script Web App.
 * ==========================================================
 */

const SPREADSHEET_ID =
  process.env.SHEETS_SPREADSHEET_ID || "1YwbwDg8z_1ZPl2Dg7ZCeavVzXq88Qms9yy-B4dORvHg";
const SCRIPT_URL =
  process.env.SHEETS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbxNanMpd0a96Dr_wNOt8va2udk_N2UOM53GmNqjXlATLj3R10DFcimRkr1a6jPLAeeM3g/exec";

async function sendToSheets(payload) {
  if (!SCRIPT_URL) return;
  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        spreadsheetId: SPREADSHEET_ID,
        ...payload,
      }),
      redirect: "follow",
    });
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (!json.success) {
        console.warn("[GoogleSheetsSync] Sync warning:", json.message);
      }
    } catch {
      // Non-JSON response (e.g., if Apps Script deployment needs New Version)
    }
  } catch (err) {
    console.error("[GoogleSheetsSync] Error syncing to Sheets:", err.message);
  }
}

// ── Habits Sync ──
exports.syncHabitCreate = (habit) => {
  const row = [
    String(habit._id || habit.id),
    String(habit.user || ""),
    habit.title || habit.name || "Untitled",
    habit.name || habit.title || "Untitled",
    habit.description || "",
    habit.category || "General",
    habit.frequency || "Daily",
    habit.priority || "Medium",
    habit.reminderTime || "07:00",
    Number(habit.target) || 1,
    habit.startDate
      ? new Date(habit.startDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    Number(habit.currentStreak) || 0,
    Number(habit.longestStreak) || 0,
    Boolean(habit.completedToday),
  ];
  sendToSheets({ action: "append", sheet: "Habits", row });
};

exports.syncHabitUpdate = (habit) => {
  const row = [
    String(habit._id || habit.id),
    String(habit.user || ""),
    habit.title || habit.name || "Untitled",
    habit.name || habit.title || "Untitled",
    habit.description || "",
    habit.category || "General",
    habit.frequency || "Daily",
    habit.priority || "Medium",
    habit.reminderTime || "07:00",
    Number(habit.target) || 1,
    habit.startDate
      ? new Date(habit.startDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    Number(habit.currentStreak) || 0,
    Number(habit.longestStreak) || 0,
    Boolean(habit.completedToday),
  ];
  sendToSheets({ action: "update", sheet: "Habits", id: String(habit._id || habit.id), row });
};

exports.syncHabitDelete = (habitId) => {
  sendToSheets({ action: "delete", sheet: "Habits", id: String(habitId) });
};

// ── Study Session Sync ──
exports.syncStudyCreate = (session) => {
  const row = [
    String(session._id || session.id),
    String(session.user || ""),
    session.semester || "Semester 7",
    session.course || "Computer Science",
    session.subject || session.topic || "Subject",
    session.topic || session.subject || "Topic",
    session.day || "Monday",
    session.startTime || "09:00",
    session.endTime || "10:00",
    session.priority || "Medium",
    Boolean(session.completed),
    Number(session.progress) || (session.completed ? 100 : 0),
    session.date
      ? new Date(session.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    Number(session.estimatedMinutes || session.durationMinutes) || 45,
  ];
  sendToSheets({ action: "append", sheet: "Study", row });
};

exports.syncStudyUpdate = (session) => {
  const row = [
    String(session._id || session.id),
    String(session.user || ""),
    session.semester || "Semester 7",
    session.course || "Computer Science",
    session.subject || session.topic || "Subject",
    session.topic || session.subject || "Topic",
    session.day || "Monday",
    session.startTime || "09:00",
    session.endTime || "10:00",
    session.priority || "Medium",
    Boolean(session.completed),
    Number(session.progress) || (session.completed ? 100 : 0),
    session.date
      ? new Date(session.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    Number(session.estimatedMinutes || session.durationMinutes) || 45,
  ];
  sendToSheets({ action: "update", sheet: "Study", id: String(session._id || session.id), row });
};

exports.syncStudyDelete = (sessionId) => {
  sendToSheets({ action: "delete", sheet: "Study", id: String(sessionId) });
};
