const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const {
  MartialStateRegister,
  deleteMinistersById,
  getDataStateName,
  EditStateName,
} = require("../../controller/obesoloteMaterial/StateMatrialController.js");
const router = Router();
router.post(
  "/MartialStateRegister",
  Auth,
  MartialStateRegister
);
router.get(
  "/getDataStateName",
  getDataStateName
);
router.get("/deleteMinistersById/:id",Auth, deleteMinistersById);
router.post("/EditStateName",Auth, EditStateName);



module.exports = router;
