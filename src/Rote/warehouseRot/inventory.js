const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const {
  inventoryRegister,
  inventoryGetData,
  inventoryGetDataById,
  SearchInventory,
  inventoryEdit,
  deleteInventoryById,
  materialMovements,
} = require("../../controller/waerhouseController/inventoryRegister.js");
const router = Router();
router.post("/inventoryRegister", Auth, inventoryRegister);
router.get("/inventoryGetData", Auth, inventoryGetData);
router.get("/inventoryGetDataById/:id", Auth, inventoryGetDataById);
router.get("/materialMovements/:id", Auth, materialMovements);
router.get("/SearchInventory", Auth, SearchInventory);
router.post("/inventoryEdit", Auth, inventoryEdit);
router.get("/deleteInventoryById/:id", Auth, deleteInventoryById);
module.exports = router;
