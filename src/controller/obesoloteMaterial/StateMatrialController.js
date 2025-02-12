const { connect } = require("../../Config/db");
const MartialStateRegister = async (req, res) => {
  const { stateName } = req.body;
  
  
  if (!stateName) {
    res.status(400).json({ message: "حالة المادة يرجا الادخال" });
    return;
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const checkEmailQuery = "SELECT * FROM state_martial WHERE state_name = ?";
      const [existingUsers] = await connection.execute(checkEmailQuery, [
        stateName,
      ]);
      if (existingUsers.length > 0) {
        res.status(400).json({ message: "حالة المادة  موجودة مسبقا" });
        return;
      }
      const insertQuery = "INSERT INTO state_martial (state_name) VALUES (?)";
      const [response] = await connection.execute(insertQuery, [stateName]);
     
      res.status(201).json({ message: "تم الاضافة بنجاح", response });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error registering ministry:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const getDataStateName = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    const getDataStateNameQuery = "SELECT * FROM state_martial";
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
const deleteMinistersById = async (req, res) => {
  try {
   
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const DeleteMinistryItem = "DELETE FROM stateName WHERE id=?";
      const [response] = await connection.execute(DeleteMinistryItem, [
        req.params.id,
      ]);
   
      if (response.affectedRows > 0) {
        return res.status(200).json({ message: "تم الحذف بنجاح" });
      } else {
        return res.status(404).json({ message: "Item not found" });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error deleting material:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const EditStateName = async (req, res) => {
  // console.log("Request Body:", req.body);
  const { dataEdit,dataId } = req.body;
  // Check if dataEdit exists and is a non-empty string
  if (!dataEdit || typeof dataEdit !== "string" || !dataEdit.trim()) {
    return res.status(400).json({ message: "Invalid data for editing" });
  }
  try {
    // Initialize the database connection
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const trimmedEditData = dataEdit.trim();
      // SQL query for updating the stateName
      const updateQuery = `UPDATE state_martial SET state_name = ? WHERE id = ?`;
      // Execute the update query
      const [response] = await connection.execute(updateQuery, [
        trimmedEditData,
        dataId,
      ]);
      // Log the response from the query
      console.log("Database Response:", response);
      // Check if any row was affected (successful update)
      if (response.affectedRows > 0) {
        return res.status(200).json({ message: "Update successful", response });
      } else {
        return res.status(400).json({ message: "Error updating data", response });
      }
    } catch (queryError) {
      console.error("Error executing the query:", queryError);
      return res.status(500).json({ message: "Database query error" });
    } finally {
      // Release the database connection back to the pool
      connection.release();
    }
  } catch (connectionError) {
    // Log and return an internal server error
    console.error("Error establishing database connection:", connectionError);
    return res.status(500).json({ message: "Internal server error" });
  }
};


module.exports = { MartialStateRegister, getDataStateName, deleteMinistersById ,EditStateName};
