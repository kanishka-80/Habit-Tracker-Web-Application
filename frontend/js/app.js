/* ==========================================================
   app.js — global init, shared helpers, demo data store, sidebar
   Replace HabitStore reads/writes with fetch('/api/...') later.
   ========================================================== */

const STORAGE_KEYS = {
  habits: "ht_habits",
  studyPlan: "ht_study_plan",
  journal: "ht_journal",
  profile: "ht_profile",
  settings: "ht_settings",
  rewards: "ht_rewards",
  theme: "ht_theme",
  session: "ht_session",
};

/* ----------------------- storage helpers ----------------------- */
const Store = {
  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn("Unable to read", key, error);
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Unable to save", key, error);
    }
  },
};

/* ----------------------- demo seed data ----------------------- */
const DEMO_HABITS = [
  {
    id: "h1",
    name: "Morning Revision",
    description: "Revise yesterday's topics for 20 minutes.",
    category: "Study",
    frequency: "Daily",
    priority: "High",
    reminderTime: "07:00",
    startDate: "2026-06-01",
    currentStreak: 12,
    longestStreak: 21,
    completedToday: true,
  },
  {
    id: "h2",
    name: "Exercise",
    description: "30 minutes of workout or a brisk walk.",
    category: "Fitness",
    frequency: "Daily",
    priority: "Medium",
    reminderTime: "06:15",
    startDate: "2026-05-20",
    currentStreak: 8,
    longestStreak: 16,
    completedToday: true,
  },
  {
    id: "h3",
    name: "Read 20 Minutes",
    description: "Read a technical or non-fiction book.",
    category: "Reading",
    frequency: "Daily",
    priority: "Medium",
    reminderTime: "20:00",
    startDate: "2026-05-12",
    currentStreak: 5,
    longestStreak: 14,
    completedToday: false,
  },
  {
    id: "h4",
    name: "Drink Water",
    description: "Finish 3 litres of water through the day.",
    category: "Health",
    frequency: "Daily",
    priority: "Low",
    reminderTime: "11:00",
    startDate: "2026-04-28",
    currentStreak: 19,
    longestStreak: 24,
    completedToday: true,
  },
  {
    id: "h5",
    name: "Meditation",
    description: "10 minutes of focused breathing.",
    category: "Wellness",
    frequency: "Daily",
    priority: "Low",
    reminderTime: "21:30",
    startDate: "2026-06-04",
    currentStreak: 3,
    longestStreak: 9,
    completedToday: false,
  },
  {
    id: "h6",
    name: "Sleep Before 11 PM",
    description: "Close the laptop and wind down before 11 PM.",
    category: "Health",
    frequency: "Daily",
    priority: "High",
    reminderTime: "22:30",
    startDate: "2026-05-02",
    currentStreak: 6,
    longestStreak: 11,
    completedToday: true,
  },
];

function isoDate(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + (offsetDays || 0));
  return date.toISOString().slice(0, 10);
}

