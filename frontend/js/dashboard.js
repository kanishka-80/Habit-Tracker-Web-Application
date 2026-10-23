/* ==========================================================
   dashboard.js — greeting, today's plan, habits, productivity,
   stats, mini calendar, reminders, previews and lower charts
   ========================================================== */

const MOTIVATIONS = [
  "Small consistent blocks beat long irregular sessions.",
  "Finish today's plan first, then improve tomorrow's.",
  "Streaks are built one ordinary day at a time.",
  "Focus on the next task, not the whole syllabus.",
];

let weeklyChart = null;
let monthlyChart = null;

function greetingText() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

let cachedDashboardData = null;
let cachedHabits = [];
let cachedStudySessions = [];

function renderWelcome() {
  const user = window.currentUser || HabitStore.loadProfile();
  const firstName = (user.name || "Student").split(" ")[0];
  document.getElementById("greetingText").textContent = `${greetingText()}, ${firstName}`;
  document.getElementById("todayDate").textContent = formatDate();
  document.getElementById("motivationText").textContent =
    MOTIVATIONS[new Date().getDate() % MOTIVATIONS.length];

  const clock = document.getElementById("liveClock");
  if (clock) {
    const tick = () => {
      clock.textContent = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    };
    tick();
    setInterval(tick, 1000);
  }
}

function studyTaskMarkup(task) {
  const taskId = task._id || task.id;
  return `
    <li class="item-row ${task.completed ? "completed" : ""}" data-task-id="${taskId}">
      <input class="form-check-input mt-1 study-check" type="checkbox" ${task.completed ? "checked" : ""}
             id="task-${taskId}" aria-label="Mark ${escapeHtml(task.subject)} task complete">
      <div class="item-body">
        <p class="item-title">${escapeHtml(task.subject)}</p>
        <p class="item-sub">${escapeHtml(task.topic)}</p>
        <div class="item-tags">
          <span class="pill"><i class="fa-regular fa-clock" aria-hidden="true"></i>${task.durationMinutes || task.estimatedMinutes || 30} min</span>
          <span class="pill ${priorityClass(task.priority)}">${task.priority || "Medium"} Priority</span>
          <span class="pill ${task.completed ? "pill-done" : ""}">${task.completed ? "Completed" : "Pending"}</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="btn btn-ghost task-details" type="button" data-task-id="${taskId}" aria-label="View task details">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        </button>
      </div>
    </li>`;
}

function habitMarkup(habit) {
  const habitId = habit._id || habit.id;
  const today = isoDate(0);
  const isDoneToday = habit.completedToday !== undefined
    ? habit.completedToday
    : habit.completionLogs && habit.completionLogs.some(log => log.date === today && log.completed);

  return `
    <li class="item-row ${isDoneToday ? "completed" : ""}" data-habit-id="${habitId}">
      <input class="form-check-input mt-1 habit-check" type="checkbox" ${isDoneToday ? "checked" : ""}
             id="habit-${habitId}" aria-label="Mark ${escapeHtml(habit.title || habit.name)} complete">
      <div class="item-body">
        <p class="item-title">${escapeHtml(habit.title || habit.name)}</p>
        <p class="item-sub">${escapeHtml(habit.description || "")}</p>
        <div class="item-tags">
          <span class="pill">${escapeHtml(habit.category || "other")}</span>
          <span class="pill"><i class="fa-regular fa-bell" aria-hidden="true"></i>${habit.reminderTime || "None"}</span>
          <span class="pill pill-gold"><i class="fa-solid fa-fire" aria-hidden="true"></i>${habit.currentStreak || 0} day streak</span>
          <span class="pill ${isDoneToday ? "pill-done" : ""}">${isDoneToday ? "Done" : "Pending"}</span>
        </div>
      </div>
      <div class="item-actions">
        <a class="btn btn-ghost" href="habits.html" aria-label="Manage habit"><i class="fa-solid fa-sliders" aria-hidden="true"></i></a>
      </div>
    </li>`;
}

function renderStudySection() {
  const list = document.getElementById("todayStudyList");
  const today = isoDate(0);
  const tasks = cachedStudySessions.filter(s => {
    const sDate = s.date ? new Date(s.date).toISOString().slice(0, 10) : today;
    return sDate === today;
  });

  if (!tasks.length) {
    list.innerHTML = `<li class="empty-state"><i class="fa-solid fa-book" aria-hidden="true"></i>
      No study plan for today. <a href="study-planner.html">Create a study session</a>.</li>`;
  } else {
    list.innerHTML = tasks.map(studyTaskMarkup).join("");
  }

  const done = tasks.filter((task) => task.completed).length;
  const pct = percentage(done, tasks.length);
  document.getElementById("studyCount").textContent = `${done} of ${tasks.length} completed`;
  document.getElementById("studyPercentLabel").textContent = `${pct}% complete`;
  document.getElementById("studyProgressBar").style.width = `${pct}%`;
  document.getElementById("studyProgressBar").setAttribute("aria-valuenow", pct);
  return pct;
}

