const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const { exportData,getDataINforamaitionReport ,getDataCountDataOfEntity } = require("../../controller/waerhouseController/reportWarhoseController.js");
const router = Router();
router.post("/exportDataWarehouse", Auth, exportData);
router.get("/getDataINforamaitionReportWarehouse", Auth, getDataINforamaitionReport);
router.get("/getDataCountDataOfEntityWarehouse", Auth, getDataCountDataOfEntity);
module.exports = router;
