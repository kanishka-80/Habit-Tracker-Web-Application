/**
 * ==========================================================
 * Google Apps Script — Habit Tracker Backend & Proxy
 * ==========================================================
 * Features:
 *   - Secure Authentication (Salted HMAC-SHA256; NEVER stores plaintext passwords)
 *   - Session Management (UUID tokens with expiry)
 *   - Habit CRUD & Completion Tracking
 *   - Study Planner CRUD
 *   - Auto-creation of missing sheets and header rows
 *   - CORS support for web frontend
 *
 * HOW TO DEPLOY / UPDATE:
 *   1. Open Google Sheet -> Extensions -> Apps Script
 *   2. Replace everything in Code.gs with this code and Save (Ctrl+S)
 *   3. Click "Deploy" -> "Manage deployments"
 *   4. Click the Edit (pencil) icon
 *   5. Change Version to: "New version"  <-- CRITICAL!
 *   6. Ensure "Who has access" is set to "Anyone"
 *   7. Click "Deploy"
 * ==========================================================
 */

// Server-side secret pepper for HMAC-SHA256 (kept on Google's servers, never in the sheet)
const SCRIPT_SECRET = "HABIT_TRACKER_SECURE_PEPPER_2026_xK9#vL2$mQ";

// Standard Sheet Tab Names
const SHEETS = {
  USERS: "Users",
  SESSIONS: "Sessions",
  HABITS: "Habits",
  STUDY: "Study",
  JOURNAL: "Journal",
  PROFILE: "Profile",
  OTP: "Otps"
};

// Default Column Headers per tab
const DEFAULT_HEADERS = {
  Users: ["id", "name", "email", "phone", "passwordHash", "salt", "createdAt"],
  Sessions: ["token", "userId", "createdAt", "expiresAt"],
  Habits: ["id", "userId", "title", "name", "description", "category", "frequency", "priority", "reminderTime", "target", "startDate", "currentStreak", "longestStreak", "completedToday"],
  Study: ["id", "userId", "semester", "course", "subject", "topic", "day", "startTime", "endTime", "priority", "completed", "progress", "date", "estimatedMinutes"],
  Journal: ["id", "userId", "date", "mood", "text", "createdAt"],
  Profile: ["key", "value", "userId"],
  Otps: ["identifier", "otp", "expiresAt"]
};

// ──────────────────────────────────────────────────────────
// Helper: Output JSON response
// ──────────────────────────────────────────────────────────
function respond(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ──────────────────────────────────────────────────────────
// GET Handler
// ──────────────────────────────────────────────────────────
function doGet(e) {
  return respond({
    success: true,
    message: "Habit Tracker Google Apps Script backend is active.",
    timestamp: new Date().toISOString()
  });
}

// ──────────────────────────────────────────────────────────
// Main POST Handler
// ──────────────────────────────────────────────────────────
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respond({ success: false, message: "Empty request body." });
    }

    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return respond({ success: false, message: "Invalid JSON format: " + parseErr.message });
    }

    const { action, spreadsheetId } = body;
    if (!action) {
      return respond({ success: false, message: "Action parameter is required." });
    }

    const ss = spreadsheetId
      ? SpreadsheetApp.openById(spreadsheetId)
      : SpreadsheetApp.getActiveSpreadsheet();

    if (!ss) {
      return respond({ success: false, message: "Spreadsheet not found or inaccessible." });
    }

    switch (action) {
      // ── Authentication ──
      case "register":
        return handleRegister(ss, body);
      case "login":
        return handleLogin(ss, body);
      case "getMe":
        return handleGetMe(ss, body);
      case "logout":
        return handleLogout(ss, body);
      case "sendOtp":
        return handleSendOtp(ss, body);
      case "loginOtp":
        return handleLoginOtp(ss, body);

      // ── Data Operations ──
      case "read":
        return handleRead(ss, body);
      case "append":
        return handleAppend(ss, body);
      case "update":
        return handleUpdate(ss, body);
      case "delete":
        return handleDelete(ss, body);
      case "clearSheet":
        return handleClear(ss, body);

      default:
        return respond({ success: false, message: "Unknown action: " + action });
    }
  } catch (err) {
    return respond({ success: false, message: err.toString() });
  }
}

