/**
 * ==========================================================
 * profileApi.js
 * Profile & Settings API Service
 * ==========================================================
 */

const ProfileAPI = {
    /**
     * Get user profile
     */
    async getProfile() {
        return await API.get("/profile");
    },

    /**
     * Update profile details (name, bio, timezone, theme)
     */
    async updateProfile(profileData) {
        return await API.put("/profile", profileData);
    },

    /**
     * Update avatar URL
     */
    async updateAvatar(avatarData) {
        return await API.put("/profile/avatar", avatarData);
    },

    /**
     * Update notification settings
     */
    async updateNotifications(settingsData) {
        return await API.put("/profile/notifications", settingsData);
    },

    /**
     * Deactivate user account
     */
    async deactivateAccount() {
        return await API.delete("/profile");
    }
};

window.ProfileAPI = ProfileAPI;
