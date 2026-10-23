/* ==========================================================
   profile.js — profile summary, edit form, password form UI
   ========================================================== */

async function renderProfile() {
  let profile = window.currentUser || {};

  if (window.ProfileAPI) {
    const res = await ProfileAPI.getProfile();
    if (res && res.success && res.data) {
      profile = res.data;
      window.currentUser = profile;
    }
  } else if (!window.currentUser) {
    profile = HabitStore.loadProfile();
  }

  const name = profile.name || "Student";
  const email = profile.email || "";
  const semester = profile.semester || "Not specified";
  const branch = profile.branch || profile.bio || "Not specified";
  const joined = profile.createdAt ? formatDate(profile.createdAt) : profile.joined || "Recently";

  document.getElementById("profileName").textContent = name;
  document.getElementById("profileEmail").textContent = email;
  document.getElementById("profileSemester").textContent = semester;
  document.getElementById("profileBranch").textContent = branch;
  document.getElementById("profileJoined").textContent = `Joined ${joined}`;
  document.getElementById("profileAvatar").textContent = initials(name);

  document.getElementById("editName").value = name;
  document.getElementById("editEmail").value = email;
  document.getElementById("editSemester").value = semester === "Not specified" ? "" : semester;
  document.getElementById("editBranch").value = branch === "Not specified" ? "" : branch;
  document.getElementById("editGoal").value = profile.dailyGoal || 4;

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

  let rewards = [];
  if (window.RewardAPI) {
    const res = await RewardAPI.getRewards();
    if (res && res.success) rewards = res.data;
  }

  const today = isoDate(0);
  const completedHabits = habits.filter((h) => {
    return h.completedToday || (h.completionLogs && h.completionLogs.some(l => l.date === today && l.completed));
  }).length;
  const completedTasks = plan.filter((task) => task.completed).length;

  const currentStreak = habits.reduce(
    (max, habit) => Math.max(max, habit.currentStreak || 0),
    0
  );

  const habitPct = habits.length ? percentage(completedHabits, habits.length) : 0;
  const studyPct = plan.length ? percentage(completedTasks, plan.length) : 0;
  const overallAvg = (habits.length || plan.length)
    ? Math.round((habitPct + studyPct) / (habits.length && plan.length ? 2 : 1))
    : 0;

  document.getElementById("profileStreak").textContent = `${currentStreak} days`;
  document.getElementById("profileHabitsDone").textContent = completedHabits;
  document.getElementById("profileTasksDone").textContent = completedTasks;
  document.getElementById("profileAverage").textContent = `${overallAvg}%`;
  document.getElementById("profileBadges").textContent = rewards.length;
}

function initProfileForms() {
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = document.getElementById("editName");
      const email = document.getElementById("editEmail");
      const goal = document.getElementById("editGoal");
      let valid = true;

      const nameError = document.getElementById("editNameError");
      if (name.value.trim().length < 2) {
        nameError.classList.add("show");
        valid = false;
      } else nameError.classList.remove("show");

      const emailError = document.getElementById("editEmailError");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
        emailError.classList.add("show");
        valid = false;
      } else emailError.classList.remove("show");

      const goalError = document.getElementById("editGoalError");
      if (!goal.value || Number(goal.value) <= 0 || Number(goal.value) > 16) {
        goalError.classList.add("show");
        valid = false;
      } else goalError.classList.remove("show");

      if (!valid) {
        showToast("Please correct the highlighted fields.", "danger");
        return;
      }

      const payload = {
        name: name.value.trim(),
        bio: document.getElementById("editBranch").value.trim(),
      };

      if (window.ProfileAPI) {
        const res = await ProfileAPI.updateProfile(payload);
        if (res && res.success) {
          window.currentUser = res.data;
          showToast("Profile updated successfully.", "success");
        } else {
          showToast(res ? res.message : "Failed to update profile", "danger");
        }
      } else {
        HabitStore.saveProfile({
          ...HabitStore.loadProfile(),
          name: name.value.trim(),
          email: email.value.trim(),
          semester: document.getElementById("editSemester").value,
          branch: document.getElementById("editBranch").value.trim(),
          dailyGoal: Number(goal.value),
        });
        showToast("Profile updated.", "success");
      }

      await renderProfile();
      renderSidebar();
    });
  }

  const pwdForm = document.getElementById("passwordForm");
  if (pwdForm) {
    pwdForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const current = document.getElementById("currentPassword");
      const next = document.getElementById("newPassword");
      const confirm = document.getElementById("confirmPassword");
      let valid = true;

      const currentError = document.getElementById("currentPasswordError");
      if (!current.value) {
        currentError.classList.add("show");
        valid = false;
      } else currentError.classList.remove("show");

      const nextError = document.getElementById("newPasswordError");
      if (next.value.length < 6) {
        nextError.classList.add("show");
        valid = false;
      } else nextError.classList.remove("show");

      const confirmError = document.getElementById("confirmPasswordError");
      if (!confirm.value || confirm.value !== next.value) {
        confirmError.classList.add("show");
        valid = false;
      } else confirmError.classList.remove("show");

      if (!valid) return;

      if (window.AuthAPI) {
        const res = await AuthAPI.changePassword(current.value, next.value);
        if (res && res.success) {
          showToast("Password changed successfully.", "success");
          pwdForm.reset();
        } else {
          showToast(res ? res.message : "Password change failed.", "danger");
        }
      } else {
        pwdForm.reset();
        showToast("Password updated.", "success");
      }
    });
  }
}

document.addEventListener("app:ready", async () => {
  if (!document.getElementById("profileForm")) return;
  await renderProfile();
  initProfileForms();
});
