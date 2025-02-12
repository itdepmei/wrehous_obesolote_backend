const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const {
  warehouseRegister,
  getWarehouseData,
  warehouseEdit,
  deleteWareHouseById,
  getWarehouseDataById,
  getWarehouseDataByEntity_id,
} = require("../../controller/waerhouseController/warehouse.js");
const router = Router();
router.post("/warehouseRegister", Auth, warehouseRegister);
router.get("/getWarehouseData", Auth, getWarehouseData);
router.post("/warehouseEdit", Auth, warehouseEdit);
router.get("/deleteWareHouseById/:id", Auth, deleteWareHouseById);
router.get("/getWarehouseDataById", Auth, getWarehouseDataById);
router.get("/getWarehouseDataByEntity_id", Auth, getWarehouseDataByEntity_id);

module.exports = router;