const DEMO_STUDY_PLAN = [
  {
    id: "s1",
    subject: "Database Management Systems",
    topic: "Normalization & Functional Dependencies",
    date: isoDate(0),
    estimatedMinutes: 45,
    priority: "High",
    completed: true,
    progress: 100,
  },
  {
    id: "s2",
    subject: "Operating Systems",
    topic: "Deadlock Detection & Avoidance",
    date: isoDate(0),
    estimatedMinutes: 40,
    priority: "Medium",
    completed: true,
    progress: 100,
  },
  {
    id: "s3",
    subject: "Computer Networks",
    topic: "Routing Algorithms",
    date: isoDate(0),
    estimatedMinutes: 35,
    priority: "Medium",
    completed: true,
    progress: 100,
  },
  {
    id: "s4",
    subject: "Data Structures",
    topic: "Graph Traversal: BFS and DFS",
    date: isoDate(0),
    estimatedMinutes: 50,
    priority: "High",
    completed: false,
    progress: 30,
  },
  {
    id: "s5",
    subject: "Java",
    topic: "Collections Framework",
    date: isoDate(0),
    estimatedMinutes: 30,
    priority: "Low",
    completed: false,
    progress: 0,
  },
  {
    id: "s6",
    subject: "Database Management Systems",
    topic: "Transactions & Concurrency Control",
    date: isoDate(1),
    estimatedMinutes: 45,
    priority: "High",
    completed: false,
    progress: 0,
  },
  {
    id: "s7",
    subject: "Operating Systems",
    topic: "Memory Management & Paging",
    date: isoDate(1),
    estimatedMinutes: 40,
    priority: "Medium",
    completed: false,
    progress: 0,
  },
  {
    id: "s8",
    subject: "Computer Networks",
    topic: "TCP Congestion Control",
    date: isoDate(2),
    estimatedMinutes: 35,
    priority: "Medium",
    completed: false,
    progress: 0,
  },
  {
    id: "s9",
    subject: "Data Structures",
    topic: "Dynamic Programming Patterns",
    date: isoDate(3),
    estimatedMinutes: 55,
    priority: "High",
    completed: false,
    progress: 0,
  },
  {
    id: "s10",
    subject: "Java",
    topic: "Multithreading Basics",
    date: isoDate(4),
    estimatedMinutes: 40,
    priority: "Low",
    completed: false,
    progress: 0,
  },
];

const DEMO_PROFILE = {
  name: "Ananya Sharma",
  email: "ananya.sharma@college.edu",
  semester: "7th Semester",
  branch: "Computer Science & Engineering",
  joined: "12 January 2026",
  dailyGoal: 4,
};

const DEMO_REMINDERS = [
  { time: "07:00 PM", title: "Revise DBMS normalization", type: "Study", status: "Pending" },
  { time: "08:00 PM", title: "Read 20 minutes", type: "Habit", status: "Pending" },
  { time: "09:30 PM", title: "Write today's reflection", type: "General", status: "Pending" },
  { time: "10:30 PM", title: "Sleep preparation", type: "Habit", status: "Pending" },
];

/* ----------------------- data access layer -----------------------
   Each function below is the single place to swap in a REST call. */
