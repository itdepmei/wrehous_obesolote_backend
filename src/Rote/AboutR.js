const { Router } = require("express");
const {Auth} = require("../middleware/auth.js");
const {aboutSystemAdd,getDataAbout , editAboutSystem,deleteAboutById} = require("../controller/aboutSystemController.js");
const router = Router();
router.post(
  "/aboutSystemAdd",
  Auth,
  aboutSystemAdd
);
router.get(
  "/getDataAbout",
  getDataAbout
);
router.post(
  "/editAboutSystem",
  editAboutSystem
);
router.get(
  "/deleteAboutById/:id",
  Auth,
  deleteAboutById
);


module.exports = router;
