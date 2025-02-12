const express = require("express");
const cors = require("cors");
const { config } = require("dotenv");
const { errorHandler } = require("./src/middleware/errorHandel.js");
const {
  removeOldData,
  removeOldDataLog,
} = require("./src/controller/RemoveDateController.js");
const cron = require("node-cron");
const { mainCoection } = require("./src/Config/db.js");
const helmet = require("helmet");
const prometheus = require("prom-client");
const expressStatusMonitor = require("express-status-monitor");
const sentry = require("@sentry/node");
const Logger = require("./src/middleware/Logger");
const removeActiveSession = require("./src/utils/removeCtiveSession.js");
const {
  handleInventoryNotifications,
} = require("./src/controller/waerhouseController/inventoryRegister.js");
const { handelQuintityNotifction } = require("./src/controller/waerhouseController/storeDataController.js");
config();
const App = express();
App.use(cors());
// Initialize Sentry
// sentry.init({ dsn: 'http://localhost:3000' });

// Set up Prometheus metrics
const register = new prometheus.Registry();
prometheus.collectDefaultMetrics({ register });
const httpRequestsDuration = new prometheus.Histogram({
  name: "http_requests_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
});
register.registerMetric(httpRequestsDuration);

// Middleware setup

App.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-auth-token ,x-auth-filename",
    "authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, GET, PATCH, DELETE, OPTIONS",
    "PUT"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});
// Allow images from specific sources
App.use(
  helmet.contentSecurityPolicy({
    directives: {
      //  "default-src" used as fallback for any undeclared directives
      "default-src": ["'self'"],
      // I have stripe_set up
      "script-src": ["'self'", "'unsafe-inline'", "js.stripe.com"],
      "style-src": ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      "frame-src": ["'self'", "js.stripe.com"],
      "font-src": [
        "'self'",
        "fonts.googleapis.com",
        "fonts.gstatic.com",
        "res.cloudinary.com/",
      ],
      "img-src": ["'self'", "data:", "https://res.cloudinary.com"],
    },
    reportOnly: true,
  })
);
App.use(express.json({ limit: "50mb" }));
// Custom error-handling middleware for payload size errors
App.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    Logger.error(
      "Request payload is too large. Please reduce the size of your request."
    );
    return res.status(413).json({
      message:
        "Request payload is too large. Please reduce the size of your request.",
    });
  }
  next(err); // Pass to the default error handler if not a payload error
});
App.use(express.static("src/upload_Data/"));
App.use(expressStatusMonitor());
// Monitoring HTTP request duration
App.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000; // In seconds
    httpRequestsDuration
      .labels(req.method, req.originalUrl, res.statusCode)
      .observe(duration);
  });
  next();
});
mainCoection();
// Register your routes
App.use("/api", require("./src/Rote/ObesoloteMaterialR/MinistriesR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/EntitiesR.js"));
App.use("/api", require("./src/Rote/UserManagementR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/mainClassAndSubClassR.js"));
App.use("/api", require("./src/Rote/unitMeasuringR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/ObsoleteMartialsR.js"));
App.use("/api", require("./src/Rote/RoleR.js"));
App.use("/api", require("./src/Rote/permission.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/logR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/BookR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/MatrialState.js"));
App.use("/api", require("./src/Rote/BannerR.js"));
App.use("/api", require("./src/Rote/AboutR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/governorateR.js"));
App.use("/api", require("./src/Rote/reportR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/jopTitleR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/MessageDeniedR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/RemoveDate.js"));
App.use("/api", require("./src/Rote/NotificaltionR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/UserGuidR.js"));
App.use("/api", require("./src/Rote/ObesoloteMaterialR/getTemplet.js"));
App.use("/api/warehouse", require("./src/Rote/warehouseRot/inventory.js"));
App.use("/api/warehouse", require("./src/Rote/warehouseRot/StoreDataRout.js"));
App.use("/api/warehouse", require("./src/Rote/warehouseRot/reportR.js"));

App.use("/api/warehouse", require("./src/Rote/warehouseRot/warehouseR.js"));
App.use("/api/warehouse", require("./src/Rote/warehouseRot/Factories.js"));
App.use("/api/warehouse", require("./src/Rote/warehouseRot/LabR.js"));
App.use("/api/warehouse", require("./src/Rote/warehouseRot/notifctionWarehouse.js"));
App.use("/api", require("./src/Rote/applicationPermission.js"));
// Add other routes here...
// Metrics endpoint for Prometheus
App.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
// Cron jobs for removing old data
cron.schedule("* * * 1 *", async () => {
  console.log("Running the job to remove old data...");
  await removeOldData();
});
cron.schedule("* * * 1 *", async () => {
  console.log("Running the job to remove old logs...");
  await removeOldDataLog();
});
// handel active session

// Cron job to run daily at midnight (you can adjust the time)
// cron.schedule("0 0 * * *", async () => {
//   removeActiveSession()
// });

// setInterval(async () => {
//   console.log("Running the job to remove old logs...");
//   await removeActiveSession();
// }, 2 * 60 * 1000); // 5 minutes in milliseconds
//  handel notifction alarm
cron.schedule("0 0 * * *", async () => {
  console.log("Running inventory notification check...");
  await handleInventoryNotifications();
});
// setInterval(async () => {
//   console.log("Running the job to remove old logs...");
//   await handleInventoryNotifications();
// }, 20000); 
// General route

// minutes in milliseconds
//  handel notifction alarm
cron.schedule("0 0 * * *", async () => {
  console.log("Running inventory notification check...");
  await handleInventoryNotifications();
});
cron.schedule("0 0 * * *", async () => {
  console.log("Running inventory notification check...");
  await handelQuintityNotifction();
});
// setInterval(async () => {
//   console.log("Running the job to remove old logs...");
//   await removeOldDataLog();();
// }, 20000);
// setInterval(async () => {
//   console.log("Running the job to remove old logs...");
//   await handleInventoryNotifications();
// }, 20000);
// setInterval(async () => {
//   console.log("Running the job to remove old logs...");
//   await handelQuintityNotifction();
// }, 20000);
// General route
App.get("/", (req, res) => {
  res.send("<h1>Welcome to my API</h1>");
});
// Error handling middleware
App.use(errorHandler);
// 404 handler
App.all("*", (req, res) => {
  // Logger.error("Rout Not found");
  return res.status(404).json({ message: "Route not found" });
});
const server = require("http").createServer(App);
const port = process.env.PORT || 4000;
server.listen(port, () => {
  Logger.info(`Server is running on http://127.0.0.1:${port}`);
});
