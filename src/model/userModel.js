const { log } = require("winston");
const {
  getDataRoleAndPermissionQuery,
  insertQueryRolePermission,
} = require("../query/RoleQuery");
const {
  getDataUsersById,
  getInformation,
} = require("../query/userMangeController-db");
const generateToken = require("../utils/genrateToken");
const bcrypt = require("bcrypt");
const e = require("connect-timeout");
let checkEmailQuery = "SELECT * FROM users_management WHERE email = ?";
const hashPassword = async (password) => {
  console.log("pass", password);
  return await bcrypt.hash(password, 10);
};
const insertUser = async (connection, userData) => {
  let insertQuery =
    "INSERT INTO users_management (password, user_name, phone_number, email, group_id, job_title_id, address_id";
  let values = [
    userData.hashedPassword,
    userData.trimmedUserName,
    userData.trimmedPhoneNumber,
    userData.trimmedEmail,
    userData.roleId,
    userData.jopTitle,
    userData.address_id,
  ];
  if (userData.ministries_id) {
    insertQuery += ", ministres_id";
    values.push(userData.ministries_id);
  }

  if (userData.entities_id) {
    insertQuery += ", entities_id";
    values.push(userData.entities_id);
  }

  insertQuery += ") VALUES (" + values.map(() => "?").join(", ") + ")";
  const [insertUserResponse] = await connection.execute(insertQuery, values);
  return insertUserResponse;
};

const insertRolePermissions = async (connection, roleId, userId) => {
  const [roleData] = await connection.execute(getDataRoleAndPermissionQuery, [
    roleId,
  ]);
  if (roleData.length === 0) {
    throw new Error("Invalid role ID");
  }
  const data = roleData[0];
  await connection.execute(insertQueryRolePermission, [
    data.permission_id,
    roleId,
    userId,
  ]);
};

const insertActiveUser = async (connection, userId) => {
  const ActiveUserQuery = "INSERT INTO active_user (user_id) VALUE(?)";
  await connection.execute(ActiveUserQuery, [userId]);
};

const insertApplicationPermissions = async (connection, userId, is_active) => {
  console.log(is_active);
  const active = JSON.parse(is_active);
  for (const element of active) {
    const ApplicationPermissionQuery =
      "INSERT INTO user_id_application__permission_id (user_id, user_id_application__permission_id) VALUE(?, ?)";
    await connection.execute(ApplicationPermissionQuery, [userId, element]);
  }
};
const editApplicationPermissions = async (connection, userId, is_active) => {
  // console.log("sdfhsjdfhds",is_active);
  const active = JSON.parse(is_active);
  log("active", active);
  for (const element of active) {
    console.log(element.application_id, active.permission_id);
    
    const ApplicationPermissionQuery = `
      UPDATE user_id_application__permission_id 
      SET user_id_application__permission_id = ? 
      WHERE id = ?
    `;
    await connection.execute(ApplicationPermissionQuery, [element.application_id, active.permission_id]);
  }
};
// login section
const getUserByEmail = async (connection, email) => {
  const [users] = await connection.execute(checkEmailQuery, [email]);
  return users.length > 0 ? users[0] : null;
};
const generateTokens = (user) => {
  return {
    accessToken: generateToken(user, process.env.ACCESSTOKEN, "1d"),
    refreshToken: generateToken(user, process.env.REFRESHTOKEN, "2d"),
    refreshTokenExp: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
  };
};

const manageUserSession = async (
  connection,
  userId,
  refreshTokenExp,
  req
) => {
  const [existingSession] = await connection.execute(
    "SELECT id FROM active_session_user WHERE user_id = ?",
    [userId]
  );
  if (existingSession.length > 0) {
    await connection.execute(
      "UPDATE active_session_user SET is_active_session = TRUE, expires_at = ?, device_info = ?, ip_address = ?, created_at = NOW() WHERE id = ?",
      [
      
        refreshTokenExp,
        req.headers["user-agent"],
        req.ip,
        existingSession[0].id,
      ]
    );
  } else {
    await connection.execute(
      "INSERT INTO active_session_user (user_id, is_active_session, expires_at, created_at, device_info, ip_address) VALUES (?,  TRUE, ?, NOW(), ?, ?)",
      [
        userId,
        // refreshToken,
        // accessToken,
        refreshTokenExp,
        req.headers["user-agent"],
        req.ip,
      ]
    );
  }
};

