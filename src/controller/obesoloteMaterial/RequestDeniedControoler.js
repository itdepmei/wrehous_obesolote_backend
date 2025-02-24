const { connect } = require("../../config/db");
const MessageDeniedRegister = async (req, res) => {
  const { message, book_id } = req.body;
  if (!message) {
    return res.status(400).json({ message: "يرجا أدخال المعلومات" });
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const insertQuery =
        "INSERT INTO request_denied (message,book_id) VALUES (?,?)";
      const [response] = await connection.execute(insertQuery, [
        message,
        book_id,
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
const getDataMessageById = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    const getDataMessageQuery = "SELECT * FROM request_denied WHERE book_id=?";
    const [rows] = await connection.execute(getDataMessageQuery, [
      req.params.id,
    ]);
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

const editMessageDe = async (req, res) => {
  const { dataEdit ,dataId } = req.body;
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const trimmedEdit_data = dataEdit.trim();
      const updateQuery = `UPDATE request_denied SET message =? WHERE id=?`;
      const [response] = await connection.execute(updateQuery, [
        trimmedEdit_data,
        dataId,
      ]);

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
const deleteMessageById = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();   
    try {
      const deleteGovernorateById = "DELETE FROM request_denied WHERE id=?";
      const [response] = await connection.execute(deleteGovernorateById, [
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
    console.error("Error deleting :", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const deleteRequestById = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
   
    
    try {
      const deleteGovernorateById = "DELETE FROM request_denied WHERE id=?";
      const [response] = await connection.execute(deleteGovernorateById, [
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
    console.error("Error deleting :", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
module.exports = {
  MessageDeniedRegister,
  getDataMessageById,
  deleteMessageById,
  editMessageDe,
  deleteRequestById
};
