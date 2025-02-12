const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const upload = require("../../middleware/upload.js");
const { UserGuidInsert, getDataUserGuid, editUserGuid, deleteUserGuidById, EditAccessTOfile, getDataUserGuidIsShowGuid } = require("../../controller/UserGuid.js");
const router = Router();
router.post(
  "/UserGuidInsert",
  Auth,
  upload.single("fileName"),
  UserGuidInsert
)
router.get("/getDataUserGuid", getDataUserGuid);
router.get("/getDataUserGuidIsShowGuid", getDataUserGuidIsShowGuid);
router.post("/EditAccessTOfile", EditAccessTOfile);
router.get("/deleteUserGuidById/:id",Auth, deleteUserGuidById);
router.post("/editUserGuid",upload.single("image"),Auth, editUserGuid);
module.exports = router;