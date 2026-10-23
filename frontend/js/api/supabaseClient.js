/**
 * ==========================================================
 * supabaseClient.js
 * Supabase Client & Authentication Layer — Habit Tracker
 * ==========================================================
 */

const SUPABASE_URL =
  (typeof import !== "undefined" &&
    typeof import.meta !== "undefined" &&
    (import.meta?.env?.VITE_SUPABASE_URL || import.meta?.env?.NEXT_PUBLIC_SUPABASE_URL)) ||
  window.NEXT_PUBLIC_SUPABASE_URL ||
  window.VITE_SUPABASE_URL ||
  "https://fkvqcnqpcppamghcqtzl.supabase.co";

const SUPABASE_ANON_KEY =
  (typeof import !== "undefined" &&
    typeof import.meta !== "undefined" &&
    (import.meta?.env?.VITE_SUPABASE_ANON_KEY || import.meta?.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) ||
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  window.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_7_cqRKPVS1tBgx5Mdrq6Yg_JHtXZ0g5";

// Initialize Supabase Client
let supabaseInstance = null;
if (window.supabase && typeof window.supabase.createClient === "function") {
  supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

window.supabaseClient = supabaseInstance;

/**
 * Helper to get clean user object from Supabase user
 */
function formatSupabaseUser(user) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    _id: user.id,
    email: user.email || "",
    phone: user.phone || meta.phone || "",
    name: meta.name || (user.email ? user.email.split("@")[0] : "Student"),
    createdAt: user.created_at || new Date().toISOString(),
  };
}

/**
 * ==========================================================
 * SupabaseAuthAPI — Complete Auth Provider for the Frontend
 * ==========================================================
 */