const HabitStore = {
  loadHabits() {
    return Store.read(STORAGE_KEYS.habits, []);
  },
  seedHabits() {
    const habits = JSON.parse(JSON.stringify(DEMO_HABITS));
    Store.write(STORAGE_KEYS.habits, habits);
    return habits;
  },
  saveHabits(habits) {
    Store.write(STORAGE_KEYS.habits, habits);
    return habits;
  },
  saveHabit(habit) {
    const habits = this.loadHabits();
    const index = habits.findIndex((item) => item.id === habit.id);
    if (index >= 0) {
      habits[index] = { ...habits[index], ...habit };
    } else {
      habits.push(habit);
    }
    return this.saveHabits(habits);
  },
  deleteHabit(id) {
    return this.saveHabits(this.loadHabits().filter((item) => item.id !== id));
  },
  loadStudyPlan() {
    return Store.read(STORAGE_KEYS.studyPlan, []);
  },
  seedStudyPlan() {
    const plan = JSON.parse(JSON.stringify(DEMO_STUDY_PLAN));
    Store.write(STORAGE_KEYS.studyPlan, plan);
    return plan;
  },
  saveStudyPlan(plan) {
    Store.write(STORAGE_KEYS.studyPlan, plan);
    return plan;
  },
  completeStudyTask(id, completed) {
    const plan = this.loadStudyPlan().map((task) =>
      task.id === id
        ? { ...task, completed, progress: completed ? 100 : task.progress }
        : task
    );
    return this.saveStudyPlan(plan);
  },
  loadTodayTasks() {
    const today = isoDate(0);
    return this.loadStudyPlan().filter((task) => task.date === today);
  },
  loadReminders() {
    return [];
  },
  loadProfile() {
    return Store.read(STORAGE_KEYS.profile, { name: "Student", email: "", semester: "Not specified", branch: "Not specified" });
  },
  saveProfile(profile) {
    Store.write(STORAGE_KEYS.profile, profile);
    return profile;
  },
  loadJournal() {
    return Store.read(STORAGE_KEYS.journal, []);
  },
  seedJournal() {
    const entries = [
      {
        id: "j1",
        date: isoDate(-1),
        mood: "Focused",
        text: "Finished DBMS normalization practice and revised OS scheduling. Study block in the morning worked much better than late night.",
      },
      {
        id: "j2",
        date: isoDate(-2),
        mood: "Tired",
        text: "Lab submission took most of the day, only completed two study tasks. Need to protect the evening study slot.",
      },
      {
        id: "j3",
        date: isoDate(-4),
        mood: "Motivated",
        text: "Completed every habit today including meditation. Graph algorithms finally clicked after solving five problems.",
      },
    ];
    Store.write(STORAGE_KEYS.journal, entries);
    return entries;
  },
  saveJournal(entries) {
    Store.write(STORAGE_KEYS.journal, entries);
    return entries;
  },
  loadSettings() {
    return Store.read(STORAGE_KEYS.settings, {
      browserNotifications: true,
      habitReminders: true,
      studyReminders: true,
      emailReminders: false,
      defaultReminderTime: "19:00",
      reminderSound: "soft",
    });
  },
  saveSettings(settings) {
    Store.write(STORAGE_KEYS.settings, settings);
    return settings;
  },
  loadDashboardStats() {
    const habits = this.loadHabits();
    const todayTasks = this.loadTodayTasks();
    const completedHabits = habits.filter((habit) => habit.completedToday);
    const completedTasks = todayTasks.filter((task) => task.completed);
    const studyMinutes = completedTasks.reduce(
      (total, task) => total + task.estimatedMinutes,
      0
    );
    return {
      totalHabits: habits.length,
      completedToday: completedHabits.length + completedTasks.length,
      pendingStudyTasks: todayTasks.length - completedTasks.length,
      currentStreak: habits.reduce(
        (max, habit) => Math.max(max, habit.currentStreak),
        0
      ),
      longestStreak: habits.reduce(
        (max, habit) => Math.max(max, habit.longestStreak),
        0
      ),
      studyMinutes,
    };
  },
};

