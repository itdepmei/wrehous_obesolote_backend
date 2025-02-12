const { connect } = require("../../Config/db");
const unitRegister = async (req, res) => {
  const { unitMeasuring, entities_id } = req.body;
  if (!unitMeasuring) {
    return res.status(400).json({ message: "أدخل الصنف الرئيسي" });
  }
  try {
    const measuring_unit = unitMeasuring.trim();
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const insertQuery =
        "INSERT INTO measuring_unit (measuring_unit, entities_id) VALUES (?, ?)";
      const [response] = await connection.execute(insertQuery, [
        measuring_unit,
        entities_id,
      ]);
      return res.status(201).json({ message: "تم الاضافة بنجاح", response });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error registering unit:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
const getDataUnitsById = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const entitiesId = dataId;
      if (!entitiesId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      const getDataUnitQuery =
        "SELECT * FROM measuring_unit WHERE entities_id=?";
      const [rows] = await connection.execute(getDataUnitQuery, [entitiesId]);

      if (rows.length === 0) {
        return res.status(404).json({ message: "No main_Class found" });
      }
      return res.status(200).json({ response: rows });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching mainClass data:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
const getAllDataUnits = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const getDataUnitQuery = "SELECT * FROM measuring_unit";
      const [rows] = await connection.execute(getDataUnitQuery);
      if (rows.length === 0) {
        return res.status(404).json({ message: "لاتةجد وحدات قياس مخزونة" });
      }
      return res.status(200).json({ response: rows });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching Unite measuring data:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
const editUnit = async (req, res) => {
  const { dataEdit, dataId } = req.body;
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const trimmedEdit_data = dataEdit.trim();
      const updateQuery = `UPDATE measuring_unit SET measuring_unit =? WHERE unit_id=?`;
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
const deleteUnitById = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const DeleteUnitItem = "DELETE FROM measuring_unit WHERE unit_id=?";
      const [response] = await connection.execute(DeleteUnitItem, [
        req.param.id,
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
  unitRegister,
  getDataUnitsById,
  getAllDataUnits,
  editUnit,
  deleteUnitById,
};