function renderHabitSection() {
  const list = document.getElementById("todayHabitList");
  const habits = cachedHabits;
  const today = isoDate(0);

  if (!habits.length) {
    list.innerHTML = `<li class="empty-state"><i class="fa-solid fa-list-check" aria-hidden="true"></i>
      No habits yet. <a href="habits.html">Create your first habit</a>.</li>`;
  } else {
    list.innerHTML = habits.map(habitMarkup).join("");
  }

  const done = habits.filter((h) => {
    return h.completedToday || (h.completionLogs && h.completionLogs.some(log => log.date === today && log.completed));
  }).length;

  const pct = percentage(done, habits.length);
  document.getElementById("habitCount").textContent = `${done} / ${habits.length} habits completed`;
  document.getElementById("habitPercentLabel").textContent = `${pct}% complete`;
  document.getElementById("habitProgressBar").style.width = `${pct}%`;
  document.getElementById("habitProgressBar").setAttribute("aria-valuenow", pct);
  return pct;
}

function productivityMessage(value) {
  if (value <= 25) return "Needs Attention";
  if (value <= 50) return "Keep Going";
  if (value <= 75) return "Good Progress";
  if (value <= 90) return "Great Work";
  return "Excellent Day";
}

function renderProductivity(studyPct, habitPct) {
  const today = isoDate(0);
  const tasks = cachedStudySessions.filter(s => (s.date ? new Date(s.date).toISOString().slice(0, 10) : today) === today);
  const habits = cachedHabits;
  const parts = [];
  if (tasks.length) parts.push(studyPct);
  if (habits.length) parts.push(habitPct);
  const overall = parts.length
    ? Math.round(parts.reduce((sum, value) => sum + value, 0) / parts.length)
    : 0;

  const ring = document.getElementById("productivityRing");
  if (ring) ring.style.setProperty("--value", overall);
  document.getElementById("productivityValue").textContent = `${overall}%`;
  document.getElementById("productivityMessage").textContent = productivityMessage(overall);

  document.getElementById("studyShareValue").textContent = `${studyPct}%`;
  document.getElementById("studyShareBar").style.width = `${studyPct}%`;
  document.getElementById("habitShareValue").textContent = `${habitPct}%`;
  document.getElementById("habitShareBar").style.width = `${habitPct}%`;
}

function renderStats() {
  if (cachedDashboardData && cachedDashboardData.stats) {
    const s = cachedDashboardData.stats;
    const today = isoDate(0);
    const studyTasksToday = cachedStudySessions.filter(st => (st.date ? new Date(st.date).toISOString().slice(0, 10) : today) === today);
    const completedStudyToday = studyTasksToday.filter(st => st.completed);
    const studyMinutes = completedStudyToday.reduce((acc, st) => acc + (st.durationMinutes || 0), 0);

    const map = {
      statTotalHabits: s.totalHabits || cachedHabits.length,
      statCompletedToday: cachedDashboardData.todaysProgress ? cachedDashboardData.todaysProgress.completed : 0,
      statPendingTasks: studyTasksToday.length - completedStudyToday.length,
      statCurrentStreak: `${s.totalStreakDays || 0}d`,
      statLongestStreak: `${s.longestStreak || 0}d`,
      statStudyTime: formatMinutes(studyMinutes),
    };
    Object.entries(map).forEach(([id, value]) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    });
  } else {
    const stats = HabitStore.loadDashboardStats();
    const map = {
      statTotalHabits: stats.totalHabits,
      statCompletedToday: stats.completedToday,
      statPendingTasks: stats.pendingStudyTasks,
      statCurrentStreak: `${stats.currentStreak}d`,
      statLongestStreak: `${stats.longestStreak}d`,
      statStudyTime: formatMinutes(stats.studyMinutes),
    };
    Object.entries(map).forEach(([id, value]) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    });
  }
}

function renderMiniCalendar() {
  const grid = document.getElementById("miniCalendar");
  if (!grid) return;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  let html = ["S", "M", "T", "W", "T", "F", "S"]
    .map((day) => `<span class="mini-day head">${day}</span>`)
    .join("");
  for (let i = 0; i < firstDay; i += 1) html += '<span class="mini-day" aria-hidden="true"></span>';
  for (let day = 1; day <= days; day += 1) {
    let cls = "mini-day";
    if (day === today) cls += " today";
    else if (day < today && day % 6 === 0) cls += " missed";
    else if (day < today) cls += " done";
    html += `<span class="${cls}">${day}</span>`;
  }
  grid.innerHTML = html;

  document.getElementById("calendarSummary").textContent = `${formatDate()} · ${
    cachedStudySessions.length
  } study tasks · ${cachedHabits.length} habits scheduled`;
}

