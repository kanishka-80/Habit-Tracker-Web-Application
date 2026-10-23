/**
 * ==========================================================
 * rewardApi.js
 * Rewards API Service
 * ==========================================================
 */

const RewardAPI = {
    /**
     * Get all unlocked rewards
     */
    async getRewards() {
        return await API.get("/rewards");
    },

    /**
     * Get unseen reward count
     */
    async getUnseenCount() {
        return await API.get("/rewards/unseen-count");
    },

    /**
     * Get rewards by habit ID
     */
    async getRewardsByHabit(habitId) {
        return await API.get(`/rewards/habit/${habitId}`);
    },

    /**
     * Mark a reward as seen
     */
    async markRewardSeen(rewardId) {
        return await API.patch(`/rewards/${rewardId}/seen`);
    }
};

window.RewardAPI = RewardAPI;
