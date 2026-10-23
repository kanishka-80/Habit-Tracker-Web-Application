/**
 * ==========================================================
 * analytics.api.js
 * Analytics API Service
 * ==========================================================
 */

const AnalyticsAPI = {

    /**
     * Get Weekly Analytics
     */
    async getWeekly() {
        return await API.get("/analytics/weekly");
    },

    /**
     * Get Monthly Analytics
     */
    async getMonthly() {
        return await API.get("/analytics/monthly");
    },

    /**
     * Get Yearly Analytics
     */
    async getYearly() {
        return await API.get("/analytics/yearly");
    },

    /**
     * Get Category Analytics
     */
    async getCategory() {
        return await API.get("/analytics/category");
    },

    /**
     * Get Success Rate
     */
    async getSuccessRate() {
        return await API.get("/analytics/success-rate");
    }

};

// Make globally available
window.AnalyticsAPI = AnalyticsAPI;