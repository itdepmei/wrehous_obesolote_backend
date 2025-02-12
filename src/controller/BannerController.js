const { connect } = require("../Config/db");
const BannerRegister = async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    res.status(400).json({ message: "يرجا أدخال المعلومات" });
    return;
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const insertQuery =
        "INSERT INTO banner (description_banner,title) VALUES (?,?)";
      const [response] = await connection.execute(insertQuery, [
        description,
        title,
      ]);
      res.status(201).json({ message: "تم الاضافة بنجاح", response });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error registering ministry:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const getDataBanner = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    const getDataStateNameQuery = "SELECT * FROM banner";
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
const deleteBannerById = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const DeleteMinistryItem = "DELETE FROM banner WHERE id=?";
      const [response] = await connection.execute(DeleteMinistryItem, [
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
const EditBannerName = async (req, res) => {
  const { dataEdit, dataEdit2, dataId } = req.body;
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const trimmedEdit_data = dataEdit.trim();
      const trimmedEdit_data2 = dataEdit2.trim();
      const updateQuery = `UPDATE banner SET title =? ,description_banner=? WHERE id=?`;
      const [response] = await connection.execute(updateQuery, [
        trimmedEdit_data,
        trimmedEdit_data2,
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
  BannerRegister,
  getDataBanner,
  deleteBannerById,
  EditBannerName,
};
