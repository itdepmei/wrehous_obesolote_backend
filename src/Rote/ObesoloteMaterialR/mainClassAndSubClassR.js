const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const {
  MainClassRegister,
  getDataMainClass,
  subClassRegister,
  getDataSubClass,
  deleteByIdSubClass,
  deleteByIdMainClass,
  getDataMainClassById,
  editMainClass,
  editSubClass,
  getDataSubClassById,
} = require("../../controller/obesoloteMaterial/MainClassAndSubClass.js");
const upload = require("../../middleware/upload.js");
const router = Router();
router.post(
  "/MainClassRegister",
  Auth,
  upload.single("image"),
  MainClassRegister
);
router.post("/subClassRegister", Auth,subClassRegister);
router.get("/getDataMainClass", getDataMainClass);
router.get("/getDataMainClassById/:id", getDataMainClassById);
router.get("/getDataSubClass", getDataSubClass);
router.get("/getDataSubClassById/:id", getDataSubClassById);
router.get("/deleteByIdMainClass/:id",Auth, deleteByIdMainClass);
router.get("/deleteByIdSubClass/:id",Auth, deleteByIdSubClass);
router.get("/deleteByIdSubClass/:id",Auth, deleteByIdSubClass);
router.post("/editMainClass",upload.single("image"),Auth, editMainClass);
router.post("/editSubClass",Auth, editSubClass);
module.exports = router;