const logUserAction = async (connection, userId, req) => {
  await connection.execute(
    "INSERT INTO user_auth_logs (user_id, action_type, status, ip_address, user_agent, additional_info) VALUES (?, 'LOGIN', 'SUCCESS', ?, ?, ?)",
    [
      userId,
      req.ip,
      req.headers["user-agent"],
      JSON.stringify({ timestamp: new Date().toISOString() }),
    ]
  );
};

const getUserDataById = async (connection, userId) => {
  const [rows] = await connection.execute(getDataUsersById, [userId]);
  return rows[0];
};
const setSecureCookies = (res, accessToken, refreshToken, refreshTokenExp) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };
  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    expires: new Date(Date.now() + 60 * 1000),
  });
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    expires: refreshTokenExp,
    expires: new Date(Date.now() + 60 * 1000),
  });
};
// get session user to check active or not
const getActiveSession = async (connection, userId) => {
  const [currentSession] = await connection.execute(
    `SELECT  is_active_session FROM active_session_user 
     WHERE user_id = ? 
     LIMIT 1`,
    [userId]
  );
  console.log("sdfsd",currentSession);
  
  return currentSession;
};
// update session
const updateSession = async (connection, userId) => {
  await connection.execute(
    `UPDATE active_session_user 
       SET is_active_session = FALSE,
           last_logout_at = NOW(),
           logout_reason = 'user_logout'
       WHERE user_id = ? `,
    [userId]
  );
};
const logLogout = async (connection, userId, ip, userAgent) => {
  await connection.execute(
    `INSERT INTO user_auth_logs (
        user_id, action_type, status, ip_address, user_agent, additional_info
      ) VALUES (?, 'LOGOUT', 'SUCCESS', ?, ?, ?)`,
    [
      userId,
      ip,
      userAgent,
      JSON.stringify({
        reason: "user_initiated",
        timestamp: new Date().toISOString(),
      }),
    ]
  );
};

const clearCookies = (res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  };
  res.clearCookie("refreshToken", cookieOptions);
};

const logError = async (connection, error, req) => {
  try {
    const errorLogQuery = `
        INSERT INTO error_logs (
          error_type, error_message, stack_trace, additional_info
        ) VALUES (?, ?, ?, ?)
      `;
    await connection.execute(errorLogQuery, [
      "LOGOUT_ERROR",
      error.message,
      error.stack,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      }),
    ]);
  } catch (logError) {
    console.error("Error logging failed:", logError);
  }
};

const updateAccountStatus = async (connection, is_active, user_id, dataId) => {
  const updateQuery = `
      UPDATE active_user 
      SET is_active = ? 
      WHERE user_id = ? AND id = ?
    `;
  const [response] = await connection.execute(updateQuery, [
    is_active ? 1 : 0, // Convert boolean to 1 (true) or 0 (false)
    user_id,
    dataId,
  ]);
  return response;
};

const handleSuccessResponse = (res, is_active, response) => {
  return res.status(200).json({
    message: is_active ? "تم تفعيل الحساب بنجاح" : "تم الغاء التفعيل بنجاح",
    response,
  });
};

const handleFailureResponse = (res) => {
  return res.status(404).json({
    message: "User not found or no changes made to the status",
  });
};

const checkUserExists = async (connection, dataId) => {
  console.log("dataId", dataId);
  
  const [existingData] = await connection.execute(getInformation, [dataId]);
  if (existingData.length === 0) {
    throw new Error("User not found");
  }
};

const checkEmailExists = async (connection, email, dataId = null) => {
  const queryParams = [email];
  if (dataId) {
     `${checkEmailQuery} AND id != ?`;
    queryParams.push(dataId);
  }
  // Execute the query
  console.log("queryParams", checkEmailQuery);
  const [existingUsers] = await connection.execute(
    checkEmailQuery,
    queryParams
  );

  // If any user with the same email is found, throw an error
  if (existingUsers.length > 0) {
    throw new Error(
      dataId
        ? "Email already exists for another user"
        : "الابريد الالكتروني موجود مسسبقا"
    );
  }
};

