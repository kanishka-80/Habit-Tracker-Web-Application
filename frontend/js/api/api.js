/**
 * ==========================================================
 * api.js
 * Central API Client for Habit
 * ==========================================================
 */

const API_BASE_URL = window.API_HOST || (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:")
        ? "http://127.0.0.1:5000/api"
        : "/api"
);
const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Request timeout helper
 */
function timeout(ms) {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), ms);
    });
}

/**
 * Main Request Function
 */
async function request(endpoint, options = {}) {
    const token = localStorage.getItem("ht_token");
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
        credentials: "include",
        headers,
        ...options
    };

    try {
        const response = await Promise.race([
            fetch(`${API_BASE_URL}${endpoint}`, config),
            timeout(REQUEST_TIMEOUT)
        ]);

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.error ||
                "Something went wrong"
            );
        }

        return data;

    } catch (error) {

        console.error("API Error:", error);

        let msg = error.message || "Network Error";
        if (msg === "Failed to fetch" || error.name === "TypeError") {
            msg = "Backend server is not running or unreachable. Please verify server status.";
        }

        return {
            success: false,
            message: msg
        };

    }
}

/**
 * GET
 */
async function get(endpoint) {
    return request(endpoint, {
        method: "GET"
    });
}

/**
 * POST
 */
async function post(endpoint, body = {}) {
    return request(endpoint, {
        method: "POST",
        body: JSON.stringify(body)
    });
}

/**
 * PUT
 */
async function put(endpoint, body = {}) {
    return request(endpoint, {
        method: "PUT",
        body: JSON.stringify(body)
    });
}

/**
 * PATCH
 */
async function patch(endpoint, body = {}) {
    return request(endpoint, {
        method: "PATCH",
        body: JSON.stringify(body)
    });
}

/**
 * DELETE
 */
async function remove(endpoint) {
    return request(endpoint, {
        method: "DELETE"
    });
}

/**
 * Export
 */
const API = {
    get,
    post,
    put,
    patch,
    delete: remove
};

window.API = API;