// ──────────────────────────────────────────────────────────
// Helper: Ensure Tab & Headers Exist
// ──────────────────────────────────────────────────────────
function getOrCreateSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = DEFAULT_HEADERS[sheetName];
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }
  }
  return sheet;
}

// ──────────────────────────────────────────────────────────
// Security: Hash password with Salt & Pepper
// ──────────────────────────────────────────────────────────
function hashPassword(password, salt) {
  const raw = password + salt + SCRIPT_SECRET;
  const signature = Utilities.computeHmacSha256Signature(raw, SCRIPT_SECRET);
  return Utilities.base64Encode(signature);
}

// ──────────────────────────────────────────────────────────
// AUTH: Register User
// ──────────────────────────────────────────────────────────
function handleRegister(ss, body) {
  const { name, email, phone, password } = body;
  if (!email && !phone) {
    return respond({ success: false, message: "Email or phone number is required." });
  }
  if (!password || password.length < 6) {
    return respond({ success: false, message: "Password must be at least 6 characters." });
  }

  const usersSheet = getOrCreateSheet(ss, SHEETS.USERS);
  const data = usersSheet.getDataRange().getValues();

  // Check for duplicate email or phone (skip header row 0)
  const normEmail = (email || "").trim().toLowerCase();
  const normPhone = (phone || "").trim();

  for (let i = 1; i < data.length; i++) {
    const existingEmail = String(data[i][2] || "").trim().toLowerCase();
    const existingPhone = String(data[i][3] || "").trim();
    if (normEmail && existingEmail === normEmail) {
      return respond({ success: false, message: "User with this email already exists." });
    }
    if (normPhone && existingPhone === normPhone) {
      return respond({ success: false, message: "User with this phone number already exists." });
    }
  }

  const userId = "u_" + Utilities.getUuid().slice(0, 8);
  const salt = Utilities.getUuid().slice(0, 16);
  const passwordHash = hashPassword(password, salt);
  const createdAt = new Date().toISOString();

  // Save to Users sheet (NEVER save plaintext password)
  usersSheet.appendRow([userId, name || "Student", normEmail, normPhone, passwordHash, salt, createdAt]);

  // Create session token
  const token = "tok_" + Utilities.getUuid();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  const sessionsSheet = getOrCreateSheet(ss, SHEETS.SESSIONS);
  sessionsSheet.appendRow([token, userId, createdAt, expiresAt]);

  const userObj = {
    id: userId,
    _id: userId,
    name: name || "Student",
    email: normEmail,
    phone: normPhone,
    createdAt: createdAt
  };

  return respond({
    success: true,
    message: "Registration successful.",
    accessToken: token,
    data: userObj
  });
}

// ──────────────────────────────────────────────────────────
// AUTH: Login User
// ──────────────────────────────────────────────────────────
function handleLogin(ss, body) {
  const { email, phone, password } = body;
  const identifier = ((email || phone || "").trim()).toLowerCase();

  if (!identifier) {
    return respond({ success: false, message: "Email or phone is required." });
  }
  if (!password) {
    return respond({ success: false, message: "Password is required." });
  }

  const usersSheet = getOrCreateSheet(ss, SHEETS.USERS);
  const data = usersSheet.getDataRange().getValues();

  let foundUser = null;
  for (let i = 1; i < data.length; i++) {
    const userEmail = String(data[i][2] || "").trim().toLowerCase();
    const userPhone = String(data[i][3] || "").trim().toLowerCase();
    if (userEmail === identifier || userPhone === identifier) {
      foundUser = {
        rowIndex: i + 1,
        id: data[i][0],
        name: data[i][1],
        email: data[i][2],
        phone: data[i][3],
        passwordHash: data[i][4],
        salt: data[i][5],
        createdAt: data[i][6]
      };
      break;
    }
  }

  if (!foundUser) {
    return respond({ success: false, message: "Invalid email/phone or password." });
  }

  const computedHash = hashPassword(password, foundUser.salt);
  if (computedHash !== foundUser.passwordHash) {
    return respond({ success: false, message: "Invalid email/phone or password." });
  }

  // Create session
  const token = "tok_" + Utilities.getUuid();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const sessionsSheet = getOrCreateSheet(ss, SHEETS.SESSIONS);
  sessionsSheet.appendRow([token, foundUser.id, createdAt, expiresAt]);

  const userObj = {
    id: foundUser.id,
    _id: foundUser.id,
    name: foundUser.name,
    email: foundUser.email,
    phone: foundUser.phone,
    createdAt: foundUser.createdAt
  };

  return respond({
    success: true,
    message: "Login successful.",
    accessToken: token,
    data: userObj
  });
}

