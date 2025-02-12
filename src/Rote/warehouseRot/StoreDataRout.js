const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const {
  storeDataRegister,
  GetDataStoreData,
  storGetDataById,
  SearchStoreData,
  StorDataEdit,
  deleteStorDataById,
  inventoryGetDataByCode,
  dataStoreRegisterAsForLoop,
} = require("../../controller/waerhouseController/storeDataController.js");
const router = Router();
router.post("/storeDataRegister", Auth, storeDataRegister);
router.post("/insertMultipleData", Auth, dataStoreRegisterAsForLoop);
router.get("/getDataStoreData", Auth, GetDataStoreData);
router.get("/storGetDataById/:id", Auth, storGetDataById);
router.get("/SearchStoreData", Auth, SearchStoreData);
router.post("/StorDataEdit", Auth, StorDataEdit);
router.get("/deleteStorDataById/:id", Auth, deleteStorDataById);
router.get("/inventoryGetDataByCode", Auth, inventoryGetDataByCode);

module.exports = router;
