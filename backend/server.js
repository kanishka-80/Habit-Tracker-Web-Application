const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const path = require("path");

const config = require("./config/env");
const connectDB = require("./config/db");

// Connect to MongoDB
connectDB();

const app = express();

console.log("🔥 THIS IS MY SERVER");


app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        config.clientUrl,
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
      ].filter(Boolean);
      if (!origin || allowedOrigins.includes(origin) || config.env === "development") {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

if (config.env === "development") {
  app.use(morgan("dev"));
}

app.use((req, res, next) => {
  console.log("➡️", req.method, req.originalUrl);
  next();
});

// ---------- API Routes ----------
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/habits", require("./routes/habitRoutes"));
app.use("/api/journal", require("./routes/journalRoutes"));
app.use("/api/study", require("./routes/studyRoutes"));
app.use("/api/rewards", require("./routes/rewardRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/reminders", require("./routes/reminderRoutes"));

// ---------- Serve Frontend Static Files ----------
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

// For non-API routes, serve static pages or fallback to index.html
app.get("*", (req, res, next) => {
  if (req.originalUrl.startsWith("/api")) {
    return next();
  }

  let reqPath = req.path;
  if (reqPath === "/") {
    return res.sendFile(path.join(frontendPath, "index.html"));
  }

  if (!path.extname(reqPath)) {
    reqPath += ".html";
  }

  const targetFile = path.join(frontendPath, reqPath);
  res.sendFile(targetFile, (err) => {
    if (err) {
      res.sendFile(path.join(frontendPath, "index.html"));
    }
  });
});

// ---------- 404 Handler for Unmatched API Routes ----------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ---------- Global Error Handler ----------
app.use(require("./middlewares/errorMiddleware"));

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(
    `Server running in ${config.env} mode on port ${PORT}`
  );
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;
