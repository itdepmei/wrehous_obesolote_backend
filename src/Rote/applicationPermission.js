const { Router } = require("express");
const {Auth} = require("../middleware/auth.js");
const {
  getDataApplicationPermission,
} = require("../controller/applictionPrmission.js");
const router = Router();
router.get("/getDataApplicationPermission", Auth, getDataApplicationPermission);

module.exports = router;
