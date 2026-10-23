let liveJournalEntries = [];
let MOODS = ["Motivated", "Focused", "Calm", "Neutral", "Tired", "Stressed"];
let selectedMood = "Focused";
let editingEntryId = "";
let entryToDelete = null;

function renderMoodPicker() {
  const holder = document.getElementById("moodPicker");
  if (!holder) return;
  holder.innerHTML = MOODS.map(
    (mood) => `
      <button type="button" class="mood-option ${mood === selectedMood ? "active" : ""}" data-mood="${mood}"
              aria-pressed="${mood === selectedMood}">${mood}</button>`
  ).join("");
}

function entryCardMarkup(entry) {
  const id = entry._id || entry.id;
  const content = entry.content || entry.text || "";
  const mood = entry.mood || "Focused";
  const title = entry.title || formatDate(entry.date);

  return `
    <div class="col-12 col-lg-6">
      <article class="card-panel" data-entry-id="${id}">
        <div class="card-head">
          <div>
            <h3 class="section-title">${escapeHtml(title)}</h3>
            <p class="section-subtitle">${formatDate(entry.date)}</p>
          </div>
          <span class="pill pill-gold">${escapeHtml(mood)}</span>
        </div>
        <p class="mb-3" style="font-size:.9rem">${escapeHtml(content.slice(0, 180))}${
    content.length > 180 ? "..." : ""
  }</p>
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-outline-gold btn-sm entry-view" type="button"><i class="fa-solid fa-eye me-1" aria-hidden="true"></i>View</button>
          <button class="btn btn-outline-gold btn-sm entry-edit" type="button"><i class="fa-solid fa-pen me-1" aria-hidden="true"></i>Edit</button>
          <button class="btn btn-outline-gold btn-sm entry-delete" type="button"><i class="fa-solid fa-trash me-1" aria-hidden="true"></i>Delete</button>
        </div>
      </article>
    </div>`;
}

