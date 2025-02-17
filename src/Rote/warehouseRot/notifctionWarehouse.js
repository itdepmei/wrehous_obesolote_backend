const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const { getNotificationWarehouse } = require("../../controller/waerhouseController/wareHouseNotifction.js");
const authorization = require("../../middleware/Authorization.js");
const router = Router();
router.get("/getNotificationWarehouse", Auth, authorization, getNotificationWarehouse);
module.exports = router;