const updateUserData = async (connection, data) => {
  const {
    name,
    phone,
    ministries_id,
    entities_id,
    address_id,
    roleId,
    password,
    email,
    dataId,
  } = data;
console.log("data", data);
  const updateQuery = `
      UPDATE users_management 
      SET user_name = ?, phone_number = ?, ministres_id = ?, entities_id = ?, address_id = ?, group_id=? ,
      ${password ? "password = ?, " : ""} email = ? 
      WHERE id = ?
    `;
  const queryParams = [
    name,
    phone,
    ministries_id,
    entities_id,
    address_id,
    roleId,
    ...(password ? [password] : []),
    email,
    dataId,
  ];

  const [response] = await connection.execute(updateQuery, queryParams);
  return response;
};

const updatePermissions = async (connection, roleId, dataId) => {
  const [roleData] = await connection.execute(getDataRoleAndPermissionQuery, [
    roleId,
  ]);
  if (roleData.length === 0) {
    throw new Error("Role not found");
  }
  const dataPermission = roleData[0];
  const editPermission = `
      UPDATE permissions_group 
      SET permission_id = ? 
      WHERE user_id = ?
    `;
  await connection.execute(editPermission, [
    dataPermission.permission_id,
    dataId,
  ]);
};
const fetchUserData = async (connection, query, params = []) => {
  const [rows] = await connection.execute(query, params);
  return rows;
};

const fetchTotalRows = async (connection, query, params = []) => {
  const [rows] = await connection.execute(query, params);
  return rows[0].count;
};

// Helper function to build WHERE conditions
const buildSearchConditions = (query) => {
  let searchConditions = [];
  let queryParams = [];

  if (query.name) {
    searchConditions.push("sm.user_name = ?");
    queryParams.push(query.name);
  }
  if (query.email && query.email.length > 0) {
    searchConditions.push("sm.email = ?");
    queryParams.push(query.email);
  }

  return { searchConditions, queryParams };
};

// Helper function to get total count
const getTotalCount = async (connection, whereClause, queryParams) => {
  const [totalRows] = await connection.execute(
    `SELECT COUNT(*) AS count FROM users_management sm ${whereClause}`,
    queryParams
  );
  return totalRows[0].count;
};

// Helper function to get data with pagination
const getDataWithPagination = async (
  connection,
  whereClause,
  queryParams,
  limit,
  offset
) => {
  const query = `
      SELECT sm.*, e.*, m.*, ac.*, jo.*, go.*, r.* 
      FROM users_management sm
      LEFT JOIN ministries m ON sm.ministres_id = m.id
      LEFT JOIN entities e ON sm.entities_id = e.id
      LEFT JOIN active_user ac ON sm.id = ac.user_id
      LEFT JOIN job_title jo ON sm.job_title_id = jo.id
      LEFT JOIN governorate go ON sm.address_id = go.id
      LEFT JOIN roles r ON sm.group_id = r.id
      ${whereClause}
      LIMIT ${limit} OFFSET ${offset};
    `;
  const [rows] = await connection.execute(query, queryParams);
  return rows;
};
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.REFRESHTOKEN);
  } catch (err) {
    return null;
  }
};

// Helper function to check active session
const checkActiveSession = async (connection, userId) => {
  const activeSessionQuery =
    "SELECT * FROM active_session_user WHERE user_id = ? AND is_active_session = true";
  const [activeSessions] = await connection.execute(activeSessionQuery, [
    userId,
  ]);
  return activeSessions.length > 0;
};

// Helper function to get user data
const getUserData = async (connection, userId) => {
  const userQuery = "SELECT * FROM users_management WHERE id = ?";
  const [userResult] = await connection.execute(userQuery, [userId]);
  return userResult[0];
};
module.exports = {
  hashPassword,
  checkEmailExists,
  insertUser,
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
  logError,
  updateAccountStatus,
  handleSuccessResponse,
  handleFailureResponse,
  checkUserExists,
  updateUserData,
  updatePermissions,
  fetchUserData,
  fetchTotalRows,
  buildSearchConditions,
  getTotalCount,
  getDataWithPagination,
  verifyRefreshToken,
  checkActiveSession,
  getUserData,
  editApplicationPermissions
};
