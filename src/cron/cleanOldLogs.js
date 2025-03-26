const fs = require("fs").promises;
const path = require("path");
const moment = require("moment");
const logger = require("../middleware/Logger");

/**
 * Delete log files older than 12 months based on their filename (YYYY-MM).
 */
async function cleanOldLogs() {
  try {
    const logsDir = path.join(__dirname, "..", "logs");

    // Ensure logs directory exists
    try {
      await fs.access(logsDir);
    } catch (err) {
      logger.error("Logs directory does not exist.");
      return;
    }

    // Read all log files in the logs directory
    const files = await fs.readdir(logsDir);

    // Get the current date and calculate the date 12 months ago
    const twelveMonthsAgo = moment().subtract(12, "months");

    for (const file of files) {
      // Match log files formatted as "info-YYYY-MM.log" or "error-YYYY-MM.log"
      const match = file.match(/^(info|error)-(\d{4})-(\d{2})\.log$/);
      if (match) {
        const fileYear = parseInt(match[2], 10);
        const fileMonth = parseInt(match[3], 10);

        // Create a moment object for the log file's date
        const fileDate = moment({ year: fileYear, month: fileMonth - 1 }); // Month is 0-based in moment.js

        // Check if the file is older than 12 months
        if (fileDate.isBefore(twelveMonthsAgo, "month")) {
          const logPath = path.join(logsDir, file);
          try {
            logger.info(`Deleting old log file: ${file}`);
            console.log(`Deleting old log file: ${file}`);
            await fs.unlink(logPath);
          } catch (error) {
            logger.error(`Error deleting ${file}: ${error.message}`);
          }
        }
      }
    }
  } catch (error) {
    logger.error(`Error cleaning old logs: ${error.message}`);
  }
}

// Export the function to be used in the main cron scheduler
module.exports = cleanOldLogs;