// ──────────────────────────────────────────────────────────
// AUTH: Get Current User by Token
// ──────────────────────────────────────────────────────────
function handleGetMe(ss, body) {
  const { token } = body;
  if (!token) {
    return respond({ success: false, message: "No token provided." });
  }

  const sessionsSheet = getOrCreateSheet(ss, SHEETS.SESSIONS);
  const sData = sessionsSheet.getDataRange().getValues();

  let userId = null;
  const now = new Date().toISOString();
  for (let i = 1; i < sData.length; i++) {
    if (String(sData[i][0]) === String(token)) {
      const expiresAt = String(sData[i][3] || "");
      if (expiresAt && expiresAt < now) {
        return respond({ success: false, message: "Session expired." });
      }
      userId = sData[i][1];
      break;
    }
  }

  if (!userId) {
    return respond({ success: false, message: "Invalid session token." });
  }

  const usersSheet = getOrCreateSheet(ss, SHEETS.USERS);
  const uData = usersSheet.getDataRange().getValues();

  for (let i = 1; i < uData.length; i++) {
    if (String(uData[i][0]) === String(userId)) {
      return respond({
        success: true,
        data: {
          id: uData[i][0],
          _id: uData[i][0],
          name: uData[i][1],
          email: uData[i][2],
          phone: uData[i][3],
          createdAt: uData[i][6]
        }
      });
    }
  }

  return respond({ success: false, message: "User not found." });
}

// ──────────────────────────────────────────────────────────
// AUTH: Logout
// ──────────────────────────────────────────────────────────
function handleLogout(ss, body) {
  const { token } = body;
  if (token) {
    const sessionsSheet = getOrCreateSheet(ss, SHEETS.SESSIONS);
    const data = sessionsSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(token)) {
        sessionsSheet.deleteRow(i + 1);
        break;
      }
    }
  }
  return respond({ success: true, message: "Logged out successfully." });
}

// ──────────────────────────────────────────────────────────
// AUTH: Send OTP (Demo / Mock verification)
// ──────────────────────────────────────────────────────────
function handleSendOtp(ss, body) {
  const { phone, email } = body;
  const id = phone || email || "";
  const code = "123456"; // Default demo OTP or random 6-digit
  const otpsSheet = getOrCreateSheet(ss, SHEETS.OTP);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  otpsSheet.appendRow([id, code, expiresAt]);
  return respond({
    success: true,
    message: "OTP sent successfully. Use code: 123456 (Demo Code)"
  });
}

function handleLoginOtp(ss, body) {
  const { phone, email, otp } = body;
  const identifier = phone || email || "";
  if (otp !== "123456") {
    return respond({ success: false, message: "Invalid OTP code. Use 123456 for demo." });
  }
  // Find or create user
  const usersSheet = getOrCreateSheet(ss, SHEETS.USERS);
  const uData = usersSheet.getDataRange().getValues();
  let user = null;
  for (let i = 1; i < uData.length; i++) {
    if (String(uData[i][3]) === identifier || String(uData[i][2]) === identifier) {
      user = { id: uData[i][0], name: uData[i][1], email: uData[i][2], phone: uData[i][3] };
      break;
    }
  }
  if (!user) {
    const userId = "u_" + Utilities.getUuid().slice(0, 8);
    const now = new Date().toISOString();
    usersSheet.appendRow([userId, "Student", identifier.includes("@") ? identifier : "", identifier.includes("@") ? "" : identifier, "", "", now]);
    user = { id: userId, name: "Student", email: identifier.includes("@") ? identifier : "", phone: identifier.includes("@") ? "" : identifier };
  }
  const token = "tok_" + Utilities.getUuid();
  const sessionsSheet = getOrCreateSheet(ss, SHEETS.SESSIONS);
  sessionsSheet.appendRow([token, user.id, new Date().toISOString(), new Date(Date.now() + 30 * 86400000).toISOString()]);
  return respond({ success: true, accessToken: token, data: user });
}

