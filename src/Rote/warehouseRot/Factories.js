const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const {
  FactoriesRegister,
  getFactoriesData,
  factoriesEdit,
  deleteFactoriesById,
  getFactoryAndUserData,
} = require("../../controller/waerhouseController/FactoriesController.js");
const router = Router();
router.post("/FactoriesRegister", Auth, FactoriesRegister);
router.get("/getFactoriesData", Auth, getFactoriesData);
router.post("/factoriesEdit", Auth, factoriesEdit);
router.get("/deleteFactoriesById/:id", Auth, deleteFactoriesById);
router.get("/getFactoryAndUserData", Auth, getFactoryAndUserData);

module.exports = router;
