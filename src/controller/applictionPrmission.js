const { connect, getConnection } = require("../Config/db");
const getDataApplicationPermission = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    const getDataStateNameQuery = "SELECT * FROM application_permission";
    const [rows] = await connection.execute(getDataStateNameQuery);
    if (rows.length === 0) {
      return res.status(404).json({ message: "لاتوجد بيانات حالية" });
    }
    res.status(200).json({ response: rows });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};
const getApplicationPermissionById = async (req, res) => {
  const user_id = req.user._id;
  if (!user_id) {
    res.status(400).json({ message: "User ID is required" });
    return;
  }
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    
    const getUserByIdQuery = `
      SELECT * FROM user_id_application__permission_id
      WHERE user_id = ?`;
    
    // Set query timeout to 5 seconds
    const [userData] = await Promise.race([
      connection.execute(getUserByIdQuery, [user_id]),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      )
    ]);

    if (userData.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User data retrieved successfully",
      response: userData,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
module.exports = {
  getDataApplicationPermission,
  getApplicationPermissionById
};
