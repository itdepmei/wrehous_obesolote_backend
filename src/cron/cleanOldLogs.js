const fs = require("fs").promises;
const path = require("path");
const moment = require("moment");

/**
 * Delete log files older than 1 year
 */
async function cleanOldLogs() {
  try {
    const logsDir = path.join(__dirname, "..", "logs");
    const logFiles = ["error.log", "info.log"];

    // Ensure logs directory exists
    try {
      await fs.access(logsDir);
    } catch (err) {
      console.error("Logs directory does not exist.");
      return;
    }

    for (const logFile of logFiles) {
      const logPath = path.join(logsDir, logFile);
      try {
        const stats = await fs.stat(logPath);
        const fileAge = moment(stats.mtime);
        const oneYearAgo = moment().subtract(1, "year");
        if (fileAge.isBefore(oneYearAgo)) {
          console.log(`Deleting old log file: ${logFile}`);
          await fs.unlink(logPath);
          // Create a new empty log file
          await fs.writeFile(logPath, "");
          console.log(`Created new ${logFile} file`);
        }
      } catch (error) {
        if (error.code === "ENOENT") {
          console.warn(`Log file not found: ${logFile}`);
        } else {
          console.error(`Error processing ${logFile}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error cleaning old logs:", error);
  }
}

// Export the function to be used in the main cron scheduler
module.exports = cleanOldLogs;
