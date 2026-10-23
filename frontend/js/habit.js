let liveHabits = [];
let habitToDelete = null;

function habitCardMarkup(habit) {
  const habitId = habit._id || habit.id;
  const today = isoDate(0);
  const isDoneToday = habit.completedToday !== undefined
    ? habit.completedToday
    : habit.completionLogs && habit.completionLogs.some(log => log.date === today && log.completed);
  const title = habit.title || habit.name || "Untitled Habit";
  const cat = (habit.category || "other").toLowerCase();
  const freq = (habit.frequency || "daily").toLowerCase();
  const prio = (habit.priority || "medium").toLowerCase();

  return `
    <div class="col-12 col-lg-6">
      <article class="card-panel" data-habit-id="${habitId}">
        <div class="card-head">
          <div>
            <h3 class="section-title">${escapeHtml(title)}</h3>
            <p class="section-subtitle">${escapeHtml(habit.description || "")}</p>
          </div>
          <span class="pill ${isDoneToday ? "pill-done" : ""}">${
    isDoneToday ? "Completed" : "Pending"
  }</span>
        </div>
        <div class="item-tags mb-3">
          <span class="pill">${escapeHtml(cat.toUpperCase())}</span>
          <span class="pill">${escapeHtml(freq)}</span>
          <span class="pill ${priorityClass(prio)}">${prio}</span>
          <span class="pill"><i class="fa-regular fa-bell" aria-hidden="true"></i>${habit.reminderTime || "None"}</span>
          <span class="pill pill-gold"><i class="fa-solid fa-fire" aria-hidden="true"></i>${habit.currentStreak || 0} day streak</span>
        </div>
        <div class="progress-line">
          <span>Longest streak: ${habit.longestStreak || 0} days</span>
          <span>Started ${formatDate(habit.startDate || habit.createdAt)}</span>
        </div>
        <div class="d-flex flex-wrap gap-2 mt-3">
          <button class="btn btn-gold btn-sm habit-toggle" type="button">
            <i class="fa-solid ${isDoneToday ? "fa-rotate-left" : "fa-check"} me-1" aria-hidden="true"></i>
            ${isDoneToday ? "Undo" : "Complete"}
          </button>
          <button class="btn btn-outline-gold btn-sm habit-edit" type="button">
            <i class="fa-solid fa-pen me-1" aria-hidden="true"></i>Edit
          </button>
          <button class="btn btn-outline-gold btn-sm habit-delete" type="button">
            <i class="fa-solid fa-trash me-1" aria-hidden="true"></i>Delete
          </button>
        </div>
      </article>
    </div>`;
}

function getFilteredHabits() {
  const search = document.getElementById("habitSearch").value.trim().toLowerCase();
  const category = document.getElementById("filterCategory").value.toLowerCase();
  const status = document.getElementById("filterStatus").value;
  const priority = document.getElementById("filterPriority").value.toLowerCase();
  const sort = document.getElementById("sortHabits").value;
  const today = isoDate(0);

  let habits = liveHabits.filter((habit) => {
    const title = (habit.title || habit.name || "").toLowerCase();
    const desc = (habit.description || "").toLowerCase();
    const matchesSearch = !search || title.includes(search) || desc.includes(search);
    const matchesCategory = category === "all" || (habit.category || "").toLowerCase() === category;
    
    const isDone = habit.completedToday !== undefined
      ? habit.completedToday
      : habit.completionLogs && habit.completionLogs.some(log => log.date === today && log.completed);

    const matchesStatus =
      status === "all" ||
      (status === "completed" ? isDone : !isDone);
    const matchesPriority = priority === "all" || (habit.priority || "").toLowerCase() === priority;
    return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
  });

  if (sort === "name") habits = habits.sort((a, b) => (a.title || a.name || "").localeCompare(b.title || b.name || ""));
  if (sort === "streak") habits = habits.sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0));
  if (sort === "priority") {
    const order = { high: 0, medium: 1, low: 2 };
    habits = habits.sort((a, b) => order[(a.priority || "medium").toLowerCase()] - order[(b.priority || "medium").toLowerCase()]);
  }
  return habits;
}

