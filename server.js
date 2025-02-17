const express = require("express");
const cors = require("cors");
const { config } = require("dotenv");
const helmet = require("helmet");
const prometheus = require("prom-client");
const expressStatusMonitor = require("express-status-monitor");
const cron = require("node-cron");
const rateLimit = require("express-rate-limit");
const xss = require("xss-clean");
const hpp = require("hpp");
const timeout = require("connect-timeout");
// Internal imports
const { errorHandler } = require("./src/middleware/errorHandel.js");
const Logger = require("./src/middleware/Logger");
const { mainCoection } = require("./src/Config/db.js");
const {
  removeOldData,
  removeOldDataLog,
} = require("./src/controller/RemoveDateController.js");

const {
  scheduleDeleteZeroQuantityItems,
  handleInventoryNotifications,
  handelQuintityNotifction,
} = require("./src/cron/deleteZeroQuantityItems");
const {
  scheduleSessionUpdates,
  scheduleLogsCleanup,
} = require("./src/cron/managemantUserSession.js");
const cleanOldLogs = require("./src/cron/cleanOldLogs.js");
// Load environment variables
config();
// Initialize Express app
const App = express();
// Security Middleware Configuration
// Specific CSP Configuration
App.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      frameSrc: ["'self'", "js.stripe.com"],
      fontSrc: [
        "'self'",
        "fonts.googleapis.com",
        "fonts.gstatic.com",
        "res.cloudinary.com",
      ],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'"],
      upgradeInsecureRequests: [],
    },
  })
);

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 400, // limit each IP to 100 requests per windowMs
// });
// App.use('/api', limiter);

// Data Sanitization
App.use(xss()); // Against XSS
App.use(hpp()); // Prevent HTTP Parameter Pollution

// CORS Configuration
App.use(cors());
App.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-auth-token, x-auth-filename, authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS, PUT"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

// Prometheus Metrics Configuration
const register = new prometheus.Registry();
prometheus.collectDefaultMetrics({ register });
const httpRequestsDuration = new prometheus.Histogram({
  name: "http_requests_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
});
register.registerMetric(httpRequestsDuration);

// Request Timeout Configuration
const TIMEOUT_DURATION = "30s";
App.use(timeout(TIMEOUT_DURATION));
App.use((req, res, next) => {
  if (!req.timedout) next();
});
// Loading/Request Time Tracking Middleware
App.use((req, res, next) => {
  const startTime = Date.now();
  // Add _loading flag to request
  req._loading = true;
  // Override end to track response time
  const end = res.end;
  // res.end = function (chunk, encoding) {
  //   // Calculate request duration
  //   const responseTime = Date.now() - startTime;

  //   // Remove loading flag
  //   req._loading = false;

  //   // Log if request took too long
  //   if (responseTime > 5000) {
  //     // 5 seconds threshold
  //     Logger.warn(
  //       `Slow request detected: ${req.method} ${req.originalUrl} took ${responseTime}ms`
  //     );
  //   }
  //   // Add response time header
  //   res.set("X-Response-Time", `${responseTime}ms`);
  //   res.end = end;
  //   res.end(chunk, encoding);
  // };
  next();
});
// Timeout Error Handler
App.use((err, req, res, next) => {
  if (err.timeout) {
    Logger.error(`Request timeout: ${req.method} ${req.originalUrl}`);
    return res.status(503).json({
      status: "error",
      message: "Request timeout - The server is taking too long to respond",
      code: "REQUEST_TIMEOUT",
    });
  }
  next(err);
});

// Request Processing Middleware
App.use(express.json({ limit: "50mb" }));
App.use(express.static("src/upload_Data/"));
App.use(expressStatusMonitor());

// Request Duration Monitoring
App.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestsDuration
      .labels(req.method, req.originalUrl, res.statusCode)
      .observe(duration);
  });
  next();
});
// Payload Size Error Handler
App.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    Logger.error("Request payload too large");
    return res.status(413).json({
      message:
        "Request payload is too large. Please reduce the size of your request.",
    });
  }
  next(err);
});
// Database Connection
mainCoection();
// API Routes
// Obsolete Material Routes
App.use("/api", require("./src/Rote/ObesoloteMaterialR/MinistriesR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/EntitiesR.js"));
App.use(
  "/api",
  require("./src/Rote/ObesoloteMaterialR/mainClassAndSubClassR.js")
);
App.use("/api", require("./src/Rote/ObesoloteMaterialR/ObsoleteMartialsR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/logR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/BookR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/MatrialState.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/governorateR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/jopTitleR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/MessageDeniedR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/RemoveDate.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/UserGuidR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/getTemplet.js"));

// Warehouse Routes
App.use("/api/warehouse", [
  require("./src/Rote/warehouseRot/inventory.js"),
  require("./src/Rote/warehouseRot/StoreDataRout.js"),
  require("./src/Rote/warehouseRot/reportR.js"),
  require("./src/Rote/warehouseRot/warehouseR.js"),
  require("./src/Rote/warehouseRot/Factories.js"),
  require("./src/Rote/warehouseRot/LabR.js"),
  require("./src/Rote/warehouseRot/notifctionWarehouse.js"),
]);

// User Management Routes
App.use("/api", require("./src/Rote/UserManagementR.js"));
App.use("/api", require("./src/Rote/RoleR.js"));
App.use("/api", require("./src/Rote/permission.js"));
App.use("/api", require("./src/Rote/applicationPermission.js"));

// Other Routes
App.use("/api", require("./src/Rote/unitMeasuringR.js"));
App.use("/api", require("./src/Rote/BannerR.js"));
App.use("/api", require("./src/Rote/AboutR.js"));
App.use("/api", require("./src/Rote/reportR.js"));
App.use("/api", require("./src/Rote/NotificaltionR.js"));

// Scheduled Tasks
// Data Cleanup Jobs
cron.schedule("0 0 1 * *", async () => {
  Logger.info("Running scheduled data cleanup jobs");
  await Promise.all([removeOldData(), removeOldDataLog()]);
});
// Notification Jobs
cron.schedule("0 0 * * *", async () => {
  Logger.info("Running notification checks");
  await Promise.all([
    handleInventoryNotifications(),
    handelQuintityNotifction(),
  ]);
});
// Initialize cron jobs
scheduleDeleteZeroQuantityItems();
scheduleSessionUpdates();
scheduleLogsCleanup();
// Metrics Endpoint
App.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
// Welcome Route
App.get("/", (req, res) => {
  res.send("<h1>Welcome to the Warehouse Management API</h1>");
});
// Error Handlers
App.use(errorHandler);
// 404 Handler
App.all("*", (req, res) => {
  return res.status(404).json({ message: "Route not found" });
});
// Server Setup
const server = require("http").createServer(App);
const port = process.env.PORT || 4000;
server.listen(port, () => {
  Logger.info(`Server is running on http://127.0.0.1:${port}`);
});
