import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    open: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        analytics: resolve(__dirname, 'analytics.html'),
        calendar: resolve(__dirname, 'calendar.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        habits: resolve(__dirname, 'habits.html'),
        journal: resolve(__dirname, 'journal.html'),
        login: resolve(__dirname, 'login.html'),
        profile: resolve(__dirname, 'profile.html'),
        register: resolve(__dirname, 'register.html'),
        rewards: resolve(__dirname, 'rewards.html'),
        settings: resolve(__dirname, 'settings.html'),
        studyPlanner: resolve(__dirname, 'study-planner.html'),
      },
    },
  },
});
