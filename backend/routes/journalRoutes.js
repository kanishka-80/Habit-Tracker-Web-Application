const express = require("express");
const router = express.Router();

const {
  createJournalEntry,
  getJournalEntries,
  getJournalEntryById,
  updateJournalEntry,
  deleteJournalEntry,
} = require("../controllers/journalController");

const { protect } = require("../middlewares/authMiddleware");

const {
  createJournalValidator,
  updateJournalValidator,
  journalIdValidator,
} = require("../validators/journalValidator");

router.use(protect);

router.route("/").post(createJournalValidator, createJournalEntry).get(getJournalEntries);

router
  .route("/:id")
  .get(journalIdValidator, getJournalEntryById)
  .put(updateJournalValidator, updateJournalEntry)
  .delete(journalIdValidator, deleteJournalEntry);

module.exports = router;
