const { Router } = require("express");
const {Auth} = require("../middleware/auth.js");
const {
  getDataCountOfMaterial,
  exportData,
  getDataCountOfEntity,
  getDataINforamaitionReport,
} = require("../controller/obesoloteMaterial/reportController.js");
const router = Router();
router.get("/getDataCountOfMaterial", getDataCountOfMaterial);
router.post(
  "/exportData",
  (req, res, next) => {
    req.setTimeout(300000); // Set timeout to 5 minutes (300,000 milliseconds)
    next();
  },
  Auth,
  exportData
);
router.get("/getDataCountOfEntity/:id", Auth, getDataCountOfEntity);
router.get("/getDataINforamaitionReport", Auth, getDataINforamaitionReport);

module.exports = router;
