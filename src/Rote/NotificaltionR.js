const { Router } = require("express");
const {Auth} = require("../middleware/auth.js");
const { getNotification } = require("../controller/NotifctionController.js");
const {
  deleteNotificationById,
  EditNotificationById,
} = require("../utils/createNotifction.js");
const router = Router();
router.get("/getNotification/:id", Auth, getNotification);
router.get("/deleteNotificationById", Auth, deleteNotificationById);
router.post("/EditNotificationById", Auth, EditNotificationById);
module.exports = router;
