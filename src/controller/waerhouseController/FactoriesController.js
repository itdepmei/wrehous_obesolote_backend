const { connect } = require("../../config/db");
const createLogEntry = require("../../utils/createLog");

const FactoriesRegister = async (req, res) => {
  const {
    Factories_name,
    location,
    status,
    entity_id,
    user_id,
    // warehouse_id,
    description,
  } = req.body;
  // Validate required fields
  const requiredFields = [
    { field: req.body.Factories_name, message: "اسم المصنع مطلوب" },
    { field: req.body.location, message: "الموقع مطلوب" },
  ];
  const missingField = requiredFields.find((field) => !field.field);
  if (missingField) {
    return res.status(400).json({ message: missingField.message });
  }

  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const insertQuery = `
        INSERT INTO factories 
        (Factories_name, location, status, entity_id, user_id,description)
        VALUES (?, ?, ?, ?, ?,?)
      `;
      const [response] = await connection.execute(insertQuery, [
        Factories_name.trim() || "",
        location.trim(),
        status || "نشط",
        entity_id,
        user_id,
        // warehouse_id,
        description.trim(),
      ]);
      if (response.affectedRows > 0) {
        const insertId = response.insertId;
        const logInfo = `تم إنشاء مستودع جديد "${Factories_name}" بواسطة المستخدم ${req.user._id}`;
        await createLogEntry(connection, 1, user_id, entity_id, logInfo,2);
        return res.status(201).json({
          message: "تم إضافة المصنع بنجاح",
          factoryId: insertId,
        });
      }
      return res.status(500).json({ message: "فشل في إنشاء المصنع" });
    } finally {
      connection.release();
    }
  } catch (error) {
    return res.status(500).json({
      message: "حدث خطأ أثناء إضافة المستودع",
      error: error.message,
    });
  }
};
const getFactoriesData = async (req, res) => {
  const { entity_id } = req.query;
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      let query = `
      SELECT Fa.*,
      Fa.id AS factory_id,
      us.user_name,
      e.Entities_name
    FROM factories AS Fa
    LEFT JOIN users_management AS us ON Fa.user_id = us.id
    LEFT JOIN entities AS e ON Fa.entity_id = e.id
        WHERE 1=1
          ${entity_id ? "AND entity_id = ?" : ""}
      `;
      const params = [];
      if (entity_id) params.push(entity_id);
      const [rows] = await connection.execute(query, params);
      if (rows.length > 0) {
        return res.status(200).json({
          message: "تم استرجاع بيانات المستودع بنجاح",
          data: rows,
        });
      }
      return res
        .status(404)
        .json({ message: "لم يتم العثور على بيانات المستودع" });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching warehouse data:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء استرجاع بيانات المستودع",
      error: error.message,
    });
  }
};
const getFactoryAndUserData = async (req, res) => {
  const { entity_id, user_id } = req.query;
  // Build the query based on whether we have user_id or entity_id
  let query = `
    SELECT 
      Fa.entity_id,
      Fa.id AS factory_id,
      Fa.status,
      us.user_name,
      e.Entities_name,
      Fa.Factories_name     -- Factory name
    FROM factories AS Fa
    LEFT JOIN users_management AS us ON Fa.user_id = us.id
    LEFT JOIN entities AS e ON Fa.entity_id = e.id
    WHERE `;

  // Modify query based on whether entity_id or user_id is present
  if (user_id) {
    query += `Fa.user_id = ?`;
  } else if (entity_id) {
    query += `Fa.entity_id = ?`;
  } else {
    return res
      .status(400)
      .json({ message: "Please provide either user_id or entity_id." });
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      // Execute the query with either user_id or entity_id as the parameter
      const [rows] = await connection.execute(query, [user_id || entity_id]);

      if (rows.length > 0) {
        return res.status(200).json({
          data: rows,
        });
      } else {
        return res.status(404).json({ message: "لا يوجد بيانات متطابقة" });
      }
    } finally {
      connection.release(); // Always release the connection
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "حدث خطأ في الاتصال بقاعدة البيانات",
      error: error.message,
    });
  }
};

const factoriesEdit = async (req, res) => {
  const {
    id,
    Factories_name,
    location,
    status,
    entity_id,
    user_id,
    warehouse_id,
    description,
  } = req.body;

  const requiredFields = [
    { field: Factories_name, message: "اسم المصنع مطلوب" },
    { field: location, message: "الموقع مطلوب" },
  ];
  const missingField = requiredFields.find((field) => !field.field);
  if (missingField) {
    return res.status(400).json({ message: missingField.message });
  }

  try {
    const pool = await connect();
    const connection = await pool.getConnection();

    try {
      const updateQuery = `
        UPDATE factories
        SET 
          Factories_name = ?,
          location = ?,
          status = ?,
          entity_id = ?,
          user_id = ?,
          warehouse_id = ?,
          description = ?
          WHERE id = ?
      `;

      const [response] = await connection.execute(updateQuery, [
        Factories_name.trim(),
        location.trim(),
        status || "نشط",
        entity_id,
        user_id,
        warehouse_id,
        description.trim(),
        id,
      ]);

      if (response.affectedRows > 0) {
        const logInfo = `تم تحديث بيانات المصنع "${Factories_name}" بواسطة المستخدم ${req.user._id}`;
        await createLogEntry(connection, 3, req.user._id, null, logInfo,2);

        return res.status(200).json({
          message: "تم تحديث بيانات المصنع بنجاح",
        });
      }

      return res.status(404).json({ message: "المصنع غير موجود" });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error updating warehouse:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء تحديث بيانات المصنع",
      error: error.message,
    });
  }
};

const deleteFactoriesById = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const deleteQuery = "DELETE FROM factories WHERE id = ?";
      const [response] = await connection.execute(deleteQuery, [req.params.id]);

      if (response.affectedRows > 0) {
        await connection.commit();
        return res.status(200).json({ message: "تم الحذف بنجاح" });
      }

      await connection.rollback();
      return res.status(404).json({ message: "لم يتم العثور على العنصر" });
    } catch (error) {
      await connection.rollback();
      console.error("Error deleting factory:", error);
      return res.status(500).json({ message: "حدث خطأ أثناء الحذف" });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error deleting factory:", error);
    return res.status(500).json({ message: "خطأ داخلي" });
  }
};

module.exports = {
  FactoriesRegister,
  getFactoriesData,
  factoriesEdit,
  deleteFactoriesById,
  getFactoryAndUserData,
};