// const cron = require("node-cron");
// const cleanOldLogs = require("./cron/cleanOldLogs");

// // Schedule log cleanup - run at midnight every day
// cron.schedule("0 0 * * *", async () => {
//   console.log("Running log cleanup job");
//   await cleanOldLogs();
// });

// // Schedule existing jobs
// // Add your existing cron schedules here for other jobs
// module.exports = {
//   initCronJobs: () => {
//     console.log("Cron jobs initialized");
//     // Schedule deleteZeroQuantityItems
//   },
// };
