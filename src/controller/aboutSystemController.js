const { connect } = require("../Config/db");
const aboutSystemAdd = async (req, res) => {
  const { title, text } = req.body;
  // Trim input data
  const trimmedTitle = title?.trim();
  const trimmedText = text?.trim();
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const insertQuery =
        "INSERT INTO about_system (title, text) VALUES (?, ?)";
      const [response] = await connection.execute(insertQuery, [
        trimmedTitle,
        trimmedText,
      ]);
      res.status(201).json({ message: "تم الاضافة بنجاح", data: response });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error adding about system information:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const getDataAbout = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    const getDataStateNameQuery = "SELECT * FROM about_system";
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
const deleteAboutById = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const DeleteAboutItem = "DELETE FROM about_system WHERE id=?";
      const [response] = await connection.execute(DeleteAboutItem, [
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
    console.error("Error deleting material:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const editAboutSystem = async (req, res) => {
  const { dataEdit, title ,dataId} = req.body;
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const trimmedEdit_data = dataEdit.trim();
      const trimmeTtitle = title.trim();
      const updateQuery = `UPDATE about_system SET title =?,text=? WHERE id=?`;
      const [response] = await connection.execute(updateQuery, [
        trimmeTtitle,
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
module.exports = {
  aboutSystemAdd,
  getDataAbout,
  deleteAboutById,
  editAboutSystem,
};