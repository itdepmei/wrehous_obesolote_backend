const { Router } = require("express");
const {Auth} = require("../middleware/auth.js");
const {
  setPermission,
  getAllPermissions,
  getPermissionsById,
} = require("../controller/PermassionController.js");
const authorization = require("../middleware/Authorization.js");
const applicationAuth = require("../middleware/ApplicationAuth.js");

const router = Router();
router.post("/setPermission", Auth, setPermission);
router.get("/getAllPermissions",Auth,authorization,applicationAuth,  getAllPermissions);
router.get("/getPermissionsById",Auth, getPermissionsById);
module.exports = router;
