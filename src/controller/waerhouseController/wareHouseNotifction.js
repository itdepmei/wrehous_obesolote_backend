const { connect } = require("../../config/db");
const { fetchNotifications } = require("../../utils/createNotifction");
const pusher = require("../../utils/pusherINfo");
/**
 * Retrieves warehouse notifications for a specific entity.
 *
 * This function fetches notifications associated with a given
 * entity ID from the database. If no notifications are found,
 * it sends a 404 response with a relevant message. On success,
 * it returns the list of notifications as a JSON response.
 *
 * @param {Object} req - The HTTP request object, containing
 *                       parameters such as entity ID.
 * @param {Object} res - The HTTP response object used to send
 *                       the response back to the client.
 */

const getNotificationWarehouse = async (req, res) => {
  try {
    const rows = await fetchNotifications(req.query.entity_id, 2);
    if (rows.length === 0) {
      return res.status(404).json({ message: "لاتوجد بيانات حالية" });
    }
    res.status(200).json({ response: rows });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};

// Endpoint to send a notification
const expirationDateNotification = (req, res) => {
  const { message } = req.body;
  // Trigger the event
  pusher.trigger("your-channel", "your-event", {
    message,
  });

  res.status(200).send("Notification sent");
};

module.exports = {
  getNotificationWarehouse,
};
