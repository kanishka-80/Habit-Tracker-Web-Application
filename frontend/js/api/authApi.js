/**
 * ==========================================================
 * authApi.js
 * Authentication API Service
 * ==========================================================
 */

const AuthAPI = {

    /**
     * Register User
     */
    async register(userData) {
        const res = await API.post("/auth/register", userData);
        if (res.success && res.accessToken) {
            localStorage.setItem("ht_token", res.accessToken);
        }
        return res;
    },

    /**
     * Login User (Email or Phone + Password)
     */
    async login(payload, password) {
        let body = {};
        if (typeof payload === 'object') {
            body = payload;
        } else if (payload.includes('@')) {
            body = { email: payload, password };
        } else {
            body = { phone: payload, password };
        }
        const res = await API.post("/auth/login", body);
        if (res.success && res.accessToken) {
            localStorage.setItem("ht_token", res.accessToken);
        }
        return res;
    },

    /**
     * Send OTP to Phone or Email
     */
    async sendOtp(identifier, purpose = "general") {
        const isEmail = identifier.includes('@');
        const body = isEmail ? { email: identifier, purpose } : { phone: identifier, purpose };
        return await API.post("/auth/send-otp", body);
    },

    /**
     * Login User via OTP
     */
    async loginWithOtp(identifier, otp) {
        const isEmail = identifier.includes('@');
        const body = isEmail ? { email: identifier, otp } : { phone: identifier, otp };
        const res = await API.post("/auth/login-otp", body);
        if (res.success && res.accessToken) {
            localStorage.setItem("ht_token", res.accessToken);
        }
        return res;
    },

    /**
     * Logout User
     */
    async logout() {
        const res = await API.post("/auth/logout");
        localStorage.removeItem("ht_token");
        return res;
    },

    /**
     * Get Logged-in User
     */
    async getMe() {
        return await API.get("/auth/me");
    },

    /**
     * Refresh Access Token
     */
    async refreshToken() {
        return await API.post("/auth/refresh");
    },

    /**
     * Forgot Password
     */
    async forgotPassword(email) {
        return await API.post("/auth/forgot-password", {
            email
        });
    },

    /**
     * Reset Password
     */
    async resetPassword(token, password) {
        return await API.post("/auth/reset-password", {
            token,
            password
        });
    },

    /**
     * Change Password
     */
    async changePassword(currentPassword, newPassword) {
        return await API.put("/auth/change-password", {
            currentPassword,
            newPassword
        });
    }

};

window.AuthAPI = AuthAPI;