const { connect } = require("../config/db");
const applicationAuth = async (req, res, next) => {
  const user = req.user;
  console.log("vxcbdfh",req.query.applicationPermission);

  const applicationPermission = req.query.applicationPermission||req.body.applicationPermission;
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const getUserByIdQuery = `
      SELECT * FROM user_id_application__permission_id
      WHERE user_id = ?`;
      const [rows] = await connection.execute(
        getUserByIdQuery,
        [user?._id]
      );
      // console.log("hello ", rows);

      // Extract user_id_application__permission_id as an array
      const permissionData = rows.map(row => row.user_id_application__permission_id);
      console.log("Filtered permissionData: ", permissionData);
      if (
        Array.isArray(permissionData) &&
        permissionData.some(permission => String(permission) === applicationPermission)
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

module.exports = applicationAuth;