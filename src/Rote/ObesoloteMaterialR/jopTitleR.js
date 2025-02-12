const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js")
const {
  jopTitleRegister,
  getDataJobTitle,
  editJobTitle,
  deleteJobTitleById,
} = require("../../controller/obesoloteMaterial/jobTitleController.js");
const router = Router();
router.post("/jopTitleRegister", Auth, jopTitleRegister);
router.get("/getDataJobTitle", Auth, getDataJobTitle);
router.post("/editJobTitle", Auth, editJobTitle);
router.get("/deleteJobTitleById/:id", Auth, deleteJobTitleById);
module.exports = router;
