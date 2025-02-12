const { Router } = require("express");
const { BannerRegister, getDataBanner, deleteBannerById, EditBannerName } = require("../controller/BannerController.js");
const {Auth} = require("../middleware/auth.js");
const router = Router();
router.post(
  "/BannerRegister",
  Auth,
  BannerRegister
);
router.get(
  "/getDataBanner",
  getDataBanner
);
router.get(
  "/deleteBannerById/:id",
  deleteBannerById
);
router.post(
  "/EditBannerName",
  EditBannerName
);
module.exports = router;
