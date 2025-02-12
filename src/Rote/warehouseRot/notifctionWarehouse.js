const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const { getNotificationWarehouse } = require("../../controller/waerhouseController/wareHouseNotifction.js");
const router = Router();
router.get("/getNotificationWarehouse/:id", Auth, getNotificationWarehouse);
module.exports = router;