const cron = require("node-cron");
const { connect } = require("../Config/db");
const createLogEntry = require("../utils/createLog");
// Schedule the task to run every hour
const scheduleDeleteZeroQuantityItems = () => {
  // '0 * * * *' means: run at minute 0 of every hour
  cron.schedule("0 * * * *", async () => {
    console.log("Running delete zero quantity items check...");
    let connection;
    try {
      const pool = await connect();
      connection = await pool.getConnection();
      // Get all items with zero quantity
      const [zeroQuantityItems] = await connection.execute(
        "SELECT * FROM stagnant_materials WHERE Quantity = 0"
      );
      if (zeroQuantityItems.length > 0) {
        await connection.beginTransaction();
        for (const item of zeroQuantityItems) {
          try {
            // Delete the item
            await connection.execute(
              "DELETE FROM stagnant_materials WHERE stagnant_id = ?",
              [item.stagnant_id]
            );

            // Create log entry
            const logText = `تم حذف المنتج تلقائياً بسبب نفاد الكمية`;
            await createLogEntry(
              connection,
              2, // Delete operation type
              null, // System operation, no user
              item.Entities_id,
              logText,
              1
            );
          } catch (itemError) {
            console.error(
              `Error processing item ${item.stagnant_id}:`,
              itemError
            );
            // Continue with other items even if one fails
          }
        }

        await connection.commit();
        console.log(
          `Successfully deleted ${zeroQuantityItems.length} items with zero quantity`
        );
      }
    } catch (error) {
      console.error("Error in delete zero quantity cron job:", error);
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error("Error rolling back:", rollbackError);
        }
      }
    } finally {
      if (connection) {
        try {
          await connection.release();
        } catch (releaseError) {
          console.error("Error releasing connection:", releaseError);
        }
      }
    }
  });
};
const handleInventoryNotifications = async () => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      // Fetch inventory data from the database
      const query = `
        SELECT 
          i.id, 
          sto.name_of_material, 
          i.expiry_date, 
          i.created_at,
          i.material_id ,
          i.entity_id,
          i.user_id,
          TIMESTAMPDIFF(DAY, NOW(), i.expiry_date) AS days_to_expiry,
          TIMESTAMPDIFF(MONTH, i.created_at, NOW()) AS months_since_creation
        FROM inventory i
      LEFT JOIN store_data sto ON i.material_id = sto.id
        WHERE i.expiry_date IS NOT NULL
      `;
      const [rows] = await connection.execute(query);
      // Filter items based on date-related criteria
      const notifications = rows.filter(
        (item) =>
          item.days_to_expiry <= 6 || // Items expiring within 3 days
          item.months_since_creation >= 6 // Items created 3+ months ago
      );

      for (const item of notifications) {
        // Skip the item if it's already expired
        if (item.days_to_expiry <= 0) {
          console.log(
            `Skipping inventory ID: ${item.id} as it has already expired.`
          );
          continue;
        }
        // Construct the notification message based on the condition
        let message = "";
        if (item.days_to_expiry <= 6) {
          message = `المادة ${item.name_of_material} ستنتهي صلاحيتها خلال ${item.days_to_expiry} يوم.`;
        } else if (item.months_since_creation >= 6) {
          message = `المادة ${item.name_of_material} مضى على تسجيلها أكثر من 3 أشهر.`;
        }

        // Insert notification into the database
        const url = `material-movement?material_id=${item.material_id}`;
        await insertNotification(
          item.user_id,
          "صلاحية المادة",
          message,
          "error",
          url,
          item.entity_id,
          null,
          1
        );

        // Log the notification
        const logInfo = `تنبيه: المادة ${item.name_of_material} تحقق أحد معايير الإشعار.`;
        await createLogEntry(
          connection,
          12, // Log type ID (adjust as needed)
          item.user_id,
          item.entity_id,
          logInfo,
          2
        );

        // Trigger a Pusher event to notify clients
        const eventData = {
          name: "send_alarm_notification",
          message,
          entityId: item.entity_id,
          user_id: item.user_id,
          category_id: 1,
        };
        await pusher.trigger("poll", "vote", eventData);

        console.log(`Notification sent for inventory ID: ${item.id}`);
      }

      console.log("Inventory notifications handled successfully.");
    } finally {
      // Ensure the connection is released
      if (connection) {
        connection.release();
      }
    }
  } catch (error) {
    console.error(
      "Error handling inventory notifications:",
      error.message,
      error.stack
    );
  }
};
const handelQuintityNotifction = async () => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    console.log("hello");
    try {
      // Fetch inventory data from the database
      const query = `
        SELECT * FROM store_data 
      `;
      const [rows] = await connection.execute(query);
      // Filter items where the balance equals the minimum stock level
      const notifications = rows.filter(
        (item) => item.balance >= item.minimum_stock_level
      );
      for (const item of notifications) {
        // Construct the notification message
        const message = `المادة ${item.name_of_material} وصلت إلى الحد الأدنى للمخزون (${item.minimum_stock_level}).`;
        // Insert notification into the database
        const url = `material-movement?material_id=${item.id}`;
        await insertNotification(
          item.user_id,
          "تنبيه المخزون",
          message,
          "warning",
          url,
          item.entity_id,
          null,
          1
        );

        // Log the event
        const logInfo = `تحذير: المادة ${item.name_of_material} وصلت إلى الحد الأدنى للمخزون.`;
        await createLogEntry(
          connection,
          12, // Log type ID (adjust as needed)
          item.user_id,
          item.entity_id,
          logInfo,
          2
        );

        // Trigger a Pusher event to notify clients
        const eventData = {
          name: "send_alarm_notification",
          message,
          entityId: item.entity_id,
          user_id: item.user_id,
          category_id: 1,
        };
        await pusher.trigger("poll", "vote", eventData);

        console.log(`Notification sent for inventory ID: ${item.id}`);
      }

      console.log("Inventory notifications handled successfully.");
    } finally {
      // Ensure the connection is released
      if (connection) {
        connection.release();
      }
    }
  } catch (error) {
    console.error(
      "Error handling inventory notifications:",
      error.message,
      error.stack
    );
  }
};

module.exports = {
  scheduleDeleteZeroQuantityItems,
  handleInventoryNotifications,
  handelQuintityNotifction,
};