// ──────────────────────────────────────────────────────────
// DATA: Read sheet (as 2D array of headers + values)
// ──────────────────────────────────────────────────────────
function handleRead(ss, body) {
  const { sheet, userId } = body;
  const tab = getOrCreateSheet(ss, sheet);
  const lastRow = tab.getLastRow();
  const lastCol = tab.getLastColumn();

  if (lastRow < 1) {
    return respond({ success: true, data: [] });
  }

  const allRows = tab.getRange(1, 1, lastRow, lastCol).getValues();
  if (allRows.length <= 1) {
    return respond({ success: true, data: allRows });
  }

  const headers = allRows[0];
  const userColIdx = headers.indexOf("userId");

  // If userId filtering requested and column exists, filter rows
  if (userId && userColIdx !== -1) {
    const filtered = [headers];
    for (let i = 1; i < allRows.length; i++) {
      if (!allRows[i][userColIdx] || String(allRows[i][userColIdx]) === String(userId)) {
        filtered.push(allRows[i]);
      }
    }
    return respond({ success: true, data: filtered });
  }

  return respond({ success: true, data: allRows });
}

// ──────────────────────────────────────────────────────────
// DATA: Append row
// ──────────────────────────────────────────────────────────
function handleAppend(ss, body) {
  const { sheet, row } = body;
  if (!Array.isArray(row)) {
    return respond({ success: false, message: "row must be an array." });
  }
  const tab = getOrCreateSheet(ss, sheet);
  tab.appendRow(row);
  return respond({ success: true, message: "Row appended." });
}

// ──────────────────────────────────────────────────────────
// DATA: Update row by ID (Column A = index 0)
// ──────────────────────────────────────────────────────────
function handleUpdate(ss, body) {
  const { sheet, id, row } = body;
  if (!id || !Array.isArray(row)) {
    return respond({ success: false, message: "id and row are required for update." });
  }
  const tab = getOrCreateSheet(ss, sheet);
  const lastRow = tab.getLastRow();
  if (lastRow < 2) {
    return respond({ success: false, message: "No data rows found." });
  }

  const idCol = tab.getRange(2, 1, lastRow - 1, 1).getValues();
  let targetRow = -1;
  for (let i = 0; i < idCol.length; i++) {
    if (String(idCol[i][0]) === String(id)) {
      targetRow = i + 2;
      break;
    }
  }

  if (targetRow === -1) {
    return respond({ success: false, message: "Row with id '" + id + "' not found." });
  }

  tab.getRange(targetRow, 1, 1, row.length).setValues([row]);
  return respond({ success: true, message: "Row updated." });
}

// ──────────────────────────────────────────────────────────
// DATA: Delete row by ID
// ──────────────────────────────────────────────────────────
function handleDelete(ss, body) {
  const { sheet, id } = body;
  if (!id) {
    return respond({ success: false, message: "id is required for delete." });
  }
  const tab = getOrCreateSheet(ss, sheet);
  const lastRow = tab.getLastRow();
  if (lastRow < 2) {
    return respond({ success: false, message: "No data rows found." });
  }

  const idCol = tab.getRange(2, 1, lastRow - 1, 1).getValues();
  let targetRow = -1;
  for (let i = 0; i < idCol.length; i++) {
    if (String(idCol[i][0]) === String(id)) {
      targetRow = i + 2;
      break;
    }
  }

  if (targetRow === -1) {
    return respond({ success: false, message: "Row with id '" + id + "' not found." });
  }

  tab.deleteRow(targetRow);
  return respond({ success: true, message: "Row deleted." });
}

// ──────────────────────────────────────────────────────────
// DATA: Clear all data rows but preserve header
// ──────────────────────────────────────────────────────────
function handleClear(ss, body) {
  const { sheet } = body;
  const tab = getOrCreateSheet(ss, sheet);
  const lastRow = tab.getLastRow();
  if (lastRow > 1) {
    tab.deleteRows(2, lastRow - 1);
  }
  return respond({ success: true, message: "Sheet data cleared (headers preserved)." });
}
