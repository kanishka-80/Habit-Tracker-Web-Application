/**
 * ==========================================================
 * habitApi.js
 * Habit API Service
 * ==========================================================
 */

const HabitAPI = {
    /**
     * Get habits with optional query filters
     */
    async getHabits(params = {}) {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/habits?${query}` : "/habits";
        return await API.get(endpoint);
    },

    /**
     * Get single habit by ID
     */
    async getHabitById(id) {
        return await API.get(`/habits/${id}`);
    },

    /**
     * Create habit
     */
    async createHabit(habitData) {
        return await API.post("/habits", habitData);
    },

    /**
     * Update habit
     */
    async updateHabit(id, habitData) {
        return await API.put(`/habits/${id}`, habitData);
    },

    /**
     * Delete habit
     */
    async deleteHabit(id) {
        return await API.delete(`/habits/${id}`);
    },

    /**
     * Log habit completion for a date
     */
    async logCompletion(id, date, completed = true, note = "") {
        return await API.post(`/habits/${id}/log`, { date, completed, note });
    },

    /**
     * Remove habit completion log for a date
     */
    async removeCompletion(id, date) {
        return await API.delete(`/habits/${id}/log/${date}`);
    },

    /**
     * Get habit streak details
     */
    async getStreak(id) {
        return await API.get(`/habits/${id}/streak`);
    }
};

window.HabitAPI = HabitAPI;