function renderHabits() {
  const holder = document.getElementById("habitGrid");
  if (!holder) return;
  const habits = getFilteredHabits();
  const today = isoDate(0);
  const done = liveHabits.filter((h) => {
    return h.completedToday || (h.completionLogs && h.completionLogs.some(log => log.date === today && log.completed));
  }).length;

  document.getElementById("habitSummary").textContent = `${liveHabits.length} habits · ${done} completed today · ${percentage(
    done,
    liveHabits.length
  )}% completion`;

  if (!habits.length) {
    holder.innerHTML = `<div class="col-12"><div class="card-panel empty-state">
      <i class="fa-solid fa-list-check" aria-hidden="true"></i>
      No habits match the current filters. Adjust the filters or create a new habit.</div></div>`;
    return;
  }
  holder.innerHTML = habits.map(habitCardMarkup).join("");
}

function openHabitModal(habit) {
  const form = document.getElementById("habitForm");
  form.reset();
  const habitId = habit ? (habit._id || habit.id) : "";
  document.getElementById("habitId").value = habitId;
  document.getElementById("habitModalTitle").textContent = habit ? "Edit Habit" : "Add Habit";
  if (habit) {
    document.getElementById("habitName").value = habit.title || habit.name || "";
    document.getElementById("habitDescription").value = habit.description || "";
    document.getElementById("habitCategory").value = (habit.category || "study").toLowerCase();
    document.getElementById("habitFrequency").value = (habit.frequency || "daily").toLowerCase();
    document.getElementById("habitPriority").value = (habit.priority || "medium").toLowerCase();
    document.getElementById("habitReminder").value = habit.reminderTime || "07:00";
    if (habit.startDate) {
      document.getElementById("habitStartDate").value = new Date(habit.startDate).toISOString().slice(0, 10);
    }
    document.getElementById("habitGoal").value = habit.target || habit.goal || "";
  } else {
    document.getElementById("habitStartDate").value = isoDate(0);
    document.getElementById("habitReminder").value = "07:00";
  }
  form.querySelectorAll(".field-error").forEach((node) => node.classList.remove("show"));
  new bootstrap.Modal(document.getElementById("habitModal")).show();
}

function initHabitForm() {
  const form = document.getElementById("habitForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("habitName");
    const reminder = document.getElementById("habitReminder");
    let valid = true;

    const nameError = document.getElementById("habitNameError");
    if (name.value.trim().length < 3) {
      nameError.classList.add("show");
      name.classList.add("invalid");
      valid = false;
    } else {
      nameError.classList.remove("show");
      name.classList.remove("invalid");
    }

    const reminderError = document.getElementById("habitReminderError");
    if (!reminder.value) {
      reminderError.classList.add("show");
      valid = false;
    } else reminderError.classList.remove("show");

    if (!valid) return;

    const id = document.getElementById("habitId").value;
    const habitData = {
      title: name.value.trim(),
      description: document.getElementById("habitDescription").value.trim() || "No description added.",
      category: document.getElementById("habitCategory").value.toLowerCase(),
      frequency: document.getElementById("habitFrequency").value.toLowerCase(),
      priority: document.getElementById("habitPriority").value.toLowerCase(),
      reminderTime: reminder.value,
      target: parseInt(document.getElementById("habitGoal").value.trim(), 10) || 1,
    };

    if (window.HabitAPI) {
      if (id) {
        await HabitAPI.updateHabit(id, habitData);
      } else {
        await HabitAPI.createHabit(habitData);
      }
      await loadLiveHabits();
    } else {
      const existing = HabitStore.loadHabits().find((h) => h.id === id);
      const habit = {
        id: id || createId("habit"),
        name: name.value.trim(),
        ...habitData,
        startDate: document.getElementById("habitStartDate").value || isoDate(0),
        currentStreak: existing ? existing.currentStreak : 0,
        longestStreak: existing ? existing.longestStreak : 0,
        completedToday: existing ? existing.completedToday : false,
      };
      HabitStore.saveHabit(habit);
      liveHabits = HabitStore.loadHabits();
      renderHabits();
    }

    bootstrap.Modal.getInstance(document.getElementById("habitModal")).hide();
    showToast(id ? "Habit updated." : "Habit created.", "success");
  });
}

