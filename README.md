# 🎯 Habit & Study Tracker Web Application

> A modern, student-centric productivity platform combining habit building, academic schedule planning, productivity analytics, and reflective journaling.

![Version](https://img.shields.io/badge/version-2.0.0-gold.svg)
![Frontend](https://img.shields.io/badge/frontend-HTML5%20%7C%20CSS3%20%7C%20Bootstrap5%20%7C%20JS-blue)
![Auth](https://img.shields.io/badge/auth-Supabase-green)
![Storage](https://img.shields.io/badge/database-Google%20Sheets%20%7C%20MongoDB-orange)
![License](https://img.shields.io/badge/license-MIT-purple)

---

## 📖 Overview

The **Habit & Study Tracker** is an all-in-one productivity operating system tailored for students and learners. It streamlines daily routines, semester syllabus schedules, habit streaks, and mental wellness through a sleek, distraction-free dark interface.

---

## ✨ Key Features

### 🔐 1. Authentication & Session Management
* **Supabase Auth Integration**: Secure sign-up, sign-in, and auto-persistent sessions.
* **Direct REST Fallback**: Seamless login even with privacy shields or ad-blockers.
* **OTP Support**: Phone & Email authentication with demo test credentials (`123456`).

### 📊 2. Dynamic Dashboard
* **Today's Overview**: Live completion progress bar, active streak counter, and study minutes.
* **Visual Charts**: Interactive weekly & monthly productivity graphs powered by **Chart.js**.
* **Live Clock & Daily Motivation**: Real-time clock and rotating inspiring quotes.

### ⚡ 3. Habit Management
* **Habit CRUD**: Create, view, filter, edit, and delete personal habits.
* **Streak Tracking**: Automatic calculation of current streaks and personal bests.
* **Categorization & Priority**: Organize habits by Study, Health, Fitness, Wellness, Reading, etc.
* **One-Click Check-in**: Instant toggle for daily completion.

### 📚 4. Study Planner
* **Timetable Scheduling**: Plan subjects by semester, day of week, and time slots.
* **Estimated Study Time**: Track hours spent on difficult topics vs easy revisions.
* **Task Completion & Progress**: Real-time percentage tracking for academic milestones.

### 📅 5. Interactive Calendar
* **FullCalendar Integration**: Visual monthly and weekly calendar of scheduled study sessions and completed habits.

### 📝 6. Reflection Journal
* **Daily Journaling**: Log thoughts, track moods (Focused, Tired, Motivated, etc.), and maintain self-awareness.

### 🏆 7. Rewards & Gamification
* **Points & Levels**: Earn XP for every habit check-in and completed study block.
* **Badges & Milestones**: Unlock achievements like *First Step*, *7-Day Streak*, *Study Champion*, and *Consistency Star*.

### ☁️ 8. Cloud Storage via Google Sheets
* **Google Sheets Database**: Direct connection via Google Apps Script Web App.
* **Multi-Tab Organization**: Automatically manages `Habits`, `Study`, `Journal`, `Profile`, and `Sheet1` tabs.
* **Dual Sync Capable**: Can also mirror records with MongoDB when backend server is active.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+), Bootstrap 5 |
| **Data Visualization** | Chart.js 4.4, FullCalendar 6.1 |
| **Authentication** | Supabase Auth (Client SDK v2 & REST) |
| **Primary Cloud Database** | Google Sheets API via Google Apps Script |
| **Backend (Optional)** | Node.js, Express.js, Mongoose, MongoDB Atlas |
| **Dev Tooling** | Vite Dev Server |

---

## 📂 Project Structure

```text
Habit-Tracker-Web-Application/
├── frontend/
│   ├── assets/              # Icons, badges, and project illustrations
│   ├── css/                 # Modern styling & themes
│   ├── js/
│   │   ├── api/
│   │   │   ├── supabaseClient.js   # Supabase Auth client & REST fallback
│   │   │   ├── googleSheetsApi.js  # Direct Google Sheets CRUD bridge
│   │   │   ├── api.js              # Central HTTP client
│   │   │   └── ...                 # Feature API adapters
│   │   ├── app.js                  # Global init, sidebar, auth session guard
│   │   ├── auth.js                 # Login/Register validation & handlers
│   │   ├── dashboard.js            # Dashboard stats & Chart.js logic
│   │   ├── habit.js                # Habit CRUD & check-in UI
│   │   ├── study.js                # Study planner & schedule manager
│   │   ├── calendar.js             # FullCalendar view
│   │   ├── journal.js              # Journaling & mood tracking
│   │   └── reward.js               # Points, badges & achievements
│   ├── apps_script_proxy.gs # Google Apps Script backend code
│   ├── dashboard.html       # Main user dashboard
│   ├── habits.html          # Habit management page
│   ├── study-planner.html   # Study planner page
│   ├── calendar.html        # Calendar page
│   ├── analytics.html       # Analytics & graphs page
│   ├── journal.html         # Journaling page
│   ├── rewards.html         # Achievements page
│   ├── profile.html         # User profile page
│   ├── settings.html        # Notification & theme preferences
│   ├── login.html           # Authentication login
│   ├── register.html        # Account registration
│   ├── index.html           # Landing page
│   └── package.json         # Frontend dependencies & Vite config
├── backend/                 # Node.js Express & MongoDB backend
│   ├── controllers/         # Request handlers
│   ├── models/              # Mongoose schemas
│   ├── routes/              # Express API routes
│   ├── services/            # Google Sheets sync & reward services
│   └── server.js            # Server entry point
├── .gitignore               # Git ignore rules
└── README.md                # Project documentation
```

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/kanishka-80/Habit-Tracker-Web-Application.git
cd Habit-Tracker-Web-Application
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Backend Setup (Optional)
```bash
cd ../backend
npm install
npm run dev
```

---

## ⚙️ Configuration (.env)

### Frontend (`frontend/.env`)
```env
VITE_PORT=3000

# Supabase Auth
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Google Sheets Integration
VITE_SHEETS_SPREADSHEET_ID=<your-spreadsheet-id>
VITE_SHEETS_SCRIPT_URL=https://script.google.com/macros/s/<deployment-id>/exec
```

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
