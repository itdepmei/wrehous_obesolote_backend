const cron = require('node-cron');
const { connect } = require("../Config/db");

const scheduleSessionUpdates = async () => {
  const pool = await connect();
  // Run every 8 hours (at 0:00, 8:00, and 16:00)
  cron.schedule("0 */8 * * *", async () => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.execute(
        `UPDATE active_session_user
         SET is_active_session = FALSE
         WHERE TIMESTAMPDIFF(HOUR, last_active_at, NOW()) >= 8`
      );
      console.log("8-hour session update executed at:", new Date().toISOString());
    } catch (error) {
      console.error("Error during 8-hour session update:", error);
    } finally {
      if (connection) connection.release();
    }
  });
};

const scheduleLogsCleanup = async () => {
  const pool = await connect();

  // Run once a month to clean up logs older than 1 year
  cron.schedule("0 0 1 * *", async () => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Delete records older than 1 year from user_auth_logs
      await connection.execute(
        `DELETE FROM user_auth_logs 
         WHERE TIMESTAMPDIFF(YEAR, created_at, NOW()) >= 1`
      );
      // Delete records older than 1 year from error_logs
      await connection.execute(
        `DELETE FROM error_logs 
         WHERE TIMESTAMPDIFF(YEAR, created_at, NOW()) >= 1`
      );
      console.log("Cleaned up error_logs older than 1 year");

      await connection.commit();
      console.log("Yearly logs cleanup executed at:", new Date().toISOString());
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error during yearly logs cleanup:", error);
    } finally {
      if (connection) connection.release();
    }
  });
};
module.exports = {
  scheduleSessionUpdates,
  scheduleLogsCleanup
};