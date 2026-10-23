/* ==========================================================
   analytics.js — theme-aware Chart.js visualisations
   ========================================================== */

const analyticsCharts = {};

function analyticsBaseOptions(colors, max) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: colors.text, font: { family: "Poppins" } } },
    },
    scales: {
      x: { ticks: { color: colors.muted }, grid: { color: colors.grid } },
      y: {
        beginAtZero: true,
        max: max || 100,
        ticks: { color: colors.muted },
        grid: { color: colors.grid },
      },
    },
  };
}

let liveAnalyticsData = {
  weekly: null,
  monthly: null,
  yearly: null,
  category: null,
  successRate: null
};

async function fetchAnalyticsData() {
  if (window.AnalyticsAPI) {
    try {
      const [w, m, y, c, s] = await Promise.all([
        AnalyticsAPI.getWeekly(),
        AnalyticsAPI.getMonthly(),
        AnalyticsAPI.getYearly(),
        AnalyticsAPI.getCategory(),
        AnalyticsAPI.getSuccessRate()
      ]);
      if (w && w.success) liveAnalyticsData.weekly = w.data;
      if (m && m.success) liveAnalyticsData.monthly = m.data;
      if (y && y.success) liveAnalyticsData.yearly = y.data;
      if (c && c.success) liveAnalyticsData.category = c.data;
      if (s && s.success) liveAnalyticsData.successRate = s.data;
    } catch (e) {
      console.warn("Error fetching analytics API:", e);
    }
  }
}

async function buildAnalyticsSummary() {
  await fetchAnalyticsData();
  
  if (liveAnalyticsData.successRate) {
    const sr = liveAnalyticsData.successRate;
    document.getElementById("summaryToday").textContent = `${sr.successRate || sr.overallRate || 0}%`;
    document.getElementById("summaryWeekly").textContent = `${sr.weeklyRate || 0}%`;
    document.getElementById("summaryMonthly").textContent = `${sr.monthlyRate || 0}%`;
    document.getElementById("summaryStreak").textContent = `${sr.longestStreak || 0} days`;
  } else {
    let habits = [];
    let tasks = [];
    if (window.HabitAPI) {
      const hRes = await HabitAPI.getHabits();
      if (hRes && hRes.success) habits = hRes.data;
    } else {
      habits = HabitStore.loadHabits();
    }
    if (window.StudyAPI) {
      const sRes = await StudyAPI.getStudySessions();
      if (sRes && sRes.success) tasks = sRes.data;
    } else {
      tasks = HabitStore.loadTodayTasks();
    }

    const habitPct = habits.length ? percentage(habits.filter((h) => h.completedToday).length, habits.length) : 0;
    const studyPct = tasks.length ? percentage(tasks.filter((t) => t.completed).length, tasks.length) : 0;
    const overall = (habits.length || tasks.length) ? Math.round((habitPct + studyPct) / (habits.length && tasks.length ? 2 : 1)) : 0;

    document.getElementById("summaryToday").textContent = `${overall}%`;
    document.getElementById("summaryWeekly").textContent = `${habitPct}%`;
    document.getElementById("summaryMonthly").textContent = `${overall}%`;
    document.getElementById("summaryStreak").textContent = `${habits.reduce(
      (max, habit) => Math.max(max, habit.currentStreak || 0),
      0
    )} days`;
  }
}

