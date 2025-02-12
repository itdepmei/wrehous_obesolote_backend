const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const {
  bookRegister,
  getDataBookByEntityId,
  deleteBookById,
  getDataBook,
  bookEdit,
  stagnantMaterialsEditBooked,
  getDataStagnantMaterialsBookedPa,
  ApproveBooked,
  getDataBookedFalse,
  cancelRequest,
  getDataStagnantMaterialsBookedPByEntityBookedOrBuyTheMaterial,
  Contacted,
  getDataArchiveById,
  UploadBookForEntityBuy,
  getDataBookByEntityIdSendBooking,
  approvedAdminSendRequestBook,
  approvedAdminToUploadBook,
} = require("../../controller/obesoloteMaterial/BookMatetrialController.js");
const upload = require("../../middleware/upload.js");
const authorization = require("../../middleware/Authorization.js");
const router = Router();
router.post("/bookRegister", Auth, bookRegister);
router.get("/getDataBookByEntityId", Auth, getDataBookByEntityId);
router.get("/getDataBook", Auth, authorization, getDataBook);
router.get("/deleteBookById/:id", Auth, deleteBookById);
router.get("/cancelRequest/:id", Auth, cancelRequest);
router.post("/bookEdit", Auth, bookEdit);
router.post(
  "/stagnantMaterialsEditBooked",
  Auth,
  upload.fields([{ name: "file1" }, { name: "file2", maxCount: 1 }]),
  stagnantMaterialsEditBooked
);
router.get(
  "/getDataStagnantMaterialsBookedPa",
  Auth,
  getDataStagnantMaterialsBookedPa
);
router.get(
  "/getDataBookedFalse/:id",
  Auth,
  getDataBookedFalse
);
router.get(
  "/getDataStagnantMaterialsBookedPByEntityBookedOrBuyTheMaterial",
  Auth,
  getDataStagnantMaterialsBookedPByEntityBookedOrBuyTheMaterial
);
router.post("/ApproveBooked", Auth, ApproveBooked);
router.post("/Contacted", Auth, Contacted);
router.get("/getDataArchiveById/:id", Auth, getDataArchiveById);
router.post(
  "/UploadBookForEntityBuy",
  Auth,
  upload.single("file"),
  UploadBookForEntityBuy
);
router.get(
  "/getDataBookByEntityIdSendBooking",
  Auth,authorization,
  getDataBookByEntityIdSendBooking
);
router.post(
  "/approvedAdminSendRequestBook",
  Auth,
  approvedAdminSendRequestBook
);
router.post(
  "/approvedAdminToUploadBook",
  Auth,
  approvedAdminToUploadBook
);

module.exports = router;
