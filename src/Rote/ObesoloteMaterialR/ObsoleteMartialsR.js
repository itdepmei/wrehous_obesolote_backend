const { Router } = require("express");
const {Auth} = require("../../middleware/auth.js");
const {
  stagnantMaterialsRegister,
  getDataStagnantMaterials,
  deleteById,
  stagnantMaterialsEdit,
  getAllDataStagnantMaterials,
  getDataStagnantMaterialsSearch,
  getDataStagnantMaterialsPa,
  getDataStagnantMaterialAllByMainClassId,
  getDataStagnantMaterialAllByAndStagnantId,
  getDataStagnantMaterialAllByMainClassIdCurrentMonth,
  getDataStagnantMaterialsApproveAdmin,
  getDataStagnantMaterialsApproveSuperAdminRoot,
  ApproveAdminMaterial,
  ApproveSuperAdminMaterial,
  getDataStagnantMaterialsByUserId,
  stagnantMaterialsRegisterAsForLoop
} = require("../../controller/obesoloteMaterial/ObsoleteMatrialsController.js");
const upload = require("../../middleware/upload.js");
const authorization = require("../../middleware/Authorization.js");
const applicationAuth = require("../../middleware/ApplicationAuth.js");
const router = Router();
router.post(
  "/stagnantMartialsRegister",
  Auth,
  upload.array("files", 4),
  stagnantMaterialsRegister
);
router.get(
  "/getDataStagnantMaterials/:id",
  // Auth,
  // authorization,
  getDataStagnantMaterials
);
router.get(
  "/getAllDataStagnantMaterials",
  // Auth,
  // authorization,
  getAllDataStagnantMaterials
);
router.get("/deleteProjectById/:id", Auth, deleteById);
router.post(
  "/stagnantMaterialsEdit",
  Auth,
  upload.array("files", 4),
  stagnantMaterialsEdit
);
router.get("/getDataStagnantMaterialsSearch", getDataStagnantMaterialsSearch);
router.get(
  "/getDataStagnantMaterialsPa",
  Auth,
  authorization,
  applicationAuth,
  getDataStagnantMaterialsPa
);
router.get(
  "/getDataStagnantMaterialAllByMainClassId",
  // Auth,
  getDataStagnantMaterialAllByMainClassId
);
router.get(
  "/getDataStagnantMaterialAllByAndStagnantId/:id",
  // Auth,
  getDataStagnantMaterialAllByAndStagnantId
);
router.get(
  "/getDataStagnantMaterialAllByMainClassIdCurrentMonth",
  // Auth,
  getDataStagnantMaterialAllByMainClassIdCurrentMonth
);
router.get(
  "/getDataStagnantMaterialsApproveAdmin",
  Auth,
  authorization,
  applicationAuth,
  getDataStagnantMaterialsApproveAdmin
);
router.get(
  "/getDataStagnantMaterialsByUserId",
  Auth,
  authorization,
  // applicationAuth,
  getDataStagnantMaterialsByUserId
);
router.get(
  "/getDataStagnantMaterialsApproveSuperAdminRoot",
  Auth,
  authorization,
  applicationAuth,
  getDataStagnantMaterialsApproveSuperAdminRoot
);
router.post("/ApproveAdminMaterial", Auth, ApproveAdminMaterial);
router.post("/ApproveSuperAdminMaterial", Auth, ApproveSuperAdminMaterial);
router.post("/insertMultipleData", Auth,upload.any(), stagnantMaterialsRegisterAsForLoop);



module.exports = router;
