const { connect } = require("../Config/db");
const { getDataPermissionUserIdDataQuery } = require("../query/RoleQuery");
const authorization = async (req, res, next) => {
  const user = req.user;
  const {Add_Data}=req?.body
  console.log(Add_Data);
  const checkPermissionUser= req.query.checkPermissionUser||Add_Data;
  try {
    // console.log(checkPermissionUser);
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        getDataPermissionUserIdDataQuery,
        [user?._id]
      );
      const dataUserPermission = rows[0];
      // console.log(dataUserPermission.permission_id, checkPermissionUser);
      const permissionData = JSON.parse(dataUserPermission.permission_id);
      // console.log(permissionData);
      // Convert checkPermissionUser to string for comparison
      const checkPermissionUserStr = String(checkPermissionUser);
      if (
        Array.isArray(permissionData) &&
        permissionData.some(permission => String(permission) === checkPermissionUserStr)
      ) {
        console.log("Permission granted");
        return next();
      } else {
        console.log("Forbidden: Insufficient permissions");
        return res.status(403).json({ message: "ممنوع: صلاحيات غير كافية" });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return res.status(500).json({ message: "An error occurred", error });
  }
};

module.exports = authorization;
