/**
 * ==========================================================
 * dashboardApi.js
 * Dashboard API Service
 * ==========================================================
 */

const DashboardAPI = {

    /**
     * Get Dashboard Data
     */
    async getDashboard() {

        return await API.get("/dashboard");

    }

};

window.DashboardAPI = DashboardAPI;