const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { connect, getConnection } = require("../config/db");
const {
  deleteItem,
  getInformation,
} = require("../query/userMangeController-db");
const generateToken = require("../utils/genrateToken");
const createLogEntry = require("../utils/createLog");
const {
  checkEmailExists,
  insertRolePermissions,
  insertActiveUser,
  insertApplicationPermissions,
  getUserByEmail,
  generateTokens,
  manageUserSession,
  logUserAction,
  getUserDataById,
  setSecureCookies,
  getActiveSession,
  updateSession,
  logLogout,
  clearCookies,
  updateAccountStatus,
  handleSuccessResponse,
  handleFailureResponse,
  checkUserExists,
  hashPassword,
  updateUserData,
  updatePermissions,
  fetchTotalRows,
  fetchUserData,
  buildSearchConditions,
  getTotalCount,
  getDataWithPagination,
  verifyRefreshToken,
  checkActiveSession,
  getUserData,
  insertUser,
} = require("../model/userModel");
const {
  validateInput,
  validateInputActive,
  validateInputEdit,
} = require("../validation/userValidtion");
const { getPagination } = require("../utils/pagination");
const { verifyToken } = require("../middleware/auth");
const logger = require("../middleware/Logger");

const registerUser = async (req, res) => {
  const {
    password,
    name,
    phone,
    ministries_id,
    entities_id,
    email,
    roleId,
    address_id,
    jopTitle,
    is_active,
  } = req.body;
  try {
    validateInput(req.body);
    const trimmedPhoneNumber = phone.trim();
    const trimmedUserName = name.trim();
    const trimmedEmail = email.trim();
    const hashedPassword = await hashPassword(password);
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      await checkEmailExists(connection, trimmedEmail);
      const userData = {
        hashedPassword,
        trimmedUserName,
        trimmedPhoneNumber,
        trimmedEmail,
        roleId,
        jopTitle,
        address_id,
        ministries_id,
        entities_id,
      };
      const insertUserResponse = await insertUser(connection, userData);
      const userId = insertUserResponse.insertId;
      await insertRolePermissions(connection, roleId, userId);
      await insertActiveUser(connection, userId);
      await insertApplicationPermissions(connection, userId, is_active);
      res.status(201).json({
        message: "تم تسجيل المستخدم بنجاح",
        insertUserResponse,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error("Error registering user:", error);
    console.error("Error registering user:", error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Internal server error" });
  }
};

const login = async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ status: "error", message: "Email and password are required" });
    }
    const trimmedEmail = email.trim();
    const pool = await connect();
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const user = await getUserByEmail(connection, trimmedEmail);
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "البريد الالكتروني أو كلمة السر غير صحيحة",
      });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "البريد الالكتروني أو كلمة السر غير صحيحة",
      });
    }
    // check if user is active
    const checkActiveUser = `
    SELECT * FROM active_user
    WHERE user_id = ? AND is_active = 1`;
    const [activeUserRows] = await connection.execute(checkActiveUser, [
      user.id,
    ]);
    console.log("activeUserRows", activeUserRows);
    if (!activeUserRows || activeUserRows.length === 0) {
      await connection.rollback();
      logger.error(
        "Error logging in:",
        "User is not active in the active_user table"
      );
      return res.status(401).json({
        status: "error",
        message: "الحساب غير مفعل. يرجى الاتصال بالمسؤول",
      });
    }

    const currentSession = await getActiveSession(connection, user.id);
    console.log(currentSession);
    if (currentSession === null) {
      // التحقق من null أو undefined
      await connection.rollback();
      logger.error(
        "Error logging in:"+"User is not active in the active_session_user table" + currentSession + user.user_name+user.id + user.email
      )
      return res.status(401).json({
        status: "error",
        message: "الحساب نشط حاليا يرجى تسجيل الخروج من الجلسة النشطة",
      });
    }
    const { accessToken, refreshToken, refreshTokenExp } = generateTokens(user);
    // handel user active session
    await manageUserSession(
      connection,
      user.id,
      accessToken,
      refreshToken,
      refreshTokenExp,
      req
    );

    await logUserAction(connection, user.id, req);
    const getUserByIdQuery = `
      SELECT * FROM user_id_application__permission_id
      WHERE user_id = ?`;

    // Set query timeout to 5 seconds
    const [applicationpermissionResponse] = await Promise.race([
      connection.execute(getUserByIdQuery, [user.id]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Query timeout")), 5000)
      ),
    ]);

    const userResponse = await getUserDataById(connection, user.id);
    await connection.commit();
    setSecureCookies(res, accessToken, refreshToken, refreshTokenExp);

    return res.header("authorization", `Bearer ${accessToken}`).json({
      user: userResponse,
      accessToken: `Bearer ${accessToken}`,
      refreshToken,
      message: "Login successful",
      applicationpermissionResponse,
    });
  } catch (error) {
    if (connection && connection.connection._closing !== true)
      await connection.rollback();
    console.error("Login error:", error);
    logger.error("Error logging in:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred during login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    if (connection) await connection.release();
  }
};

