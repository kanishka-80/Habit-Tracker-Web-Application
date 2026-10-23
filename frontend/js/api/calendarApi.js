/**
 * ==========================================================
 * calendarApi.js
 * Calendar API Service
 * ==========================================================
 */

const CalendarAPI = {
    /**
     * Fetch all logs and study tasks needed for calendar display
     */
    async getCalendarData() {
        const [habitsRes, studyRes] = await Promise.all([
            HabitAPI.getHabits(),
            StudyAPI.getStudySessions()
        ]);

        const habits = habitsRes.success ? habitsRes.data : [];
        const studySessions = studyRes.success ? studyRes.data : [];

        return {
            success: true,
            habits,
            studySessions
        };
    }
};

window.CalendarAPI = CalendarAPI;
