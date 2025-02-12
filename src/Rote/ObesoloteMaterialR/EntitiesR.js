const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const {
  EntitiesRegister,
  getDataEntities,
  editEntities,
  deleteEntitiesById,
  getDataEntitiesById
} = require("../../controller/obesoloteMaterial/EntitisController.js");
const router = Router();
router.post("/EntitiesRegister",Auth, EntitiesRegister);
router.get("/getDataEntities", getDataEntities);
router.get("/getDataEntitiesById/:id", getDataEntitiesById);
router.post("/editEntities", editEntities);
router.get("/deleteEntitiesById/:id",deleteEntitiesById)
module.exports = router;
