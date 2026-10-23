/**
 * ==========================================================
 * study.js — Simple Weekly Study Planner
 * ==========================================================
 * Handles the logic for creating, editing, completing, 
 * and deleting manual study sessions using localStorage.
 */

(() => {
  'use strict';

  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const STORAGE_KEY = 'studySessions';
  let sessions = [];
  let editingId = null;

  const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // ==========================================================
  // DOM ELEMENTS
  // ==========================================================
  const els = {
    semester: document.getElementById('plannerSemester'),
    course: document.getElementById('plannerCourse'),
    subject: document.getElementById('slotSubject'),
    day: document.getElementById('slotDay'),
    startTime: document.getElementById('slotStartTime'),
    endTime: document.getElementById('slotEndTime'),
    priority: document.getElementById('slotPriority'),
    addBtn: document.getElementById('addTimeSlotBtn'),
    todayList: document.getElementById('todayScheduleList') || document.querySelector('.list-group'), // Fallback if ID is missing in provided HTML
    weeklyLists: {
      Monday: document.getElementById('mondayList') || document.querySelector('#collapseMonday .accordion-body'),
      Tuesday: document.getElementById('tuesdayList') || document.querySelector('#collapseTuesday .accordion-body'),
      Wednesday: document.getElementById('wednesdayList') || document.querySelector('#collapseWednesday .accordion-body'),
      Thursday: document.getElementById('thursdayList') || document.querySelector('#collapseThursday .accordion-body'),
      Friday: document.getElementById('fridayList') || document.querySelector('#collapseFriday .accordion-body'),
      Saturday: document.getElementById('saturdayList') || document.querySelector('#collapseSaturday .accordion-body'),
      Sunday: document.getElementById('sundayList') || document.querySelector('#collapseSunday .accordion-body')
    }
  };

  // ==========================================================
  // INITIALIZATION
  // ==========================================================
  document.addEventListener('DOMContentLoaded', () => {
    loadSessions();
    ensureContainersExist();
    setupEventListeners();
    renderAll();
  });

  // Ensure containers have the right IDs/Classes for targeting
  const ensureContainersExist = () => {
    if (!els.todayList) {
      // Find the today's schedule card body dynamically if ID wasn't perfectly matched
      const todayCard = Array.from(document.querySelectorAll('.section-title')).find(el => el.textContent.includes("Today's Schedule"));
      if (todayCard) {
        const ul = todayCard.closest('section').querySelector('ul');
        if (ul) {
          ul.id = 'todayScheduleList';
          els.todayList = ul;
        }
      }
    }
  };

  const setupEventListeners = () => {
    if (els.addBtn) {
      els.addBtn.addEventListener('click', handleAddOrUpdateSession);
    }

    // Event Delegation for dynamically created buttons (Complete, Edit, Delete)
    document.body.addEventListener('click', (e) => {
      const completeBtn = e.target.closest('.action-complete');
      const editBtn = e.target.closest('.action-edit');
      const deleteBtn = e.target.closest('.action-delete');

      if (completeBtn) toggleComplete(completeBtn.dataset.id);
      if (editBtn) prepareEditSession(editBtn.dataset.id);
      if (deleteBtn) confirmDelete(deleteBtn.dataset.id);
    });
  };

  // ==========================================================
  // STORAGE UTILITIES
  // ==========================================================
  const loadSessions = async () => {
    if (window.StudyAPI) {
      const res = await StudyAPI.getStudySessions();
      if (res && res.success) {
        sessions = res.data;
        renderAll();
        return;
      }
    }
    const data = localStorage.getItem(STORAGE_KEY);
    sessions = data ? JSON.parse(data) : [];
    renderAll();
  };

  const saveSessions = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  };

  // ==========================================================
  // CORE LOGIC (ADD, EDIT, DELETE, COMPLETE)
  // ==========================================================
  const handleAddOrUpdateSession = async () => {
    const sessionData = {
      semester: (els.semester && els.semester.value.trim()) || "Semester 7",
      course: (els.course && els.course.value.trim()) || "Computer Science",
      subject: els.subject.value.trim(),
      topic: els.subject.value.trim(),
      day: els.day.value.trim(),
      startTime: els.startTime.value,
      endTime: els.endTime.value,
      priority: els.priority.value
    };

    if (!validateForm(sessionData)) return;

    if (editingId) {
      if (window.StudyAPI) {
        await StudyAPI.updateStudySession(editingId, sessionData);
      } else {
        const index = sessions.findIndex(s => (s._id || s.id) === editingId);
        if (index !== -1) {
          sessions[index] = { ...sessions[index], ...sessionData };
        }
        saveSessions();
      }
      showToast('Study session updated successfully.', 'success');
      editingId = null;
      if (els.addBtn) els.addBtn.innerHTML = '<i class="fa-solid fa-plus me-1"></i>Add Study Session';
    } else {
      if (window.StudyAPI) {
        await StudyAPI.createStudySession(sessionData);
      } else {
        const newSession = {
          id: generateId(),
          ...sessionData,
          completed: false
        };
        sessions.push(newSession);
        saveSessions();
      }
      showToast('Study session added successfully.', 'success');
    }

    await loadSessions();
    resetForm();
  };

  const prepareEditSession = (id) => {
    const session = sessions.find(s => (s._id || s.id) === id);
    if (!session) return;

    if (els.semester) els.semester.value = session.semester || '';
    if (els.course) els.course.value = session.course || '';
    els.subject.value = session.subject || session.topic || '';
    els.day.value = session.day || 'Monday';
    els.startTime.value = session.startTime || '07:00';
    els.endTime.value = session.endTime || '08:00';
    els.priority.value = session.priority || 'Medium';

    editingId = id;
    if (els.addBtn) els.addBtn.innerHTML = '<i class="fa-solid fa-save me-1"></i>Update Study Session';
    
    // Scroll smoothly to form
    els.subject.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const toggleComplete = async (id) => {
    if (window.StudyAPI) {
      await StudyAPI.toggleComplete(id);
      await loadSessions();
    } else {
      const session = sessions.find(s => (s._id || s.id) === id);
      if (session) {
        session.completed = !session.completed;
        saveSessions();
        renderAll();
      }
    }
  };

  const confirmDelete = (id) => {
    let modalEl = document.getElementById('deleteConfirmModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'deleteConfirmModal';
      modalEl.className = 'modal fade';
      modalEl.setAttribute('tabindex', '-1');
      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content shadow-lg">
            <div class="modal-header">
              <h5 class="modal-title">Delete Study Session</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              Are you sure you want to delete this study session? This action cannot be undone.
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modalEl);
    }

    const modalInstance = new bootstrap.Modal(modalEl);
    modalInstance.show();

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    const newConfirmBtn = document.getElementById('confirmDeleteBtn');

    newConfirmBtn.addEventListener('click', async () => {
      if (window.StudyAPI) {
        await StudyAPI.deleteStudySession(id);
        await loadSessions();
      } else {
        sessions = sessions.filter(s => (s._id || s.id) !== id);
        saveSessions();
        renderAll();
      }
      modalInstance.hide();
      showToast('Study session deleted.', 'info');
    });
  };

  // ==========================================================
  // VALIDATION & UTILITIES
  // ==========================================================
  const validateForm = (data) => {
    if (!data.subject) return showToast('Subject is required.', 'danger'), false;
    if (!data.day) return showToast('Study Day is required.', 'danger'), false;
    if (!data.startTime) return showToast('Start Time is required.', 'danger'), false;
    if (!data.endTime) return showToast('End Time is required.', 'danger'), false;
    if (!data.priority) return showToast('Priority is required.', 'danger'), false;

    const startMins = parseTimeToMinutes(data.startTime);
    const endMins = parseTimeToMinutes(data.endTime);

    if (endMins <= startMins) {
      return showToast('End Time must be greater than Start Time.', 'danger'), false;
    }

    // Check duplicates
    const isDuplicate = sessions.some(s => 
      s.id !== editingId && 
      s.subject.toLowerCase() === data.subject.toLowerCase() &&
      s.day === data.day &&
      s.startTime === data.startTime &&
      s.endTime === data.endTime
    );

    if (isDuplicate) {
      return showToast('A duplicate study session already exists.', 'danger'), false;
    }

    return true;
  };

  const resetForm = () => {
    els.subject.value = '';
    els.startTime.value = '07:00';
    els.endTime.value = '08:00';
    editingId = null;
    if (els.addBtn) els.addBtn.innerHTML = '<i class="fa-solid fa-plus me-1"></i>Add Study Session';
  };

  const generateId = () => 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime12Hour = (timeStr) => {
    if (!timeStr) return '';
    let [hours, minutes] = timeStr.split(':');
    hours = parseInt(hours, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const sortSessions = (arr) => {
    return arr.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
  };

  const getPriorityClass = (priority) => {
    switch(priority.toLowerCase()) {
      case 'high': return 'bg-danger';
      case 'medium': return 'bg-warning text-dark';
      case 'low': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  const getCurrentDay = () => {
    const todayIndex = new Date().getDay();
    return DAYS_OF_WEEK[todayIndex];
  };

  // ==========================================================
  // RENDERING LOGIC
  // ==========================================================
  const renderAll = () => {
    renderTodaySchedule();
    renderWeeklyTimetable();
  };

  const createSessionCardHTML = (session) => {
    const id = session._id || session.id;
    const timeFormatted = `${formatTime12Hour(session.startTime)} - ${formatTime12Hour(session.endTime)}`;
    const statusBadge = session.completed 
      ? `<span class="badge bg-success border border-success rounded-pill px-2 py-1"><i class="fa-solid fa-check-circle me-1"></i>Completed</span>`
      : `<span class="badge bg-secondary border border-secondary rounded-pill px-2 py-1"><i class="fa-regular fa-circle me-1"></i>Pending</span>`;
    
    return `
      <div class="card shadow-sm mb-3 rounded-4 hover-lift" style="border-left: 4px solid var(--gold) !important;">
        <div class="card-body p-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div class="flex-grow-1">
            <div class="d-flex align-items-center gap-2 mb-1">
              <h6 class="text-warning fw-bold mb-0">${timeFormatted}</h6>
              <span class="badge ${getPriorityClass(session.priority || 'Medium')} rounded-pill px-2 py-1" style="font-size: 0.65rem;">${session.priority || 'Medium'}</span>
            </div>
            <h5 class="fw-bold mb-2 mt-1">${escapeHtml(session.subject || session.topic || '')}</h5>
            <div class="d-flex align-items-center gap-3">
              ${statusBadge}
            </div>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-success rounded-circle action-complete" style="width: 38px; height: 38px;" data-id="${id}" title="${session.completed ? 'Undo Complete' : 'Complete'}">
              <i class="fa-solid ${session.completed ? 'fa-rotate-left' : 'fa-check'}"></i>
            </button>
            <button class="btn btn-outline-info rounded-circle action-edit" style="width: 38px; height: 38px;" data-id="${id}" title="Edit">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-outline-danger rounded-circle action-delete" style="width: 38px; height: 38px;" data-id="${id}" title="Delete">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  };

  const renderTodaySchedule = () => {
    if (!els.todayList) return;
    
    const currentDay = getCurrentDay();
    const todaySessions = sortSessions(sessions.filter(s => s.day === currentDay));
    
    if (todaySessions.length === 0) {
      els.todayList.innerHTML = `<p class="text-muted fst-italic py-3">No study sessions scheduled for today (${currentDay}).</p>`;
      return;
    }

    els.todayList.innerHTML = todaySessions.map(s => createSessionCardHTML(s)).join('');
  };

  const renderWeeklyTimetable = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    days.forEach(day => {
      const container = els.weeklyLists[day];
      if (!container) return;

      const daySessions = sortSessions(sessions.filter(s => s.day === day));

      // Handle UL vs Div containers appropriately
      if (daySessions.length === 0) {
        container.innerHTML = `<p class="text-muted fst-italic px-3 mb-2">No study sessions scheduled for ${day}.</p>`;
      } else {
        container.innerHTML = daySessions.map(s => createSessionCardHTML(s)).join('');
      }
    });
  };

  // ==========================================================
  // UI UTILITIES (TOAST)
  // ==========================================================
  const showToast = (message, type = 'success') => {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      toastContainer.style.zIndex = '1055';
      document.body.appendChild(toastContainer);
    }

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-bg-${type} border-0 shadow`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body fw-medium">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;

    toastContainer.appendChild(toastEl);
    const bsToast = new bootstrap.Toast(toastEl, { delay: 3000 });
    bsToast.show();

    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  };

})();