function buildAnalyticsCharts() {
  const colors = themeChartColors();
  Object.values(analyticsCharts).forEach((chart) => chart.destroy());

  const dailyCanvas = document.getElementById("dailyChart");
  if (dailyCanvas) {
    analyticsCharts.daily = new Chart(dailyCanvas, {
      type: "line",
      data: {
        labels: ["6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM"],
        datasets: [
          {
            label: "Completion %",
            data: [0, 0, 0, 0, 0, 0],
            borderColor: colors.gold,
            backgroundColor: "rgba(212,175,55,.16)",
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: analyticsBaseOptions(colors),
    });
  }

  const weeklyCanvas = document.getElementById("weeklyProgressChart");
  if (weeklyCanvas) {
    let labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    let studyData = [0, 0, 0, 0, 0, 0, 0];
    let habitData = [0, 0, 0, 0, 0, 0, 0];

    if (liveAnalyticsData.weekly && Array.isArray(liveAnalyticsData.weekly)) {
      labels = liveAnalyticsData.weekly.map(item => item.day || item.date || "");
      habitData = liveAnalyticsData.weekly.map(item => item.completionPercentage || 0);
    }

    analyticsCharts.weekly = new Chart(weeklyCanvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Study %",
            data: studyData,
            backgroundColor: colors.gold,
            borderRadius: 6,
          },
          {
            label: "Habits %",
            data: habitData,
            backgroundColor: "#6b7280",
            borderRadius: 6,
          },
        ],
      },
      options: analyticsBaseOptions(colors),
    });
  }

  const monthlyCanvas = document.getElementById("monthlyProgressChart");
  if (monthlyCanvas) {
    analyticsCharts.monthly = new Chart(monthlyCanvas, {
      type: "line",
      data: {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        datasets: [
          {
            label: "Consistency %",
            data: [0, 0, 0, 0],
            borderColor: colors.gold,
            backgroundColor: "rgba(212,175,55,.14)",
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: analyticsBaseOptions(colors),
    });
  }

  const splitCanvas = document.getElementById("splitChart");
  if (splitCanvas) {
    analyticsCharts.split = new Chart(splitCanvas, {
      type: "doughnut",
      data: {
        labels: ["Study completed", "Habits completed", "Pending"],
        datasets: [
          {
            data: [0, 0, 0],
            backgroundColor: [colors.gold, "#6b7280", "rgba(120,120,120,.35)"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { color: colors.text } } },
      },
    });
  }

  const subjectCanvas = document.getElementById("subjectChart");
  if (subjectCanvas) {
    const plan = window.StudyAPI ? [] : HabitStore.loadStudyPlan();
    const subjects = [...new Set(plan.map((task) => task.subject))];
    analyticsCharts.subjects = new Chart(subjectCanvas, {
      type: "bar",
      data: {
        labels: subjects.length ? subjects : ["No Data"],
        datasets: [
          {
            label: "Subject completion %",
            data: subjects.length ? subjects.map((subject) => {
              const items = plan.filter((task) => task.subject === subject);
              return percentage(items.filter((task) => task.completed).length, items.length);
            }) : [0],
            backgroundColor: colors.gold,
            borderRadius: 6,
          },
        ],
      },
      options: { ...analyticsBaseOptions(colors), indexAxis: "y" },
    });
  }

  const catCanvas = document.getElementById("categoryChart");
  if (catCanvas) {
    let categories = [];
    let catData = [];

    if (liveAnalyticsData.category && Array.isArray(liveAnalyticsData.category) && liveAnalyticsData.category.length) {
      categories = liveAnalyticsData.category.map(c => c.category || c._id);
      catData = liveAnalyticsData.category.map(c => c.completionPercentage || c.count || 0);
    } else {
      categories = ["No Data"];
      catData = [0];
    }

    analyticsCharts.categories = new Chart(catCanvas, {
      type: "bar",
      data: {
        labels: categories,
        datasets: [
          {
            label: "Category completion %",
            data: catData,
            backgroundColor: "#6b7280",
            borderRadius: 6,
          },
        ],
      },
      options: analyticsBaseOptions(colors),
    });
  }
}

document.addEventListener("app:ready", async () => {
  if (!document.getElementById("dailyChart")) return;
  await buildAnalyticsSummary();
  buildAnalyticsCharts();
});

document.addEventListener("theme:changed", () => {
  if (document.getElementById("dailyChart")) buildAnalyticsCharts();
});
