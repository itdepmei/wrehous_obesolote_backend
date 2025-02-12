"../controller/RequestDeniedControoler.js";
const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const {
  MessageDeniedRegister,
  getDataMessageById,
  deleteMessageById,
  editMessageDe,
  deleteRequestById,
} = require("../../controller/obesoloteMaterial/RequestDeniedControoler.js");
const router = Router();
router.post("/MessageDeniedRegister", Auth, MessageDeniedRegister);
router.get("/getDataMessageById/:id", Auth, getDataMessageById);
router.post("/editMessageDe", Auth, editMessageDe);
router.get("/deleteMessageById/:id", Auth, deleteMessageById);
router.get("/deleteRequestById/:id", Auth, deleteRequestById);
module.exports = router;
