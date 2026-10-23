/**
 * ==========================================================
 * studyApi.js
 * Study Planner API Service
 * ==========================================================
 */

const StudyAPI = {
    /**
     * Get all study sessions for current user
     */
    async getStudySessions() {
        return await API.get("/study");
    },

    /**
     * Create study session
     */
    async createStudySession(sessionData) {
        return await API.post("/study", sessionData);
    },

    /**
     * Update study session
     */
    async updateStudySession(id, sessionData) {
        return await API.put(`/study/${id}`, sessionData);
    },

    /**
     * Delete study session
     */
    async deleteStudySession(id) {
        return await API.delete(`/study/${id}`);
    },

    /**
     * Toggle session completed state
     */
    async toggleComplete(id) {
        return await API.patch(`/study/${id}/complete`);
    }
};

window.StudyAPI = StudyAPI;
