const { Router } = require("express");
const {Auth} = require("../middleware/auth.js");
const { getNotification } = require("../controller/NotifctionController.js");
const {
  deleteNotificationById,
  EditNotificationById,
} = require("../utils/createNotifction.js");
const authorization = require("../middleware/Authorization.js");
const router = Router();
router.get("/getNotification", Auth, authorization, getNotification);
router.get("/deleteNotificationById", Auth, authorization, deleteNotificationById);
router.post("/EditNotificationById", Auth, EditNotificationById);
module.exports = router;