const SupabaseAuthAPI = {
  /**
   * Register a new user with Supabase Auth
   */
  async register(userData) {
    if (!supabaseInstance) {
      return { success: false, message: "Supabase client not initialized." };
    }

    try {
      const email = (userData.email || "").trim();
      const password = userData.password;
      const name = (userData.name || "").trim() || "Student";
      const phone = (userData.phone || "").trim();

      const { data, error } = await supabaseInstance.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
          },
        },
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data && data.user) {
        const formattedUser = formatSupabaseUser(data.user);
        window.currentUser = formattedUser;
        localStorage.setItem("ht_session", JSON.stringify(formattedUser));

        if (data.session) {
          localStorage.setItem("ht_token", data.session.access_token);
        } else {
          // If Supabase has email confirmation enabled
          localStorage.setItem("ht_token", "sb_" + data.user.id);
        }

        return {
          success: true,
          message: data.session
            ? "Account created successfully!"
            : "Account created! If email confirmation is enabled, please verify your email.",
          accessToken: data.session ? data.session.access_token : "sb_" + data.user.id,
          data: formattedUser,
        };
      }

      return { success: false, message: "Registration failed." };
    } catch (err) {
      console.error("[SupabaseAuth] Register error:", err);
      return { success: false, message: err.message || "Registration failed." };
    }
  },

  /**
   * Login with Email and Password
   */
  async login(payload, password) {
    if (!supabaseInstance) {
      return { success: false, message: "Supabase client not initialized." };
    }

    try {
      let email = "";
      if (typeof payload === "object") {
        email = payload.email || "";
        password = payload.password || password;
      } else {
        email = String(payload).trim();
      }

      if (!email.includes("@")) {
        // Fallback or warning if phone was entered
        return {
          success: false,
          message: "Please enter your email address to login with Supabase.",
        };
      }

      const { data, error } = await supabaseInstance.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data && data.user) {
        const formattedUser = formatSupabaseUser(data.user);
        window.currentUser = formattedUser;
        localStorage.setItem("ht_session", JSON.stringify(formattedUser));
        if (data.session) {
          localStorage.setItem("ht_token", data.session.access_token);
        }
        return {
          success: true,
          message: "Login successful!",
          accessToken: data.session?.access_token || "sb_token",
          data: formattedUser,
        };
      }

      return { success: false, message: "Login failed." };
    } catch (err) {
      console.error("[SupabaseAuth] Login error:", err);
      return { success: false, message: err.message || "Login failed." };
    }
  },

  /**
   * Get Logged-in User Session
   */
  async getMe() {
    if (!supabaseInstance) {
      // Fallback to local session
      const saved = localStorage.getItem("ht_session");
      if (saved) {
        const user = JSON.parse(saved);
        window.currentUser = user;
        return { success: true, data: user };
      }
      return { success: false, message: "No active session." };
    }

    try {
      const { data: { user }, error } = await supabaseInstance.auth.getUser();

      if (error || !user) {
        // Try getting session from storage
        const { data: { session } } = await supabaseInstance.auth.getSession();
        if (session && session.user) {
          const formatted = formatSupabaseUser(session.user);
          window.currentUser = formatted;
          localStorage.setItem("ht_session", JSON.stringify(formatted));
          return { success: true, data: formatted };
        }

        // If local storage has session
        const saved = localStorage.getItem("ht_session");
        if (saved) {
          const u = JSON.parse(saved);
          window.currentUser = u;
          return { success: true, data: u };
        }

        return { success: false, message: "No active session." };
      }

      const formattedUser = formatSupabaseUser(user);
      window.currentUser = formattedUser;
      localStorage.setItem("ht_session", JSON.stringify(formattedUser));
      return { success: true, data: formattedUser };
    } catch (err) {
      console.warn("[SupabaseAuth] getMe error:", err);
      const saved = localStorage.getItem("ht_session");
      if (saved) {
        const u = JSON.parse(saved);
        window.currentUser = u;
        return { success: true, data: u };
      }
      return { success: false, message: "Failed to fetch user session." };
    }
  },

  /**
   * Sign Out
   */
  async logout() {
    try {
      if (supabaseInstance) {
        await supabaseInstance.auth.signOut();
      }
    } catch (e) {
      console.warn("[SupabaseAuth] signOut error:", e);
    }
    localStorage.removeItem("ht_token");
    localStorage.removeItem("ht_session");
    window.currentUser = null;
    return { success: true, message: "Logged out." };
  },

  /**
   * Send OTP / Magic Link
   */
  async sendOtp(identifier, purpose = "login") {
    if (!supabaseInstance) return { success: false, message: "Client not ready." };
    if (identifier.includes("@")) {
      const { error } = await supabaseInstance.auth.signInWithOtp({ email: identifier });
      if (error) return { success: false, message: error.message };
      return { success: true, message: "Magic link / OTP sent to your email." };
    } else {
      return { success: true, message: "Demo OTP sent. Use 123456." };
    }
  },

  async loginWithOtp(identifier, otp) {
    if (otp === "123456") {
      const demoUser = {
        id: "u_demo_" + Date.now().toString(36),
        name: "Student",
        email: identifier.includes("@") ? identifier : "student@example.com",
        phone: identifier.includes("@") ? "" : identifier,
      };
      window.currentUser = demoUser;
      localStorage.setItem("ht_token", "sb_demo_token");
      localStorage.setItem("ht_session", JSON.stringify(demoUser));
      return { success: true, accessToken: "sb_demo_token", data: demoUser };
    }
    return { success: false, message: "Invalid OTP code. Use 123456 for demo." };
  },

  async forgotPassword(email) {
    if (!supabaseInstance) return { success: false, message: "Client not ready." };
    const { error } = await supabaseInstance.auth.resetPasswordForEmail(email);
    if (error) return { success: false, message: error.message };
    return { success: true, message: "Password reset link sent to your email." };
  },

  async resetPassword(token, password) {
    if (!supabaseInstance) return { success: false, message: "Client not ready." };
    const { error } = await supabaseInstance.auth.updateUser({ password });
    if (error) return { success: false, message: error.message };
    return { success: true, message: "Password updated successfully." };
  },

  async changePassword(currentPassword, newPassword) {
    if (!supabaseInstance) return { success: false, message: "Client not ready." };
    const { error } = await supabaseInstance.auth.updateUser({ password: newPassword });
    if (error) return { success: false, message: error.message };
    return { success: true, message: "Password updated successfully." };
  },

  async refreshToken() {
    return { success: true };
  },
};

// Bind to window.AuthAPI and window.SupabaseAuthAPI so every page automatically uses Supabase for authentication!
window.SupabaseAuthAPI = SupabaseAuthAPI;
window.AuthAPI = SupabaseAuthAPI;

console.info("[SupabaseAuth] Connected to Supabase at:", SUPABASE_URL);
