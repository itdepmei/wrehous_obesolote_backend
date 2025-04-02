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
const {Auth, refreshTokenHandler} = require("../middleware/auth.js");
const applicationAuth = require("../middleware/ApplicationAuth.js");
const router = Router();
router.post("/registerUser", registerUser);
router.post("/Login", login);
router.post("/refresh-token", refreshTokenHandler);
router.get("/getDataUserManage", Auth, authorization,applicationAuth, getDataUserManage);
router.get("/deleteDataUserManage/:id", Auth, deleteById);
router.post("/userManagementEdit", Auth, userManagementEdit);
router.get("/getUserById", Auth, getUserById);
router.get(
  "/getDataUserManageByIdEntities",
  Auth,
  authorization,
  applicationAuth,
  getDataUserManageByIdEntities
);
router.post("/userEdit", Auth, userEdit);
router.post("/ActiveAccount", Auth, ActiveAccount);
router.get("/getDataUserSearch", Auth, getDataUserSearch);
router.post("/LogoutUser", logout);
router.post("/refreshTokenHandler", refreshToken);
router.get(
  "/getDataUserManageBIdEntityWithoutLimit/:id",
  // Auth,
  getDataUserManageBIdEntityWithoutLimit
);
module.exports = router;
