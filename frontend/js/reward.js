/* ==========================================================
   reward.js — level, points, badges and milestone progress
   ========================================================== */

const BADGES = [
  { id: "b1", name: "First Step", icon: "fa-shoe-prints", requirement: "Complete your first habit", target: 1 },
  { id: "b2", name: "7 Day Streak", icon: "fa-fire", requirement: "Keep a 7 day streak", target: 7 },
  { id: "b3", name: "30 Day Streak", icon: "fa-calendar-check", requirement: "Keep a 30 day streak", target: 30 },
  { id: "b4", name: "Habit Master", icon: "fa-list-check", requirement: "Complete 100 habit check-ins", target: 100 },
  { id: "b5", name: "Study Champion", icon: "fa-trophy", requirement: "Finish 50 study tasks", target: 50 },
  { id: "b6", name: "Consistency Star", icon: "fa-star", requirement: "Reach 90% monthly consistency", target: 90 },
];

async function rewardProgress() {
  let rewards = [];
  if (window.RewardAPI) {
    const res = await RewardAPI.getRewards();
    if (res && res.success) {
      rewards = res.data;
    }
  }

  let habits = [];
  if (window.HabitAPI) {
    const res = await HabitAPI.getHabits();
    if (res && res.success) habits = res.data;
  } else {
    habits = HabitStore.loadHabits();
  }

  let plan = [];
  if (window.StudyAPI) {
    const res = await StudyAPI.getStudySessions();
    if (res && res.success) plan = res.data;
  } else {
    plan = HabitStore.loadStudyPlan();
  }

  let journalEntries = [];
  if (window.JournalAPI) {
    const res = await JournalAPI.getJournalEntries();
    if (res && res.success) journalEntries = res.data;
  } else {
    journalEntries = HabitStore.loadJournal();
  }

  const today = isoDate(0);
  const completedTasks = plan.filter((task) => task.completed).length;
  const completedHabits = habits.filter((h) => {
    return h.completedToday || (h.completionLogs && h.completionLogs.some(l => l.date === today && l.completed));
  }).length;

  const totalCompletions = habits.reduce((sum, h) => {
    return sum + (h.totalCompletions || (h.completionLogs ? h.completionLogs.filter(l => l.completed).length : 0));
  }, 0);

  const bestStreak = habits.reduce((max, habit) => Math.max(max, habit.longestStreak || habit.currentStreak || 0), 0);
  const currentStreak = habits.reduce((max, habit) => Math.max(max, habit.currentStreak || 0), 0);

  const points = rewards.length * 50 + completedTasks * 15 + totalCompletions * 10 + bestStreak * 5;
  const level = Math.max(1, Math.floor(points / 150) + 1);
  const nextLevelPoints = level * 150;
  const consistencyRate = habits.length ? Math.round(percentage(completedHabits, habits.length)) : 0;

  return {
    rewards,
    points,
    level,
    nextLevelPoints,
    levelProgress: percentage(points % 150, 150),
    journalCount: journalEntries.length,
    values: {
      b1: (completedHabits > 0 || completedTasks > 0 || rewards.length > 0) ? 1 : 0,
      b2: currentStreak,
      b3: bestStreak,
      b4: totalCompletions,
      b5: completedTasks,
      b6: consistencyRate,
    },
  };
}

async function renderRewards() {
  const state = await rewardProgress();
  document.getElementById("rewardLevel").textContent = `Level ${state.level}`;
  document.getElementById("rewardPoints").textContent = `${state.points} pts`;
  document.getElementById("rewardNext").textContent = `${Math.max(
    0,
    state.nextLevelPoints - state.points
  )} pts to Level ${state.level + 1}`;
  document.getElementById("rewardBar").style.width = `${state.levelProgress}%`;

  const holder = document.getElementById("badgeGrid");
  if (!holder) return;
  let unlockedCount = 0;

  holder.innerHTML = BADGES.map((badge) => {
    const value = state.values[badge.id] || 0;
    const pct = Math.min(100, percentage(value, badge.target));
    const unlocked = pct >= 100 || (state.rewards && state.rewards.some(r => (r.title || "").toLowerCase().includes(badge.name.toLowerCase())));
    if (unlocked) unlockedCount += 1;
    return `
      <div class="col-12 col-sm-6 col-xl-4">
        <article class="card-panel ${unlocked ? "" : "opacity-75"}">
          <div class="d-flex align-items-center gap-3 mb-3">
            <span class="stat-icon mb-0"><i class="fa-solid ${badge.icon}" aria-hidden="true"></i></span>
            <div>
              <h3 class="section-title">${badge.name}</h3>
              <p class="section-subtitle">${badge.requirement}</p>
            </div>
          </div>
          <div class="progress-line">
            <span class="pill ${unlocked ? "pill-done" : ""}">${unlocked ? "Unlocked" : "Locked"}</span>
            <span>${unlocked ? badge.target : Math.min(value, badge.target)}/${badge.target}</span>
          </div>
          <div class="progress" role="progressbar" aria-label="${badge.name} progress"
               aria-valuenow="${unlocked ? 100 : pct}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar" style="width:${unlocked ? 100 : pct}%"></div>
          </div>
        </article>
      </div>`;
  }).join("");

  document.getElementById("rewardSummary").textContent = `${unlockedCount} of ${BADGES.length} badges unlocked`;

  const milestones = document.getElementById("milestoneList");
  if (milestones) {
    milestones.innerHTML = [
      { label: "Complete 7 straight days of habits", done: state.values.b2 >= 7 },
      { label: "Finish 20 study tasks", done: state.values.b5 >= 20 },
      { label: "Write 10 journal reflections", done: state.journalCount >= 10 },
      { label: "Reach 90% monthly consistency", done: state.values.b6 >= 90 },
    ]
      .map(
        (milestone) => `
        <div class="reminder-row">
          <i class="fa-solid ${milestone.done ? "fa-circle-check text-gold" : "fa-circle"} me-2" aria-hidden="true"></i>
          <span class="reminder-title">${milestone.label}</span>
          <span class="pill ${milestone.done ? "pill-done" : ""}">${milestone.done ? "Achieved" : "In progress"}</span>
        </div>`
      )
      .join("");
  }
}

document.addEventListener("app:ready", () => {
  if (!document.getElementById("badgeGrid")) return;
  renderRewards();

  const viewBtn = document.getElementById("viewAchievement");
  if (viewBtn) {
    viewBtn.addEventListener("click", () => {
      new bootstrap.Modal(document.getElementById("achievementModal")).show();
    });
  }
});
