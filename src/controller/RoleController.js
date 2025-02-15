const { connect } = require("../Config/db");
const {
  getDataPermissionGroupDataQuery,
  selectQueryRole,
  insertRoleQuery,
  getDataPermissionUserIdDataQuery,
  insertQueryRolePermission,
} = require("../query/RoleQuery");
const setRole = async (req, res) => {
  try {
    console.log(req.body);

    const { RoleName } = req.body;
    if (!RoleName) {
      return res.status(400).json({ message: "Please enter role name" });
    }

    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const [response] = await connection.execute(insertRoleQuery, [RoleName]);

      if (response.affectedRows === 0) {
        return res
          .status(400)
          .json({ message: "Error occurred while saving role" });
      }

      return res
        .status(200)
        .json({ message: "Role saved successfully", response });
    } finally {
      await connection.release(); // Ensure the connection is released
    }
  } catch (error) {
    console.error("Error saving role:", error);
    return res.status(500).json({ message: "An error occurred", error });
  }
};
const getDataRoleIdAndUserId = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    const getDataQuery = `
      SELECT * FROM users_management 
      WHERE id = ?
    `;
    const [rows] = await connection.execute(getDataQuery, [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("An error occurred while fetching data: ", error.message);
    res.status(500).json({
      message: "An error occurred while fetching data",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
    console.log("Connection released");
  }
};

const getRole = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const [response] = await connection.execute(selectQueryRole);

      if (response.length > 0) {
        return res.status(200).json({ response });
      } else {
        return res.status(404).json({ message: "No roles found" });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching roles:", error);
    return res.status(500).json({ message: "An error occurred", error });
  }
};
const getDataRoleIdAndPermission = async (req, res) => {
  let connection;
  try {
    // console.log(req.params.id);
    const user_id = req.user._id;
    const pool = await connect();
    connection = await pool.getConnection();
    const [rows] = await connection.execute(getDataPermissionUserIdDataQuery, [
      user_id,
    ]);
    // console.log(rows);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }
    const result = rows[0];
    res.status(200).json({ response: result });
  } catch (error) {
    console.error("An error occurred: ", error.message);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    if (connection) connection.release();
    console.log("Connection released");
  }
};
const getDataRoleIdAndPermissionIduseGrouID = async (req, res) => {
  let connection;
  try {
    console.log(req.params.id);
    const pool = await connect();
    connection = await pool.getConnection();
    const [rows] = await connection.execute(getDataPermissionGroupDataQuery, [
      req.params.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }
    const result = rows[0];
    res.status(200).json({ response: result });
  } catch (error) {
    console.error("An error occurred: ", error.message);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    if (connection) connection.release();
    console.log("Connection released");
  }
};
const setPermissionAndRole = async (req, res) => {
  let connection;
  try {
    // console.log(req.body);
    const { selectionModel, userId, roleIdPermission } = req.body;
    // Validate input
    if (!selectionModel || !userId) {
      return res
        .status(400)
        .json({ message: "selectionModel and userId are required." });
    }
    const pool = await connect();
    connection = await pool.getConnection();
    if (!roleIdPermission) {
      return res
        .status(200)
        .json({ message: "please provide roleIdPermission" });
    }
    if (roleIdPermission) {
      const deleteRolePermissionQuery = `
        DELETE FROM permissions_group 
        WHERE id = ?
      `;
      const [deleteResult] = await connection.execute(
        deleteRolePermissionQuery,
        [roleIdPermission]
      );
      if (deleteResult.affectedRows === 0) {
        console.log("Role permission not found or already deleted.");
        // No need to return here if the goal is to always insert a new record
        return res
          .status(400)
          .json({ message: " Role permission not found or already delete " });
      } else {
        console.log("Role permission deleted successfully");
      }
    }
    // Find user
    const findUserQuery = `
      SELECT * FROM users_management 
      WHERE id = ?
    `;
    const [userRows] = await connection.execute(findUserQuery, [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    const user = userRows[0];
    // console.log(user.group_id, selectionModel, userId);
    const [insertResult] = await connection.execute(insertQueryRolePermission, [
      JSON.stringify(selectionModel || null),
      user.group_id || null,
      userId || null,
    ]);
    if (insertResult.affectedRows === 0) {
      return res
        .status(500)
        .json({ message: "Failed to save role-permission mapping." });
    }
    return res.status(200).json({
      response: {
        id: insertResult.insertId,
        permissionIds: selectionModel,
        RoleId: user.RoleId,
        userId: userId,
      },
      message: "Permission added successfully.",
    });
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  } finally {
    if (connection) connection.release();
    console.log("Connection released");
  }
};
const setPermissionAndRoleToEachGroup = async (req, res) => {
  let connection;
  try {
    const { selectionModel, GroupId, roleIdPermissionGroup } = req.body;

    // Validate input
    if (!selectionModel || !GroupId) {
      return res.status(400).json({
        message: "selectionModel and GroupId are required.",
      });
    }

    // Establish database connection
    const pool = await connect();
    connection = await pool.getConnection();

    // Start transaction
    await connection.beginTransaction();

    // If roleIdPermissionGroup exists, delete related entries
    if (roleIdPermissionGroup) {
      const deleteQueryRoleUser = `
        DELETE FROM user_group 
        WHERE id = ?`;
      console.log("Deleting roleIdPermissionGroup:", roleIdPermissionGroup);

      const [deleteResult] = await connection.execute(deleteQueryRoleUser, [
        roleIdPermissionGroup,
      ]);

      if (deleteResult.affectedRows > 0) {
        console.log("Role deleted successfully");
      } else {
        console.log("No role found to delete");
      }
    }

    // Insert new role and permissions
    const insertQueryRoleUser = `
      INSERT INTO user_group (permission_id, Role_id) 
      VALUES (?, ?)`;
    const [result] = await connection.execute(insertQueryRoleUser, [
      JSON.stringify(selectionModel), // Assuming selectionModel is an array
      GroupId,
    ]);

    // If rows were affected, update permissions group
    if (result.affectedRows > 0) {
      const getDataPermissionUserIdDataQuery = `
        SELECT permission_id 
        FROM permissions_group
        WHERE group_id = ?`;
      const [existingPermissions] = await connection.execute(
        getDataPermissionUserIdDataQuery,
        [GroupId]
      );

      // Use Promise.all to handle asynchronous map correctly
      await Promise.all(
        existingPermissions.map(async (item) => {
          const updateQuery = `
            UPDATE permissions_group 
            SET permission_id = ? 
            WHERE group_id = ?`;
          await connection.execute(updateQuery, [
            JSON.stringify(selectionModel),
            GroupId,
          ]);
        })
      );
    }

    // Commit transaction
    await connection.commit();
    // Success response
    return res.status(200).json({
      response: {
        id: result.insertId,
        permissionIds: selectionModel,
        RoleId: GroupId,
      },
      message: "Permission added successfully",
    });
  } catch (error) {
    // Rollback transaction in case of error
    if (connection) await connection.rollback();
    console.error("Error:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  } finally {
    // Release the connection
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error("Failed to release connection:", releaseError);
      }
    }
  }
};
module.exports = {
  getDataRoleIdAndPermissionIduseGrouID,
  setPermissionAndRole,
  getDataRoleIdAndUserId,
  setPermissionAndRoleToEachGroup,
  getRole,
  setRole,
  getDataRoleIdAndPermission,
};
