const { connect } = require("../../Config/db");
const jopTitleRegister = async (req, res) => {
  const { job } = req.body;
  if (!job) {
    return res.status(400).json({ message: "يرجا أدخال المعلومات" });
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const checkJobQuery = "SELECT * FROM job_title WHERE job_name = ?";
      const [existingJop] = await connection.execute(checkJobQuery, [job]);
      if (existingJop.length > 0) {
        res.status(400).json({ message: " العنوان الوظيفي موجود مسبقا" });
        return;
      }
      const insertQuery = "INSERT INTO job_title (job_name) VALUES (?)";
      const [response] = await connection.execute(insertQuery, [job]);
      res.status(201).json({ message: "تم الاضافة بنجاح", response });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error registering job title:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const getDataJobTitle = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    const getDataJobTitleQuery = "SELECT * FROM job_title";
    const [rows] = await connection.execute(getDataJobTitleQuery);
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

const editJobTitle = async (req, res) => {
  const { dataEdit,dataId } = req.body;
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const trimmedEdit_data = dataEdit.trim();
      const updateQuery = `UPDATE job_title SET job_name =? WHERE id=?`;
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
const deleteJobTitleById = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const deletejoptitleById = "DELETE FROM job_title WHERE id=?";
      const [response] = await connection.execute(deletejoptitleById, [
        req.params.id,
      ]);
      if (response.affectedRows > 0) {
        return res.status(200).json({ message: "تم الحذف بنجاح" });
      } else {
        return res.status(404).json({ message: "العنصر غير موجود" });
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
  jopTitleRegister,
  getDataJobTitle,
  deleteJobTitleById,
  editJobTitle,
};
