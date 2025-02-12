const { Router } = require("express");
const {Auth} = require("../middleware/auth.js");
const {
  unitRegister,
  getDataUnitsById,
  getAllDataUnits,
  editUnit,
  deleteUnitById,
} = require("../controller/obesoloteMaterial/MeasuringUnitController.js");
const router = Router();
router.post("/unitRegister", unitRegister);
router.get("/getDataUnitsById/:id", getDataUnitsById);
router.get("/getAllDataUnits", getAllDataUnits);
router.post("/editUnit",Auth, editUnit);
router.get("/deleteUnitById/:id",Auth, deleteUnitById);
module.exports = router;
