const { connect } = require("../../config/db");
const MinistriesRegister = async (req, res) => {
  const { ministries } = req.body;
  if (!ministries) {
    res.status(400).json({ message: "Ministries field is required" });
    return;
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const checkEmailQuery = "SELECT * FROM ministries WHERE ministries = ?";
      const [existingUsers] = await connection.execute(checkEmailQuery, [
        ministries,
      ]);
      if (existingUsers.length > 0) {
        res.status(400).json({ message: "الوزارة موجودة مسبقا" });
        return;
      }
      const insertQuery = "INSERT INTO ministries (ministries) VALUES (?)";
      const [response] = await connection.execute(insertQuery, [ministries]);
 
      res.status(201).json({ message: "تم الاضافة بنجاح", response });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error registering ministry:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const getDataMinistries = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    const getDataMinistriesQuery = "SELECT * FROM ministries";
    const [rows] = await connection.execute(getDataMinistriesQuery);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No ministries found" });
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
      const DeleteMinistryItem = "DELETE FROM ministries WHERE id=?";
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
const EditMinistries = async (req, res) => {
  const { dataEdit,dataId } = req.body;
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const trimmedEdit_data = dataEdit.trim();
      const updateQuery = `UPDATE ministries SET ministries =? WHERE id=?`;
      const [response] = await connection.execute(updateQuery, [
        trimmedEdit_data,
        dataId,
      ]);
      console.log(response);
      if (response.affectedRows > 0) {
        res.status(200).json({ message: "تم التحديث بنجاح", response });
      } else {
        res
          .status(400)
          .json({ message: "حدث خطأ في تحديث البيانات", response });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error updating user management:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
module.exports = { MinistriesRegister, getDataMinistries, deleteMinistersById ,EditMinistries};
