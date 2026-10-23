/**
 * ==========================================================
 * habitApi.js
 * Habit API Service (Backend REST + LocalStorage Fallback)
 * ==========================================================
 */

const HabitAPI = {
    /**
     * Get habits with optional query filters
     */
    async getHabits(params = {}) {
        try {
            const query = new URLSearchParams(params).toString();
            const endpoint = query ? `/habits?${query}` : "/habits";
            const res = await API.get(endpoint);
            if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
                if (typeof HabitStore !== "undefined") {
                    HabitStore.saveHabits(res.data);
                }
                return res;
            }
        } catch (e) {
            console.warn("[HabitAPI] Backend getHabits failed, using local fallback:", e);
        }
        const fallback = typeof HabitStore !== "undefined" ? HabitStore.loadHabits() : [];
        return { success: true, data: fallback };
    },

    /**
     * Get single habit by ID
     */
    async getHabitById(id) {
        try {
            const res = await API.get(`/habits/${id}`);
            if (res && res.success && res.data) return res;
        } catch (e) {}
        const fallback = typeof HabitStore !== "undefined"
            ? HabitStore.loadHabits().find((h) => (h.id || h._id) === id)
            : null;
        return fallback ? { success: true, data: fallback } : { success: false, message: "Habit not found" };
    },

    /**
     * Create habit
     */
    async createHabit(habitData) {
        const title = habitData.title || habitData.name || "Untitled Habit";
        const habitId = habitData.id || `h_${Date.now().toString(36)}`;
        const localHabit = {
            id: habitId,
            _id: habitId,
            title,
            name: title,
            currentStreak: 0,
            longestStreak: 0,
            completedToday: false,
            ...habitData,
        };

        // Save locally first
        if (typeof HabitStore !== "undefined") {
            HabitStore.saveHabit(localHabit);
        }

        try {
            const res = await API.post("/habits", habitData);
            if (res && res.success && res.data) {
                if (typeof HabitStore !== "undefined") {
                    HabitStore.saveHabit(res.data);
                }
                return res;
            }
        } catch (e) {
            console.warn("[HabitAPI] Backend createHabit failed, habit saved locally:", e);
        }

        return { success: true, data: localHabit };
    },

    /**
     * Update habit
     */
    async updateHabit(id, habitData) {
        if (typeof HabitStore !== "undefined") {
            HabitStore.saveHabit({ id, ...habitData });
        }
        try {
            const res = await API.put(`/habits/${id}`, habitData);
            if (res && res.success) return res;
        } catch (e) {}
        return { success: true, data: { id, ...habitData } };
    },

    /**
     * Delete habit
     */
    async deleteHabit(id) {
        if (typeof HabitStore !== "undefined") {
            HabitStore.deleteHabit(id);
        }
        try {
            const res = await API.delete(`/habits/${id}`);
            if (res && res.success) return res;
        } catch (e) {}
        return { success: true };
    },

    /**
     * Log habit completion for a date
     */
    async logCompletion(id, date, completed = true, note = "") {
        if (typeof HabitStore !== "undefined") {
            const habits = HabitStore.loadHabits().map((h) => {
                if ((h.id || h._id) === id) {
                    const current = Number(h.currentStreak) || 0;
                    const longest = Number(h.longestStreak) || 0;
                    const nextCurrent = completed ? current + 1 : Math.max(0, current - 1);
                    return {
                        ...h,
                        completedToday: completed,
                        currentStreak: nextCurrent,
                        longestStreak: Math.max(longest, nextCurrent),
                    };
                }
                return h;
            });
            HabitStore.saveHabits(habits);
        }
        try {
            return await API.post(`/habits/${id}/log`, { date, completed, note });
        } catch (e) {
            return { success: true };
        }
    },

    /**
     * Remove habit completion log for a date
     */
    async removeCompletion(id, date) {
        return this.logCompletion(id, date, false);
    },

    /**
     * Get habit streak details
     */
    async getStreak(id) {
        try {
            const res = await API.get(`/habits/${id}/streak`);
            if (res && res.success) return res;
        } catch (e) {}
        const habit = typeof HabitStore !== "undefined"
            ? HabitStore.loadHabits().find((h) => (h.id || h._id) === id)
            : null;
        return {
            success: true,
            streak: habit?.currentStreak || 0,
            longestStreak: habit?.longestStreak || 0,
        };
    }
};

window.HabitAPI = HabitAPI;
