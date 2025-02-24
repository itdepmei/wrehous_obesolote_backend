const { connect } = require("../config/db");
const pusher = require("./pusherINfo");
async function insertNotification(
  user_id,
  title,
  message,
  type = "info",
  url = null,
  entity_id,
  event_id,
  nonfiction_category_id
) {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    const insertQuery = `
        INSERT INTO notifications (user_id, title, message, type, url, entity_id,event_id,category_id)
        VALUES (?, ?, ?, ?, ?, ?,?,?)
      `;
    const [result] = await connection.execute(insertQuery, [
      user_id,
      title,
      message,
      type,
      url,
      entity_id,
      event_id,
      nonfiction_category_id,
    ]);
    console.log("Notification inserted successfully with ID:", result.insertId);
    return result.insertId; // Return the ID of the newly inserted notification
  } catch (error) {
    console.error("Error inserting notification:", error.message);
    throw error; // Rethrow error for handling by calling function
  } 
}
// Function to get notifications by entity ID
const fetchNotifications = async (entityId, category_id) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    const query =
      "SELECT * FROM notifications WHERE entity_id=? AND category_id = ? ORDER BY id DESC";
    const [rows] = await connection.execute(query, [entityId, category_id]);
    return rows;
  } finally {
    connection.release();
  }
};
/**
 * Deletes a single notification by its ID.
 *
 * This function attempts to delete a notification from the database
 * using the provided notification ID from the request parameters.
 * It sends an appropriate HTTP response based on the outcome.
 *
 * @param {Object} req - The HTTP request object containing the ID parameter.
 * @param {Object} res - The HTTP response object to send the response.
 */

// Reusable function to delete notifications
const deleteNotificationFunction = async (identifier, isRead = null) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      let query;
      let params;
      console.log(isRead,identifier);
      
      if (isRead === null) {
        // Delete by notification ID
        query = "DELETE FROM notifications WHERE id = ?";
        params = [identifier];
      } else {
        console.log("dshfisdjfhsdhsdihfs");
        
        // Delete by entity ID and is_read status
        query = "DELETE FROM notifications WHERE entity_id = ? AND is_read = ?";
        params = [identifier, isRead];
      }
      const [response] = await connection.execute(query, params);
      return response.affectedRows > 0;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw new Error("Internal server error");
  }
};

// Delete notification by ID
const deleteNotificationByIdIsRead = async (req, res) => {
  try {
    console.log(`Deleting notification with ID: ${req.params.id}`);
    const isDeleted = await deleteNotificationFunction(req.params.id);

    if (isDeleted) {
      return res.status(200).json({ message: "تم الحذف بنجاح" });
    } else {
      return res.status(404).json({ message: "Item not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete all read notifications for a specific entity
const deleteNotificationById= async (req, res) => {
  try {
    const {isRead,id } = req.query;
    const isDeleted = await deleteNotificationFunction(id, isRead);

    if (isDeleted) {
      return res.status(200).json({ message: "تم حذف الإشعارات بنجاح" });
    } else {
      return res.status(404).json({ message: "لا توجد إشعارات للحذف" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Function to send a push notification
const EditNotificationById = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    // console.log(req.body);
    const { dataId } = req.body;
    if(dataId === undefined){
      return res.status(400).json({ message: "dataId is required" });
    }
    try {
      const updateNotificationQuery = `
        UPDATE notifications 
        SET is_read = true
        WHERE id = ?
      `;
      const [response] = await connection.execute(updateNotificationQuery, [
        dataId,
      ]);
      if (response.affectedRows > 0) {
        console.log("Notification updated successfully");
        return res
          .status(200)
          .json({ message: "Notification updated successfully" });
      } else {
        return res.status(404).json({ message: "Notification not found" });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
module.exports = {
  fetchNotifications,
  EditNotificationById,
  insertNotification,
  deleteNotificationById
};
