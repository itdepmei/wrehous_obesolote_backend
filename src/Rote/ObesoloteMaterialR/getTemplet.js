const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const {getTemplateFileExcel} = require("../../controller/obesoloteMaterial/getTempletFileController.js");
const router = Router();
router.get(
  "/getTemplateFileExcel",
//   Auth,
  getTemplateFileExcel
);



module.exports = router;