function renderEntries() {
  const holder = document.getElementById("entryGrid");
  if (!holder) return;
  const searchNode = document.getElementById("entrySearch");
  const dateNode = document.getElementById("entryDate");
  const search = searchNode ? searchNode.value.trim().toLowerCase() : "";
  const dateFilter = dateNode ? dateNode.value : "";

  const entries = liveJournalEntries
    .filter((entry) => {
      const content = (entry.content || entry.text || "").toLowerCase();
      const mood = (entry.mood || "").toLowerCase();
      const matchesSearch = !search || content.includes(search) || mood.includes(search);
      const eDate = entry.date ? new Date(entry.date).toISOString().slice(0, 10) : "";
      const matchesDate = !dateFilter || eDate === dateFilter;
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (!entries.length) {
    holder.innerHTML = `<div class="col-12"><div class="card-panel empty-state">
      <i class="fa-solid fa-feather" aria-hidden="true"></i>
      No journal entries found. Write today's reflection above.</div></div>`;
    return;
  }
  holder.innerHTML = entries.map(entryCardMarkup).join("");
}

function resetEditor() {
  editingEntryId = "";
  selectedMood = "Focused";
  const textNode = document.getElementById("entryText");
  if (textNode) textNode.value = "";
  const errNode = document.getElementById("entryTextError");
  if (errNode) errNode.classList.remove("show");
  const dateNode = document.getElementById("editorDate");
  if (dateNode) dateNode.value = isoDate(0);
  const btnNode = document.getElementById("saveEntryButton");
  if (btnNode) btnNode.textContent = "Save Entry";
  renderMoodPicker();
}

function initJournalEvents() {
  const moodPicker = document.getElementById("moodPicker");
  if (moodPicker) {
    moodPicker.addEventListener("click", (event) => {
      const button = event.target.closest(".mood-option");
      if (!button) return;
      selectedMood = button.dataset.mood;
      renderMoodPicker();
    });
  }

  const journalForm = document.getElementById("journalForm");
  if (journalForm) {
    journalForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = document.getElementById("entryText");
      if (text.value.trim().length < 5) {
        document.getElementById("entryTextError").classList.add("show");
        text.classList.add("invalid");
        return;
      }
      text.classList.remove("invalid");
      document.getElementById("entryTextError").classList.remove("show");

      const payload = {
        title: `Reflection - ${document.getElementById("editorDate").value || isoDate(0)}`,
        content: text.value.trim(),
        text: text.value.trim(),
        mood: (selectedMood || "focused").toLowerCase(),
        date: document.getElementById("editorDate").value || isoDate(0),
      };

      if (window.JournalAPI) {
        if (editingEntryId) {
          await JournalAPI.updateJournalEntry(editingEntryId, payload);
        } else {
          await JournalAPI.createJournalEntry(payload);
        }
        await loadLiveJournal();
      } else {
        const entries = HabitStore.loadJournal();
        const localPayload = { id: editingEntryId || createId("entry"), ...payload };
        const index = entries.findIndex((entry) => entry.id === localPayload.id);
        if (index >= 0) entries[index] = localPayload;
        else entries.unshift(localPayload);
        HabitStore.saveJournal(entries);
        liveJournalEntries = HabitStore.loadJournal();
        renderEntries();
      }

      resetEditor();
      showToast(editingEntryId ? "Entry updated." : "Reflection saved.", "success");
    });
  }

  ["entrySearch", "entryDate"].forEach((id) => {
    const node = document.getElementById(id);
    if (node) node.addEventListener(node.type === "date" ? "change" : "input", renderEntries);
  });

  const clearBtn = document.getElementById("clearFilters");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      document.getElementById("entrySearch").value = "";
      document.getElementById("entryDate").value = "";
      renderEntries();
    });
  }

  const grid = document.getElementById("entryGrid");
  if (grid) {
    grid.addEventListener("click", (event) => {
      const card = event.target.closest("[data-entry-id]");
      if (!card) return;
      const id = card.dataset.entryId;
      const entry = liveJournalEntries.find((item) => (item._id || item.id) === id);
      if (!entry) return;

      if (event.target.closest(".entry-view")) {
        document.getElementById("entryModalTitle").textContent = formatDate(entry.date);
        document.getElementById("entryModalBody").innerHTML = `
          <p class="mb-2"><span class="pill pill-gold">${escapeHtml(entry.mood || "Focused")}</span></p>
          <p class="mb-0">${escapeHtml(entry.content || entry.text || "")}</p>`;
        new bootstrap.Modal(document.getElementById("entryModal")).show();
      }

      if (event.target.closest(".entry-edit")) {
        editingEntryId = id;
        selectedMood = entry.mood || "Focused";
        document.getElementById("entryText").value = entry.content || entry.text || "";
        document.getElementById("editorDate").value = entry.date ? new Date(entry.date).toISOString().slice(0, 10) : isoDate(0);
        document.getElementById("saveEntryButton").textContent = "Update Entry";
        renderMoodPicker();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      if (event.target.closest(".entry-delete")) {
        entryToDelete = entry;
        new bootstrap.Modal(document.getElementById("deleteEntryModal")).show();
      }
    });
  }

  const confirmBtn = document.getElementById("confirmDeleteEntry");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", async () => {
      if (!entryToDelete) return;
      const id = entryToDelete._id || entryToDelete.id;

      if (window.JournalAPI) {
        await JournalAPI.deleteJournalEntry(id);
        await loadLiveJournal();
      } else {
        HabitStore.saveJournal(
          HabitStore.loadJournal().filter((entry) => entry.id !== id)
        );
        liveJournalEntries = HabitStore.loadJournal();
        renderEntries();
      }

      entryToDelete = null;
      bootstrap.Modal.getInstance(document.getElementById("deleteEntryModal")).hide();
      showToast("Entry deleted.", "danger");
    });
  }
}

async function loadLiveJournal() {
  if (window.JournalAPI) {
    const res = await JournalAPI.getJournalEntries();
    if (res.success) {
      liveJournalEntries = res.data;
    } else {
      liveJournalEntries = HabitStore.loadJournal();
    }
  } else {
    liveJournalEntries = HabitStore.loadJournal();
  }
  renderEntries();
}

document.addEventListener("app:ready", () => {
  if (!document.getElementById("journalForm")) return;
  resetEditor();
  loadLiveJournal();
  initJournalEvents();
});