function renderReminders() {
  const holder = document.getElementById("reminderList");
  if (!holder) return;
  const reminders = HabitStore.loadReminders();
  if (!reminders.length) {
    holder.innerHTML = `<div class="empty-state"><i class="fa-regular fa-bell" aria-hidden="true"></i>No reminders for today.</div>`;
    return;
  }
  holder.innerHTML = reminders
    .map(
      (reminder) => `
      <div class="reminder-row">
        <span class="reminder-time">${reminder.time}</span>
        <span class="reminder-title">${escapeHtml(reminder.title)}</span>
        <span class="pill">${reminder.type}</span>
      </div>`
    )
    .join("");
}

async function renderJournalPreview() {
  const holder = document.getElementById("journalPreview");
  if (!holder) return;

  let entries = [];
  if (window.JournalAPI) {
    const res = await JournalAPI.getJournalEntries({ limit: 2 });
    if (res && res.success && res.data) {
      entries = res.data.map(e => ({ date: e.date, mood: e.mood, text: e.content || e.title }));
    }
  } else {
    entries = HabitStore.loadJournal().slice(0, 2);
  }

  if (!entries.length) {
    holder.innerHTML = `<div class="empty-state"><i class="fa-solid fa-feather" aria-hidden="true"></i>
      No journal entries yet. <a href="journal.html">Write today's reflection</a>.</div>`;
    return;
  }
  holder.innerHTML = entries
    .map(
      (entry) => `
      <div class="preview-entry">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <strong class="font-heading" style="font-size:.88rem">${formatDate(entry.date)}</strong>
          <span class="pill pill-gold">${escapeHtml(entry.mood || "Focused")}</span>
        </div>
        <p class="mb-0 text-muted-soft" style="font-size:.85rem">${escapeHtml((entry.text || "").slice(0, 120))}...</p>
      </div>`
    )
    .join("");
}

async function renderRewardPreview() {
  const holder = document.getElementById("rewardPreview");
  if (!holder) return;

  let rewards = [];
  if (window.RewardAPI) {
    const res = await RewardAPI.getRewards();
    if (res && res.success && res.data) {
      rewards = res.data;
    }
  }

  const badges = rewards.length
    ? rewards.slice(0, 3).map(r => ({ name: r.title, icon: r.icon || "fa-award", unlocked: true }))
    : [
        { name: "First Step", icon: "fa-shoe-prints", unlocked: false },
        { name: "7 Day Streak", icon: "fa-fire", unlocked: false },
        { name: "Study Champion", icon: "fa-trophy", unlocked: false },
      ];

  holder.innerHTML = badges
    .map(
      (badge) => `
      <div class="col-4">
        <div class="badge-tile ${badge.unlocked ? "" : "locked"}">
          <i class="fa-solid ${badge.icon}" aria-hidden="true"></i>
          <strong>${escapeHtml(badge.name)}</strong>
          <small>${badge.unlocked ? "Unlocked" : "Locked"}</small>
        </div>
      </div>`
    )
    .join("");
}

function buildDashboardCharts() {
  const colors = themeChartColors();
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: colors.text, font: { family: "Poppins" } } } },
    scales: {
      x: { ticks: { color: colors.muted }, grid: { color: colors.grid } },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { color: colors.muted },
        grid: { color: colors.grid },
      },
    },
  };

  const weeklyCanvas = document.getElementById("weeklyChart");
  if (weeklyCanvas) {
    if (weeklyChart) weeklyChart.destroy();
    
    let labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    let studyData = [0, 0, 0, 0, 0, 0, 0];
    let habitData = [0, 0, 0, 0, 0, 0, 0];

    if (cachedDashboardData && cachedDashboardData.weeklyChart && Array.isArray(cachedDashboardData.weeklyChart)) {
      const wc = cachedDashboardData.weeklyChart;
      labels = wc.map(item => item.day || item.date || "");
      habitData = wc.map(item => item.completionPercentage || 0);
    }

    weeklyChart = new Chart(weeklyCanvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Study completion %",
            data: studyData,
            backgroundColor: colors.gold,
            borderRadius: 6,
          },
          {
            label: "Habit completion %",
            data: habitData,
            backgroundColor: "#6b7280",
            borderRadius: 6,
          },
        ],
      },
      options: baseOptions,
    });
  }

  const monthlyCanvas = document.getElementById("monthlyChart");
  if (monthlyCanvas) {
    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(monthlyCanvas, {
      type: "line",
      data: {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        datasets: [
          {
            label: "Monthly consistency %",
            data: [0, 0, 0, 0],
            borderColor: colors.gold,
            backgroundColor: "rgba(212,175,55,.16)",
            fill: true,
            tension: 0.35,
            pointBackgroundColor: colors.gold,
          },
        ],
      },
      options: baseOptions,
    });
  }
}