// logout function handle

const logout = async (req, res) => {
  let connection;
  try {
    console.log(req.body);
    const refreshToken =
      req.body.refreshToken ||
      req.cookies.refreshToken ||
      req.headers["x-refresh-token"];

    if (!refreshToken) {
      logger.error(
        "Error logging out:",
        "Refresh token is required for logout"
      );
      return res.status(400).json({
        status: "error",
        message: "Authentication token is required.",
      });
    }
    const pool = await connect();
    connection = await pool.getConnection();
    const payload = verifyToken(refreshToken);
    if (!payload || !payload._id) {
      logger.error("Error logging out:", "Invalid token payload");
      return res.status(401).json({
        status: "error",
        message: "Invalid token payload",
      });
    }
    await connection.beginTransaction();
    await getActiveSession(connection, payload._id, refreshToken);
    await updateSession(connection, payload._id, refreshToken);
    await logLogout(connection, payload._id, req.ip, req.headers["user-agent"]);
    await connection.commit();
    clearCookies(res);
    return res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    logger.error("Error logging out:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred during logout",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    if (connection) {
      try {
        await connection.release();
      } catch (releaseError) {
        console.error("Error releasing connection:", releaseError);
      }
    }
  }
};

const ActiveAccount = async (req, res) => {
  let { is_active, user_id, dataId } = req.body;
  try {
    // Step 1: Validate Input
    validateInputActive(is_active, user_id, dataId);
    // Step 2: Get Database Connection
    const connection = await getConnection();
    try {
      // Step 3: Update Account Status
      const response = await updateAccountStatus(
        connection,
        is_active,
        user_id,
        dataId
      );

      // Step 4: Handle Response
      if (response.affectedRows > 0) {
        return handleSuccessResponse(res, is_active, response);
      } else {
        return handleFailureResponse(res);
      }
    } finally {
      connection.release(); // Release connection back to the pool
    }
  } catch (error) {
    // Step 5: Log Error
    return res.status(500).json({ message: "Internal server error" });
  }
};
const getDataUserManage = async (req, res) => {
  let connection;
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    console.log("here user manage", req.query);
    connection = await getConnection();
    const totalRowsQuery = "SELECT COUNT(*) AS count FROM users_management";
    const totalItems = await fetchTotalRows(connection, totalRowsQuery);
    const totalPages = Math.ceil(totalItems / limit);

    const getDataUsersQuery = `
      SELECT 
        users_management.id AS user_id, 
        users_management.*, 
        entities.id AS entity_id, 
        entities.*, 
        job_title.job_name,
        job_title.id AS job_id,
        governorate.governorate_name,
        governorate.id AS address_id,
        ministries.id AS minister_id, 
        ministries.*, 
        roles.id AS roles_id, 
        roles.*,
        active_user.is_active,
        active_user.user_id AS active_user_id,
        active_user.id AS active_id
      FROM users_management
      LEFT JOIN entities ON users_management.entities_id = entities.id
      LEFT JOIN ministries ON users_management.ministres_id = ministries.id
      LEFT JOIN roles ON users_management.group_id = roles.id
      LEFT JOIN active_user ON users_management.id = active_user.user_id
      LEFT JOIN job_title ON users_management.job_title_id = job_title.id
      LEFT JOIN governorate ON users_management.address_id = governorate.id
      LIMIT ${limit} OFFSET ${offset};
    `;

    const rows = await fetchUserData(connection, getDataUsersQuery);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    res.status(200).json({
      response: rows,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    logger.error("Error fetching users:", error);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const getDataUserManageByIdEntities = async (req, res) => {
  let connection;
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    connection = await getConnection();

    const getTotalRowsQuery = `SELECT COUNT(*) AS count FROM users_management WHERE entities_id = ?`;
    const totalItems = await fetchTotalRows(connection, getTotalRowsQuery, [
      req.query.id,
    ]);
    const totalPages = Math.ceil(totalItems / limit);

    if (totalItems === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    const getDataUsersQuery = `
      SELECT 
        um.id AS user_id, um.*, 
        e.id AS entity_id, e.*, 
        m.id AS minister_id, m.*, 
        r.id AS role_id, r.*,
        active_user.is_active,
        active_user.user_id AS active_user_id,
        active_user.id AS active_id
      FROM users_management um
      LEFT JOIN entities e ON um.entities_id = e.id
      LEFT JOIN ministries m ON um.ministres_id = m.id
      LEFT JOIN roles r ON um.group_id = r.id
      LEFT JOIN active_user ON um.id = active_user.user_id
      LEFT JOIN job_title ON um.job_title_id = job_title.id
      LEFT JOIN governorate ON um.address_id = governorate.id
      WHERE um.entities_id = ?
      LIMIT ${limit} OFFSET ${offset};
    `;
    const rows = await fetchUserData(connection, getDataUsersQuery, [
      req.query.id,
    ]);
    res.status(200).json({
      response: rows,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    logger.error("Error fetching users management data:", error);
    console.error("Error fetching user management data:", error.message);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const getDataUserManageBIdEntityWithoutLimit = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    // Fetch paginated user management data
    const getDataUsersQuery = `
      SELECT* FROM users_management WHERE entities_id= ?
    `;
    const [rows] = await connection.execute(getDataUsersQuery, [req.params.id]);
    res.status(200).json({
      response: rows,
    });
  } catch (error) {
    logger.error("Error fetching users management data:", error);
    console.error("Error fetching user management data:", error.message);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    if (connection) connection.release(); // Ensure connection is released
  }
};
const getUserById = async (req, res) => {
  console.log("Fetching user data...");
  const user_id = req.user?._id;
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }
  let connection;
  try {
    connection = await getConnection();
    const getUserByIdQuery = `
      SELECT 
        u.id AS user_id, 
        u.user_name,
        u.phone_number, 
        u.email,
        u.create_At,
        e.id AS entity_id, 
        e.Entities_name, 
        m.id AS minister_id,
        g.governorate_name, 
        g.id AS address_id,
        m.ministries
      FROM users_management u
      LEFT JOIN entities e ON u.entities_id = e.id
      LEFT JOIN ministries m ON u.ministres_id = m.id
      LEFT JOIN governorate g ON u.address_id = g.id
      WHERE u.id = ?`;

    const [userData] = await connection.execute(getUserByIdQuery, [user_id]);

    if (!userData.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User data retrieved successfully",
      response: userData[0],
    });
  } catch (error) {
    logger.error("Error fetching user data:", error);
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    if (connection) await connection.end(); // Ensure connection is closed
    console.log("User data fetch process completed.");
  }
};

// edit information by company
const userManagementEdit = async (req, res) => {
  try {
    const validatedData = validateInputEdit(req.body);
    const connection = await getConnection();
    try {
      // Check if user exists
      await checkUserExists(connection, validatedData.dataId);
      // Check if email exists and doesn't belong to the current user
      await checkEmailExists(
        connection,
        validatedData.email,
        validatedData.dataId
      );
      // Hash password if provided
      if (validatedData.password && validatedData.password !== "") {
        validatedData.password = await hashPassword(validatedData.password);
      }
      // Update user data
      const response = await updateUserData(connection, validatedData);

      if (response.affectedRows > 0) {
        // Update permissions if roleId is provided
        if (validatedData.roleId) {
          await updatePermissions(
            connection,
            validatedData.roleId,
            validatedData.dataId
          );
        }
        return res.status(200).json({ message: "تم التحديث بنجاح", response });
      } else {
        return res.status(400).json({ message: "حدث خطأ في تحديث البيانات" });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error("Error updating user management:", error);
    console.error("Error updating user management:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
// edit information user from user himself
const userEdit = async (req, res) => {
  const { name, phone, Address_id, oldPassword, newPassword, dataId } =
    req.body;
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const trimmedPhoneNumber = phone.trim();
      const trimmedUserName = name.trim();
      const [existingData] = await connection.execute(
        "SELECT * FROM users_management WHERE id = ?",
        [dataId]
      );
      if (existingData.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      const userData = existingData[0];
      if (oldPassword && newPassword) {
        const isPasswordCorrect = await bcrypt.compare(
          oldPassword,
          userData.password
        );
        if (!isPasswordCorrect) {
          return res.status(400).json({ message: "كلمة السر غير متطابقة" });
        }
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const updateQuery = `
          UPDATE users_management 
          SET user_name = ?, phone_number = ?, address_id = ?, password = ? 
          WHERE id = ?
        `;
        const [response] = await connection.execute(updateQuery, [
          trimmedUserName,
          trimmedPhoneNumber,
          Address_id,
          hashedNewPassword,
          dataId,
        ]);

        if (response.affectedRows > 0) {
          return res
            .status(200)
            .json({ message: "تم التحديث بنجاح", response });
        } else {
          return res.status(400).json({ message: "حدث خطأ في تحديث البيانات" });
        }
      } else {
        const updateQuery = `
          UPDATE users_management 
          SET user_name = ?, phone_number = ?, address_id = ? 
          WHERE id = ?
        `;
        const [response] = await connection.execute(updateQuery, [
          trimmedUserName,
          trimmedPhoneNumber,
          Address_id,
          dataId,
        ]);
        if (response.affectedRows > 0) {
          return res
            .status(200)
            .json({ message: "تم التحديث بنجاح", response });
        } else {
          return res.status(400).json({ message: "حدث خطأ في تحديث البيانات" });
        }
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error("Error updating user management:", error);
    console.error("Error updating user management:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Helper function to update role and permission
// async function updateRoleAndPermission(connection, roleId, userId) {
//   const [roleData] = await connection.execute(
//     "SELECT * FROM roles WHERE id = ?",
//     [roleId]
//   );
//   if (roleData.length === 0) {
//     throw new Error("Role not found");
//   }
//   const dataPermission = roleData[0];
//   const editPermission = `
//     UPDATE permissions_group
//     SET permission_id = ?
//     WHERE user_id = ?
//   `;
//   await connection.execute(editPermission, [
//     dataPermission.permission_id,
//     userId,
//   ]);
// }
const deleteById = async (req, res) => {
  try {
    // Connect to the database
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const user = req.user;
      // Define queries
      const deletePermissionsGroupQuery = `
        DELETE FROM permissions_group 
        WHERE user_id = ?`;
      const deleteActiveUserQuery = `
        DELETE FROM active_user 
        WHERE user_id = ?`;
      const userId = req.params.id;
      // Execute deletion queries in sequence
      await connection.execute(deletePermissionsGroupQuery, [userId]);
      await connection.execute(deleteActiveUserQuery, [userId]);
      const [userInfoRows] = await connection.execute(getInformation, [
        user._id,
      ]);
      const [userIsDeleting] = await connection.execute(getInformation, [
        req.params.id,
      ]);
      const [response] = await connection.execute(deleteItem, [userId]);
      if (response.affectedRows > 0) {
        const userInfo = userInfoRows[0];
        const userIsDeletingInfo = userIsDeleting[0];
        const logInfo = ` تم حذف المستخدم  (${userIsDeletingInfo.user_name} من قبل ${userInfo?.user_name}`;
        // Insert log entry
        createLogEntry(connection, 2, user._id, user.entity_id, logInfo, 1);
        return res.status(200).json({ message: "تم الحذف بنجاح" });
      } else {
        return res.status(404).json({ message: "Item not found" });
      }
    } finally {
      // Ensure connection is always released
      connection.release();
    }
  } catch (error) {
    logger.error("Error deleting item:", error);
    console.error("Error deleting item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Helper function to handle pagination setup

// Main function
const getDataUserSearch = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    console.log(req.query);

    // Pagination setup
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { offset, limit: itemsPerPage } = getPagination(page, limit);

    // Build search conditions
    const { searchConditions, queryParams } = buildSearchConditions(req.query);
    const whereClause = searchConditions.length
      ? `WHERE ${searchConditions.join(" AND ")}`
      : "";
    // Get total count for pagination
    const totalItems = await getTotalCount(
      connection,
      whereClause,
      queryParams
    );
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    // Get data with pagination
    const rows = await getDataWithPagination(
      connection,
      whereClause,
      queryParams,
      itemsPerPage,
      offset
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "لا توجد بيانات" });
    }
    res.status(200).json({
      response: rows,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage,
      },
    });
  } catch (error) {
    logger.error("Error fetching users management data:", error);
    console.error("An error occurred: ", error.message);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    if (connection) connection.release();
    console.log("Connection released");
  }
};
// Helper function to verify refresh token
// Main function to refresh the token
const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token is required" });
  }
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      res.clearCookie("authorization", { path: "/" });
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }
    // Check if there is an active session
    const isActiveSession = await checkActiveSession(connection, payload._id);
    if (!isActiveSession) {
      return res
        .status(404)
        .json({ message: "No active session found for the user." });
    }
    // Get the user data
    const user = await getUserData(connection, payload._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Generate and return the new access token
    const newAccessToken = generateToken(user, process.env.ACCESSTOKEN, "2h");
    if (newAccessToken) {
      return res.status(200).json({
        accessToken: `Bearer ${newAccessToken}`,
        message: "Access token refreshed successfully",
      });
    } else {
      return res
        .status(500)
        .json({ message: "Failed to generate access token" });
    }
  } catch (error) {
    console.error("Error during token refresh:", error);
    return res.status(500).json({
      message: "An unexpected error occurred while refreshing the token",
    });
  } finally {
    if (connection) connection.release();
  }
};
// Cron Job: Update `is_active_session` daily and weekly
// scheduleSessionUpdates();
module.exports = {
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
  refreshToken,
  logout,
  getDataUserManageBIdEntityWithoutLimit,
};
