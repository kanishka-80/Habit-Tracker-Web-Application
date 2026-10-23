/**
 * ==========================================================
 * journalApi.js
 * Journal API Service
 * ==========================================================
 */

const JournalAPI = {
    /**
     * Get journal entries with optional query filters
     */
    async getJournalEntries(params = {}) {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/journal?${query}` : "/journal";
        return await API.get(endpoint);
    },

    /**
     * Get single journal entry
     */
    async getJournalEntryById(id) {
        return await API.get(`/journal/${id}`);
    },

    /**
     * Create journal entry
     */
    async createJournalEntry(entryData) {
        return await API.post("/journal", entryData);
    },

    /**
     * Update journal entry
     */
    async updateJournalEntry(id, entryData) {
        return await API.put(`/journal/${id}`, entryData);
    },

    /**
     * Delete journal entry
     */
    async deleteJournalEntry(id) {
        return await API.delete(`/journal/${id}`);
    }
};

window.JournalAPI = JournalAPI;
