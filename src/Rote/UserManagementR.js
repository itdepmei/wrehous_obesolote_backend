const { Router } = require("express");
const {
  registerUser,
  login,
  getDataUserManage,
  deleteById,
  userManagementEdit,
  getUserById,
  getDataUserManageByIdEntities,
  userEdit,
  ActiveAccount,
  getDataUserSearch,
  logout,
  refreshToken,
  getDataUserManageBIdEntityWithoutLimit,
} = require("../controller/UserMnagemantController.js");
const authorization = require("../middleware/Authorization.js");
const {Auth} = require("../middleware/auth.js");
const router = Router();
router.post("/registerUser", registerUser);
router.post("/Login", login);
router.get("/getDataUserManage", Auth, authorization, getDataUserManage);
router.get("/deleteDataUserManage/:id", Auth, deleteById);
router.post("/userManagementEdit", Auth, userManagementEdit);
router.get("/getUserById", Auth, getUserById);
router.get(
  "/getDataUserManageByIdEntities",
  Auth,
  authorization,
  getDataUserManageByIdEntities
);

router.post("/userEdit", Auth, userEdit);
router.post("/ActiveAccount", Auth, ActiveAccount);
router.get("/getDataUserSearch", Auth, getDataUserSearch);
router.post("/LogoutUser", logout);
router.post("/refreshToken", refreshToken);
router.get(
  "/getDataUserManageBIdEntityWithoutLimit/:id",
  // Auth,
  getDataUserManageBIdEntityWithoutLimit
);
module.exports = router;