function refreshDashboard() {
  const studyPct = renderStudySection();
  const habitPct = renderHabitSection();
  renderProductivity(studyPct, habitPct);
  renderStats();
}

function initDashboardEvents() {
  document.getElementById("todayStudyList").addEventListener("change", async (event) => {
    const checkbox = event.target.closest(".study-check");
    if (!checkbox) return;
    const id = checkbox.closest("[data-task-id]").dataset.taskId;

    if (window.StudyAPI) {
      await StudyAPI.toggleComplete(id);
      await loadDashboardData();
    } else {
      HabitStore.completeStudyTask(id, checkbox.checked);
      refreshDashboard();
    }
    showToast(checkbox.checked ? "Study task completed." : "Task marked pending.", "success");
  });

  document.getElementById("todayStudyList").addEventListener("click", (event) => {
    const button = event.target.closest(".task-details");
    if (!button) return;
    const id = button.dataset.taskId;
    const task = cachedStudySessions.find((item) => (item._id || item.id) === id) || HabitStore.loadStudyPlan().find((item) => item.id === id);
    if (!task) return;
    document.getElementById("taskModalTitle").textContent = task.subject;
    document.getElementById("taskModalBody").innerHTML = `
      <p class="mb-2"><strong>Topic:</strong> ${escapeHtml(task.topic)}</p>
      <p class="mb-2"><strong>Date:</strong> ${formatDate(task.date)}</p>
      <p class="mb-2"><strong>Estimated time:</strong> ${task.durationMinutes || task.estimatedMinutes || 30} minutes</p>
      <p class="mb-2"><strong>Priority:</strong> ${task.priority || "Medium"}</p>
      <p class="mb-0"><strong>Status:</strong> ${task.completed ? "Completed" : "In progress"}</p>`;
    new bootstrap.Modal(document.getElementById("taskModal")).show();
  });

  document.getElementById("todayHabitList").addEventListener("change", async (event) => {
    const checkbox = event.target.closest(".habit-check");
    if (!checkbox) return;
    const id = checkbox.closest("[data-habit-id]").dataset.habitId;
    const today = isoDate(0);

    if (window.HabitAPI) {
      if (checkbox.checked) {
        await HabitAPI.logCompletion(id, today, true);
      } else {
        await HabitAPI.removeCompletion(id, today);
      }
      await loadDashboardData();
    } else {
      const habits = HabitStore.loadHabits().map((habit) =>
        habit.id === id ? { ...habit, completedToday: checkbox.checked } : habit
      );
      HabitStore.saveHabits(habits);
      refreshDashboard();
    }
    showToast(checkbox.checked ? "Habit completed." : "Habit completion undone.", "success");
  });
}

async function loadDashboardData() {
  try {
    const [dashRes, habitsRes, studyRes] = await Promise.all([
      window.DashboardAPI ? DashboardAPI.getDashboard() : Promise.resolve(null),
      window.HabitAPI ? HabitAPI.getHabits() : Promise.resolve(null),
      window.StudyAPI ? StudyAPI.getStudySessions() : Promise.resolve(null),
    ]);

    if (dashRes && dashRes.success) {
      cachedDashboardData = dashRes.data;
    }
    if (habitsRes && habitsRes.success) {
      cachedHabits = habitsRes.data;
    } else if (!window.HabitAPI) {
      cachedHabits = HabitStore.loadHabits();
    } else {
      cachedHabits = [];
    }
    if (studyRes && studyRes.success) {
      cachedStudySessions = studyRes.data;
    } else if (!window.StudyAPI) {
      cachedStudySessions = HabitStore.loadStudyPlan();
    } else {
      cachedStudySessions = [];
    }

    renderWelcome();
    refreshDashboard();
    renderMiniCalendar();
    renderReminders();
    renderJournalPreview();
    renderRewardPreview();
    buildDashboardCharts();
  } catch (err) {
    console.error("Failed to load dashboard data:", err);
  }
}

document.addEventListener("app:ready", () => {
  if (!document.getElementById("todayStudyList")) return;
  loadDashboardData();
  initDashboardEvents();
});

document.addEventListener("theme:changed", () => {
  if (document.getElementById("weeklyChart")) buildDashboardCharts();
});
