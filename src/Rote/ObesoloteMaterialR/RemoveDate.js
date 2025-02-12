
const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const { RemoveRegister, getDataRemove, deleteDateRemoveById, EditRemoveDateName } = require("../../controller/RemoveDateController.js");
const router = Router();
router.post("/RemoveRegister", Auth,RemoveRegister);
router.get("/getDataRemove", getDataRemove);
router.get("/deleteDateRemoveById/:id", deleteDateRemoveById);
router.post("/EditRemoveDateName", EditRemoveDateName);
module.exports = router;
