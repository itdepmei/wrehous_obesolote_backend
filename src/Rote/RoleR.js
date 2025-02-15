const { Router } = require("express");
const {Auth} = require("../middleware/auth.js");
const {
  setRole,
  getRole,
  setPermissionAndRoleToEachGroup,
  getDataRoleIdAndPermissionIduseGrouID,
  getDataRoleIdAndPermission,
  setPermissionAndRole,
} = require("../controller/RoleController.js");
const router = Router();
router.post("/setRole",Auth, setRole);
router.get("/getRole",Auth, getRole);
router.post(
  "/setPermissionAndRoleToEachGroup",
  Auth,
  setPermissionAndRoleToEachGroup
);
router.get(
  "/getDataRoleIdAndPermissionIduseGrouID/:id",
  Auth,
  getDataRoleIdAndPermissionIduseGrouID
);
router.get("/getDataRoleIdAndPermission", Auth, getDataRoleIdAndPermission);
router.post("/setPermissionAndRole", Auth, setPermissionAndRole);

module.exports = router;