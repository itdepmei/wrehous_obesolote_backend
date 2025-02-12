const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const { getLog, getLogByEntityId } = require("../../controller/obesoloteMaterial/LogController.js");
const authorization = require("../../middleware/Authorization.js");
const router = Router();
router.get("/getLog", Auth, authorization, getLog);
router.get("/getLogByEntityId", Auth,getLogByEntityId);
module.exports = router;
