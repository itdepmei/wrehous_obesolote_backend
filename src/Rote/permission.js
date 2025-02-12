const { Router } = require("express");
const {Auth} = require("../middleware/auth.js");
const {
  setPermission,
  getAllPermissions,
  getPermissionsById,
} = require("../controller/PermassionController.js");

const router = Router();
router.post("/setPermission", Auth, setPermission);
router.get("/getAllPermissions",Auth, getAllPermissions);
router.get("/getPermissionsById",Auth, getPermissionsById);
module.exports = router;