/* ----------------------- shared utilities ----------------------- */
function percentage(part, total) {
  if (!total || total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function formatMinutes(minutes) {
  if (!minutes) return "0m";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function priorityClass(priority) {
  const key = String(priority || "").toLowerCase();
  if (key === "high") return "pill-high";
  if (key === "medium") return "pill-medium";
  return "pill-low";
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(message, variant) {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const toast = document.createElement("div");
  toast.className = `app-toast ${variant || ""}`.trim();
  toast.setAttribute("role", "status");
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

function setButtonLoading(button, loading, loadingText) {
  if (!button) return;
  if (loading) {
    button.dataset.originalText = button.innerHTML;
    button.classList.add("is-loading");
    button.disabled = true;
    button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>${
      loadingText || "Working..."
    }`;
  } else {
    button.classList.remove("is-loading");
    button.disabled = false;
    if (button.dataset.originalText) button.innerHTML = button.dataset.originalText;
  }
}

/* ----------------------- sidebar ----------------------- */
const SIDEBAR_ITEMS = [
  { href: "dashboard.html", label: "Dashboard", icon: "fa-gauge-high" },
  { href: "study-planner.html", label: "Study Planner", icon: "fa-book-open" },
  { href: "habits.html", label: "My Habits", icon: "fa-list-check" },
  { href: "calendar.html", label: "Calendar", icon: "fa-calendar-days" },
  { href: "analytics.html", label: "Analytics", icon: "fa-chart-line" },
  { href: "journal.html", label: "Journal", icon: "fa-feather" },
  { href: "rewards.html", label: "Rewards", icon: "fa-award" },
  { href: "profile.html", label: "Profile", icon: "fa-user" },
  { href: "settings.html", label: "Settings", icon: "fa-gear" },
];

function initials(name) {
  return String(name || "S")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function renderSidebar() {
  const host = document.getElementById("appSidebar");
  if (!host) return;
  const current = window.location.pathname.split("/").pop() || "dashboard.html";
  const user = window.currentUser || HabitStore.loadProfile();
  const userName = user.name || "Student";
  const userSub = user.email || user.semester || "Habit Tracker";

  host.innerHTML = `
    <a class="sidebar-brand" href="dashboard.html">
      <img src="images/logo.png" alt="Habit Logo" class="sidebar-logo-img" style="width: 40px; height: 40px; object-fit: contain;" />
      <span class="brand-text">Habit<span>Study &amp; Habit OS</span></span>
    </a>
    <p class="sidebar-label">Menu</p>
    <ul class="sidebar-nav">
      ${SIDEBAR_ITEMS.map(
        (item) => `
        <li>
          <a class="sidebar-link ${item.href === current ? "active" : ""}" href="${item.href}"
             ${item.href === current ? 'aria-current="page"' : ""}>
            <i class="fa-solid ${item.icon}" aria-hidden="true"></i><span>${item.label}</span>
          </a>
        </li>`
      ).join("")}
    </ul>
    <div class="sidebar-bottom">
      <div class="sidebar-user">
        <span class="user-avatar" aria-hidden="true">${initials(userName)}</span>
        <span class="user-meta">
          <strong>${escapeHtml(userName)}</strong>
          <small>${escapeHtml(userSub)}</small>
        </span>
      </div>
      <button class="sidebar-action" type="button" id="themeToggle" aria-label="Toggle colour theme">
        <i class="fa-solid fa-moon" aria-hidden="true"></i><span id="themeToggleLabel">Dark Mode</span>
      </button>
      <button class="sidebar-action" type="button" id="logoutButton">
        <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i><span>Logout</span>
      </button>
    </div>
  `;

  if (typeof applyTheme === "function" && typeof getStoredTheme === "function") {
    applyTheme(getStoredTheme());
  }
}

function initSidebarBehaviour() {
  const sidebar = document.getElementById("appSidebar");
  const trigger = document.getElementById("sidebarTrigger");
  const backdrop = document.getElementById("sidebarBackdrop");
  if (!sidebar) return;

  const close = () => {
    sidebar.classList.remove("open");
    if (backdrop) backdrop.classList.remove("show");
  };

  if (trigger) {
    trigger.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      if (backdrop) backdrop.classList.toggle("show", sidebar.classList.contains("open"));
    });
  }
  if (backdrop) backdrop.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  sidebar.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", close);
  });
}

// Global click event delegation for logout buttons
document.addEventListener("click", async (event) => {
  const logoutBtn = event.target.closest("#logoutButton, #settingsLogout");
  if (logoutBtn) {
    event.preventDefault();
    if (window.AuthAPI) {
      try {
        await AuthAPI.logout();
      } catch (e) {
        console.warn("Logout error:", e);
      }
    }
    localStorage.removeItem(STORAGE_KEYS.session);
    localStorage.removeItem("ht_token");
    showToast("Signed out. Redirecting...", "success");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 500);
  }
});

function initTooltips() {
  if (!window.bootstrap) return;
  document
    .querySelectorAll('[data-bs-toggle="tooltip"]')
    .forEach((element) => new window.bootstrap.Tooltip(element));
}

async function checkAuthSession() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const protectedPages = [
    "dashboard.html",
    "habits.html",
    "study-planner.html",
    "calendar.html",
    "analytics.html",
    "journal.html",
    "rewards.html",
    "profile.html",
    "settings.html"
  ];
  const authPages = ["login.html", "register.html"];

  if (window.AuthAPI) {
    const res = await AuthAPI.getMe();
    if (res && res.success && res.data) {
      window.currentUser = res.data;
      renderSidebar();
      if (authPages.includes(currentPath)) {
        window.location.href = "dashboard.html";
        return;
      }
    } else if (protectedPages.includes(currentPath)) {
      window.location.href = "index.html";
      return;
    }
  }
  document.dispatchEvent(new CustomEvent("app:ready"));
}

document.addEventListener("DOMContentLoaded", () => {
  renderSidebar();
  initSidebarBehaviour();
  initThemeToggle();
  initTooltips();
  checkAuthSession();
});
