const { Router } = require("express");
const {Auth} = require("../middleware/auth.js");
const {
  getDataApplicationPermission,
  getApplicationPermissionById,
} = require("../controller/applictionPrmission.js");
const router = Router();
router.get("/getDataApplicationPermission", Auth, getDataApplicationPermission);
router.get("/getApplicationPermissionById", Auth, getApplicationPermissionById);
module.exports = router;
