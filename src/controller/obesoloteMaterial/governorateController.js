const { connect } = require("../../config/db");
const governorateRegister = async (req, res) => {
  const { governorate_name } = req.body;
  if (!governorate_name) {
    return res.status(400).json({ message: "يرجا أدخال المعلومات" });
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const insertQuery =
        "INSERT INTO governorate (governorate_name) VALUES (?)";
      const [response] = await connection.execute(insertQuery, [
        governorate_name,
      ]);
      res.status(201).json({ message: "تم الاضافة بنجاح", response });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error registering governorate:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const getDataGovernorate = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    const getDataGovernorateQuery = "SELECT * FROM governorate";
    const [rows] = await connection.execute(getDataGovernorateQuery);
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
const editGovernorate = async (req, res) => {
  const { dataEdit,dataId } = req.body;
  // Validate input
  if (!dataEdit || typeof dataEdit !== 'string' || dataEdit.trim() === '') {
    return res.status(400).json({ message: "Invalid governorate name" });
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      // Trim the input data
      const trimmedEdit_data = dataEdit.trim();
      
      // Prepare the update query
      const updateQuery = `UPDATE governorate SET governorate_name = ? WHERE id = ?`;
      const [response] = await connection.execute(updateQuery, [
        trimmedEdit_data,
        dataId,
      ]);
      if (response.affectedRows > 0) {
        return res.status(200).json({ message: "تم التحديث بنجاح", response });
      } else {
        return res.status(400).json({ message: "حدث خطأ في تحديث البيانات", response });
      }
    } finally {
      // Ensure connection is released
      connection.release();
    }
  } catch (error) {
    console.error("Error updating governorate:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const deleteGovernorateById = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const deleteGovernorateById = "DELETE FROM governorate WHERE id=?";
      const [response] = await connection.execute(deleteGovernorateById, [
        req.params.id,
      ]);
      console.log(response);
      if (response.affectedRows > 0) {
        return res.status(200).json({ message: "تم الحذف بنجاح" });
      } else {
        return res.status(404).json({ message: "Item not found" });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error deleting :", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
module.exports = {
  governorateRegister,
  getDataGovernorate,
  deleteGovernorateById,
  editGovernorate,
};
