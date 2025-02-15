const { connect } = require("../../Config/db");
const getLog = async (req, res) => {
  let connection;
  try {
    // Establish database connection
    const pool = await connect();
    connection = await pool.getConnection();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    if (page < 1 || limit < 1) {
      return res.status(400).json({ message: "Invalid pagination parameters" });
    }
    const offset = (page - 1) * limit;
    // Fetch total count of logs
    const [totalRows] = await connection.execute(
      "SELECT COUNT(*) AS count FROM log_information WHERE category_id = 1"
    );
    const totalItems = totalRows[0].count;
    const totalPages = Math.ceil(totalItems / limit);
    // Retrieve logs with pagination
    const selectQueryLog = `
      SELECT 
        log_information.id AS log_id, 
        log_information.*, 
        stagnant_materials.stagnant_id AS stagnant_id, 
        stagnant_materials.name_material,
        stagnant_materials.Quantity,
        stagnant_materials.price_material,
        users_management.id AS user_id,
        users_management.user_name,
        users_management.phone_number,
        ministries.ministries, 
        entities.Entities_name,
        masterlog.action
      FROM log_information
      LEFT JOIN masterlog ON log_information.master_id = masterlog.id
      LEFT JOIN stagnant_materials ON log_information.stagnant_id = stagnant_materials.stagnant_id
      LEFT JOIN users_management ON stagnant_materials.user_id = users_management.id
      LEFT JOIN ministries ON stagnant_materials.ministry_id = ministries.id
      LEFT JOIN entities ON stagnant_materials.entities_id = entities.id
      WHERE log_information.category_id = 1
      ORDER BY log_information.id DESC
      LIMIT ${limit} OFFSET ${offset};

    `;
    const [logs] = await connection.execute(selectQueryLog);
    // Check if logs are found
    if (logs.length === 0) {
      return res.status(404).json({ message: "No logs found" });
    }
    // Respond with logs and pagination data
    return res.status(200).json({
      logs,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    // Log error and respond with an error message
    console.error("Error fetching logs:", error);
    return res.status(500).json({
      message: "An internal server error occurred",
      error: error.message,
    });
  } finally {
    // Ensure the connection is released
    if (connection) connection.release();
  }
};
const getLogByEntityId = async (req, res) => {
  let connection;
  try {
    // Check if entityId is provided
    const { entityId, page = 1, limit = 10 } = req.query;
    if (!entityId) {
      return res.status(400).json({ message: "Entity ID is required" });
    }
    // Establish database connection
    const pool = await connect();
    connection = await pool.getConnection();
    // Parse and validate pagination parameters
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    if (pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({ message: "Invalid pagination parameters" });
    }
    const offset = (pageNumber - 1) * limitNumber;
    // Fetch total count of logs for pagination
    const totalCountQuery = `SELECT COUNT(*) AS count FROM log_information WHERE log_information.entities_id = ? AND log_information.category_id = 1`;
    const [totalRows] = await connection.execute(totalCountQuery, [entityId]);
    const totalItems = totalRows[0].count;
    const totalPages = Math.ceil(totalItems / limitNumber);
    console.log("Total Items:", totalItems, "Total Pages:", totalPages);
    // If no logs exist for the given entity ID
    if (totalItems === 0) {
      return res
        .status(404)
        .json({ message: "No logs found for the specified entity" });
    }
    // Retrieve logs with pagination
    const selectQueryLog = `
      SELECT 
        log_information.id AS log_id, 
        log_information.*, 
        stagnant_materials.stagnant_id AS stagnant_id, 
        stagnant_materials.name_material, 
        stagnant_materials.Quantity, 
        stagnant_materials.price_material, 
        users_management.id AS user_id, 
        users_management.user_name, 
        users_management.phone_number, 
        ministries.ministries, 
        entities.Entities_name, 
        masterlog.action 
      FROM log_information
      LEFT JOIN masterlog ON log_information.master_id = masterlog.id
      LEFT JOIN stagnant_materials ON log_information.stagnant_id = stagnant_materials.stagnant_id
      LEFT JOIN users_management ON stagnant_materials.user_id = users_management.id
      LEFT JOIN ministries ON stagnant_materials.ministry_id = ministries.id
      LEFT JOIN entities ON stagnant_materials.entities_id = entities.id
      WHERE log_information.entities_id = ? AND log_information.category_id = 1
      ORDER BY log_information.id DESC
      LIMIT ${limitNumber} OFFSET ${offset};
    `;
    const [logs] = await connection.execute(selectQueryLog, [entityId]);
    // If no logs are found
    if (logs.length === 0) {
      return res.status(404).json({ message: "No logs found" });
    }
    // Respond with logs and pagination data
    return res.status(200).json({
      logs,
      pagination: {
        totalItems,
        totalPages,
        currentPage: pageNumber,
        itemsPerPage: limitNumber,
      },
    });
  } catch (error) {
    // Log error and respond with an error message
    console.error("Error fetching logs:", error);
    return res.status(500).json({
      message: "An internal server error occurred",
      error: error.message,
    });
  } finally {
    // Ensure the connection is released
    if (connection) connection.release();
  }
};

module.exports = {
  getLog,
  getLogByEntityId,
};
