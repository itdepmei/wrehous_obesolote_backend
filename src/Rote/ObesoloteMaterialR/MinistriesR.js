const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const {
  MinistriesRegister,
  getDataMinistries,
  EditMinistries,
  deleteMinistersById,
} = require("../../controller/obesoloteMaterial/MainistriesController.js");
const router = Router();
router.post(
  "/MinistriesRegister",
  Auth,
  MinistriesRegister
);
router.get("/getDataMinistries", getDataMinistries);
router.post("/EditMinistries",Auth, EditMinistries);
router.get("/deleteMinistersById",Auth, deleteMinistersById);

module.exports = router;
