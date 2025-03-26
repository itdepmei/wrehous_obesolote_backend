const { connect } = require("../config/db");
const logger = require("../middleware/Logger");
const { selectQuery, insertQuery } = require("../query/permisionsQuery");

const setPermission = async (req, res) => {
  try {
    const { permissionName } = req.body;
    if (!permissionName) {
      logger.error("Data is required");
      return res.status(400).json({ message: "Data is required" });
    }
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const [response] = await connection.execute(insertQuery, [
        permissionName,
      ]);

      if (response.affectedRows > 0) {
        return res
          .status(200)
          .json({ message: "Permission saved successfully", response });
      } else {
        logger.error("Error occurred while saving permission");
        return res
          .status(400)
          .json({ message: "Error occurred while saving permission" });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error("Error saving permission:", error);
    console.error("Error saving permission:", error);
    return res.status(500).json({ message: "An error occurred", error });
  }
};
const getPermissionByRoleId = async (req, res) => {
  try {
    const { id } = req.params; // Use req.params for route parameters
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const selectQuery = "SELECT * FROM permissions WHERE RoleId = ?";
      const [response] = await connection.execute(selectQuery, [id]);
      if (response.length > 0) {
        return res.status(200).json({ response });
      } else {
        return res.status(404).json({ message: "No data found for this role" });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error("Error fetching permissions by role ID:", error);
    console.error("Error fetching permissions by role ID:", error);
    return res.status(500).json({ message: "An error occurred", error });
  }
};
const getAllPermissions = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const [response] = await connection.execute(selectQuery);

      if (response.length > 0) {
        return res.status(200).json(response);
      } else {
        return res.status(404).json({ message: "No data found" });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error("Error fetching all permissions:", error);
    console.error("Error fetching all permissions:", error);
    return res.status(500).json({ message: "An error occurred", error });
  }
};
const getPermissionsById = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const selectQuery = "SELECT * FROM permissions_group WHERE user_id=?";
      const [dataGroup] = await connection.execute(selectQuery, [req.query.id]);
      if (dataGroup.length > 0) {
        const data = dataGroup[0];
        const permissionIds = JSON.parse(data?.permission_id);
        if (Array.isArray(permissionIds) && permissionIds.length > 0) {
          const queryPermission = `SELECT * FROM permissions WHERE id IN (${permissionIds
            .map(() => "?")
            .join(",")})`;
          const [dataPermissions] = await connection.execute(
            queryPermission,
            permissionIds
          );
          return res.status(200).json(dataPermissions);
        } else {
          return res.status(404).json({ message: "No permissions found" });
        }
      } else {
        return res.status(404).json({ message: "No data found" });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error("Error fetching all permissions:", error);
    console.error("Error fetching all permissions:", error);
    return res.status(500).json({ message: "An error occurred", error });
  }
};
module.exports = {
  getAllPermissions,
  getPermissionByRoleId,
  setPermission,
  getPermissionsById,
};
