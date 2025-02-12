const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const {
  governorateRegister,
  getDataGovernorate,
  deleteGovernorateById,
  editGovernorate,
} = require("../../controller/obesoloteMaterial/governorateController.js");
const router = Router();
router.post("/governorateRegister", Auth, governorateRegister);
router.get("/getDataGovernorate", getDataGovernorate);
router.get("/deleteGovernorateById/:id", Auth, deleteGovernorateById);
router.post("/editGovernorate", Auth, editGovernorate);

module.exports = router;
