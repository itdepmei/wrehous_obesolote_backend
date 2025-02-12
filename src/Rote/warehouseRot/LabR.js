const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const { LabRegister, getLabData , laboratoriesEdit , deleteLaboratoriesById, getWarehouseAndUserData, getLabDataByEntity_id } = require("../../controller/waerhouseController/LabController.js");
const router = Router();
router.post("/LabRegister", Auth, LabRegister);
router.get("/getLabData", Auth, getLabData);
router.post("/laboratoriesEdit", Auth, laboratoriesEdit);
router.get("/deleteLaboratoriesById/:id", Auth, deleteLaboratoriesById);
router.get('/getWarehouseAndUserData',Auth,getWarehouseAndUserData)
router.get('/getLabDataByEntity_id',Auth,getLabDataByEntity_id)

module.exports = router;