function initHabitEvents() {
  const addBtn = document.getElementById("addHabitButton");
  if (addBtn) addBtn.addEventListener("click", () => openHabitModal(null));

  ["habitSearch", "filterCategory", "filterStatus", "filterPriority", "sortHabits"].forEach((id) => {
    const node = document.getElementById(id);
    if (node) node.addEventListener(node.tagName === "SELECT" ? "change" : "input", renderHabits);
  });

  const grid = document.getElementById("habitGrid");
  if (grid) {
    grid.addEventListener("click", async (event) => {
      const card = event.target.closest("[data-habit-id]");
      if (!card) return;
      const id = card.dataset.habitId;
      const habit = liveHabits.find((item) => (item._id || item.id) === id);
      if (!habit) return;

      if (event.target.closest(".habit-toggle")) {
        const today = isoDate(0);
        const isDone = habit.completedToday !== undefined
          ? habit.completedToday
          : habit.completionLogs && habit.completionLogs.some(log => log.date === today && log.completed);

        if (window.HabitAPI) {
          if (isDone) {
            await HabitAPI.removeCompletion(id, today);
          } else {
            await HabitAPI.logCompletion(id, today, true);
          }
          await loadLiveHabits();
        } else {
          HabitStore.saveHabit({ ...habit, completedToday: !isDone });
          liveHabits = HabitStore.loadHabits();
          renderHabits();
        }
        showToast(isDone ? "Completion undone." : "Habit completed.", "success");
      }

      if (event.target.closest(".habit-edit")) openHabitModal(habit);

      if (event.target.closest(".habit-delete")) {
        habitToDelete = habit;
        document.getElementById("deleteHabitName").textContent = habit.title || habit.name;
        new bootstrap.Modal(document.getElementById("deleteHabitModal")).show();
      }
    });
  }

  const confirmDelete = document.getElementById("confirmDeleteHabit");
  if (confirmDelete) {
    confirmDelete.addEventListener("click", async () => {
      if (!habitToDelete) return;
      const id = habitToDelete._id || habitToDelete.id;

      if (window.HabitAPI) {
        await HabitAPI.deleteHabit(id);
        await loadLiveHabits();
      } else {
        HabitStore.deleteHabit(id);
        liveHabits = HabitStore.loadHabits();
        renderHabits();
      }

      habitToDelete = null;
      bootstrap.Modal.getInstance(document.getElementById("deleteHabitModal")).hide();
      showToast("Habit deleted.", "danger");
    });
  }
}

function fillCategoryOptions() {
  const filter = document.getElementById("filterCategory");
  const field = document.getElementById("habitCategory");
  if (!filter || !field) return;

  const categories = ["study", "fitness", "health", "reading", "wellness", "personal", "productivity", "mindfulness", "finance", "social", "creativity", "other"];
  filter.innerHTML = `<option value="all">All Categories</option>`;
  field.innerHTML = ``;
  categories.forEach((cat) => {
    const label = cat.charAt(0).toUpperCase() + cat.slice(1);
    filter.insertAdjacentHTML("beforeend", `<option value="${cat}">${label}</option>`);
    field.insertAdjacentHTML("beforeend", `<option value="${cat}">${label}</option>`);
  });
}

async function loadLiveHabits() {
  if (window.HabitAPI) {
    const res = await HabitAPI.getHabits();
    if (res.success) {
      liveHabits = res.data;
    } else {
      liveHabits = HabitStore.loadHabits();
    }
  } else {
    liveHabits = HabitStore.loadHabits();
  }
  renderHabits();
}

document.addEventListener("app:ready", () => {
  if (!document.getElementById("habitGrid")) return;
  fillCategoryOptions();
  initHabitForm();
  initHabitEvents();
  loadLiveHabits();
});
