/* ==========================================================
   calendar.js — FullCalendar setup, filters and event modal
   ========================================================== */

let fullCalendar = null;
let activeCalendarFilter = "all";

async function buildCalendarEvents() {
  const events = [];

  let habits = [];
  let studySessions = [];

  if (window.CalendarAPI) {
    const res = await CalendarAPI.getCalendarData();
    if (res && res.success) {
      habits = res.habits || [];
      studySessions = res.studySessions || [];
    }
  }

  if (!habits.length && !studySessions.length && !window.CalendarAPI) {
    studySessions = HabitStore.loadStudyPlan();
    habits = HabitStore.loadHabits();
  }

  studySessions.forEach((task) => {
    const taskDate = task.date ? new Date(task.date).toISOString().slice(0, 10) : isoDate(0);
    events.push({
      id: task._id || task.id,
      title: `${task.subject || task.topic || 'Study'}: ${task.topic || task.subject || ''}`,
      start: taskDate,
      allDay: true,
      backgroundColor: task.completed ? "#22c55e" : "#d4af37",
      textColor: "#14110a",
      extendedProps: {
        type: "Study",
        status: task.completed ? "Completed" : "Pending",
        details: `${task.durationMinutes || task.estimatedMinutes || 30} minutes · ${task.priority || "Medium"} priority`,
      },
    });
  });

  const today = isoDate(0);
  habits.forEach((habit, index) => {
    if (habit.completionLogs && habit.completionLogs.length) {
      habit.completionLogs.forEach((log) => {
        events.push({
          id: `${habit._id || habit.id}-${log.date}`,
          title: habit.title || habit.name,
          start: `${log.date}T${habit.reminderTime || "07:00"}:00`,
          backgroundColor: log.completed ? "#22c55e" : "#ef4444",
          textColor: "#ffffff",
          extendedProps: {
            type: "Habit",
            status: log.completed ? "Completed" : "Missed",
            details: `${habit.category || "other"} · streak ${habit.currentStreak || 0} days`,
          },
        });
      });
    } else {
      events.push({
        id: `${habit._id || habit.id}-today`,
        title: habit.title || habit.name,
        start: `${today}T${habit.reminderTime || "07:00"}:00`,
        backgroundColor: habit.completedToday ? "#22c55e" : "#3b82f6",
        textColor: "#ffffff",
        extendedProps: {
          type: "Habit",
          status: habit.completedToday ? "Completed" : "Pending",
          details: `${habit.category || "other"} · streak ${habit.currentStreak || 0} days`,
        },
      });
    }
  });

  return events;
}

let cachedEventsList = [];

async function visibleEvents() {
  if (activeCalendarFilter === "all") return cachedEventsList;
  return cachedEventsList.filter((event) => event.extendedProps.type === activeCalendarFilter);
}

async function initCalendarPage() {
  const holder = document.getElementById("fullCalendar");
  if (!holder || !window.FullCalendar) return;

  cachedEventsList = await buildCalendarEvents();

  fullCalendar = new FullCalendar.Calendar(holder, {
    initialView: window.innerWidth < 768 ? "listWeek" : "dayGridMonth",
    height: "auto",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,listWeek",
    },
    events: cachedEventsList,
    eventClick(info) {
      const props = info.event.extendedProps;
      document.getElementById("eventModalTitle").textContent = info.event.title;
      document.getElementById("eventModalBody").innerHTML = `
        <p class="mb-2"><strong>Date:</strong> ${formatDate(info.event.start)}</p>
        <p class="mb-2"><strong>Time:</strong> ${
          info.event.allDay
            ? "All day"
            : info.event.start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        }</p>
        <p class="mb-2"><strong>Type:</strong> ${props.type}</p>
        <p class="mb-2"><strong>Status:</strong> ${props.status}</p>
        <p class="mb-0"><strong>Details:</strong> ${escapeHtml(props.details)}</p>`;
      new bootstrap.Modal(document.getElementById("eventModal")).show();
    },
  });
  fullCalendar.render();

  const filterContainer = document.querySelector(".calendar-filters");
  if (filterContainer) {
    filterContainer.addEventListener("click", async (event) => {
      const button = event.target.closest(".plan-tab");
      if (!button) return;
      activeCalendarFilter = button.dataset.filter;
      document
        .querySelectorAll(".calendar-filters .plan-tab")
        .forEach((tab) => tab.classList.remove("active"));
      button.classList.add("active");
      
      const filtered = await visibleEvents();
      fullCalendar.removeAllEvents();
      filtered.forEach((item) => fullCalendar.addEvent(item));
    });
  }

  window.addEventListener("resize", () => {
    const view = window.innerWidth < 768 ? "listWeek" : "dayGridMonth";
    if (fullCalendar.view.type !== view && fullCalendar.view.type !== "timeGridWeek") {
      fullCalendar.changeView(view);
    }
  });
}

document.addEventListener("app:ready", initCalendarPage);
