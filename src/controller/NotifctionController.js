const { connect } = require("../Config/db");
const { fetchNotifications } = require("../utils/createNotifction");
const pusher = require("../utils/pusherINfo");
const getNotification = async (req, res) => {
  try {
    const rows = await fetchNotifications(req.params.id, 2);
    if (rows.length === 0) {
      return res.status(404).json({ message: "لاتوجد بيانات حالية" });
    }
    res.status(200).json({ response: rows });
  } catch (error) {
    res.status(500).json({ message: "An error occurred", error: error.message });
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
  getNotification,
};
