const { connect } = require("../../Config/db");
const createLogEntry = require("../../utils/createLog");
const LabRegister = async (req, res) => {
  const {
    name,
    location,
    status,
    entity_id,
    user_id,
    description,
    specialization,
    factory_id,
  } = req.body;
  // Validate required fields
  // console.log(req.body);
  const requiredFields = [
    { field: name, message: "اسم المعمل مطلوب" },
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
      const insertQuery = `
    INSERT INTO laboratories (Laboratory_name, location, status, entity_id, user_id, specialization, description, factory_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const [response] = await connection.execute(insertQuery, [
        name.trim(),
        location.trim(),
        status || "نشط",
        entity_id,
        user_id,
        specialization,
        description,
        factory_id,
      ]);
      if (response.affectedRows > 0) {
        const insertId = response.insertId;
        const logInfo = `تم إنشاء مستودع جديد "${name}" بواسطة المستخدم ${req.user._id}`;
        await createLogEntry(connection, 1, user_id, entity_id, logInfo);
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

const getLabData = async (req, res) => {
  const { entity_id, factory_id } = req.query;
  try {
    console.log(req.query);

    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      // Base query to fetch lab data with joined tables
      let query = `
        SELECT 
          La.id AS lab_id,
          La.*,
          e.Entities_name,
          us.user_name,
          f.Factories_name,
          (
            SELECT COUNT(*) 
            FROM warehouse 
            WHERE warehouse.laboratory_id = La.id
          ) AS warehouse_count
        FROM laboratories AS La
        LEFT JOIN factories AS f ON La.factory_id = f.id
        LEFT JOIN users_management AS us ON La.user_id = us.id
        LEFT JOIN entities AS e ON La.entity_id = e.id
        WHERE 1=1
      `;
      // Dynamic conditions based on query parameters
      const conditions = [];
      const params = [];
      if (entity_id) {
        conditions.push("La.entity_id = ?");
        params.push(entity_id);
      }
      if (factory_id && factory_id !== "null" && factory_id !== "undefined") {
        conditions.push("La.factory_id = ?");
        params.push(factory_id);
      }
      // Append conditions to the query
      if (conditions.length > 0) {
        query += ` AND ${conditions.join(" AND ")}`;
      }
      // Execute the query
      const [rows] = await connection.execute(query, params);
      // Return data or 404 if no results
      if (rows.length > 0) {
        return res.status(200).json({
          success: true,
          data: rows,
        });
      }

      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على بيانات المختبر",
      });
    } finally {
      // Ensure connection is released
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching lab data:", error);

    // Handle internal server error
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء استرجاع بيانات المختبر",
      error: error.message,
    });
  }
};

const getLabDataByEntity_id = async (req, res) => {
  const { entity_id } = req.query;
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      // Base query to fetch lab data with joined tables
      let query = `
        SELECT * FROM laboratories WHERE entity_id = ?
      `;
      const [rows] = await connection.execute(query, [entity_id]);
      // Return data or 404 if no results
      if (rows.length > 0) {
        return res.status(200).json({
          success: true,
          data: rows,
        });
      }
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على بيانات المختبر",
      });
    } finally {
      // Ensure connection is released
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching lab data:", error);

    // Handle internal server error
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء استرجاع بيانات المختبر",
      error: error.message,
    });
  }
};
const laboratoriesEdit = async (req, res) => {
  const { id, name, location, status, user_id, description, specialization } =
    req.body;
  const requiredFields = [
    { field: name, message: "اسم المعمل  مطلوب" },
    { field: location, message: "الموقع مطلوب" },
  ];
  console.log(req.body);
  const missingField = requiredFields.find((field) => !field.field);
  if (missingField) {
    return res.status(400).json({ message: missingField.message });
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const updateQuery = `
         UPDATE laboratories
          SET 
            Laboratory_name = ?,
            location = ?,
            status = ?,
            user_id = ?,
            specialization = ?,
            description = ?
          WHERE id = ?
      `;
      const [response] = await connection.execute(updateQuery, [
        name ? name.trim() : null,
        location ? location.trim() : null,
        status || "نشط",
        user_id || null,
        specialization || null,
        description || null,
        id,
      ]);

      if (response.affectedRows > 0) {
        const logInfo = `تم تحديث بيانات المعمل "${name}" بواسطة المستخدم ${req.user._id}`;
        await createLogEntry(connection, 3, req.user._id, null, logInfo);
        return res.status(200).json({
          message: "تم تحديث بيانات المعمل بنجاح",
        });
      }

      return res.status(404).json({ message: "المعمل غير موجود" });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error updating Laboratory:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء تحديث بيانات المعمل",
      error: error.message,
    });
  }
};

const deleteLaboratoriesById = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const deleteQuery = "DELETE FROM laboratories WHERE id = ?";
      const [response] = await connection.execute(deleteQuery, [req.params.id]);

      if (response.affectedRows > 0) {
        await connection.commit();
        return res.status(200).json({ message: "تم الحذف بنجاح" });
      }

      await connection.rollback();
      return res.status(404).json({ message: "لم يتم العثور على العنصر" });
    } catch (error) {
      await connection.rollback();
      console.error("Error deleting warehouse:", error);
      return res.status(500).json({ message: "حدث خطأ أثناء الحذف" });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error deleting warehouse:", error);
    return res.status(500).json({ message: "خطأ داخلي" });
  }
};
const getWarehouseAndUserData = async (req, res) => {
  const { entity_id, user_id } = req.query;
  // Build the query based on whether we have user_id or entity_id
  let query = `
    SELECT 
    La.id AS lab_id,
      La.entity_id,
      La.factory_id,
      La.status,
      e.Entities_name,
      La.Laboratory_name,
      f.Factories_name     -- Factory name
    FROM laboratories AS La
    LEFT JOIN factories AS f ON La.factory_id = f.id
    LEFT JOIN users_management AS us ON La.user_id = us.id
    LEFT JOIN entities AS e ON La.entity_id = e.id
    WHERE `;
  // Modify query based on whether entity_id or user_id is present
  if (user_id) {
    query += `La.user_id = ?`;
  } else if (entity_id) {
    query += `La.entity_id = ?`;
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
      // console.log(rows);

      if (rows.length > 0) {
        return res.status(200).json({
          message: "تم استرجاع بيانات المستخدم بنجاح",
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
module.exports = {
  LabRegister,
  getLabData,
  laboratoriesEdit,
  deleteLaboratoriesById,
  getWarehouseAndUserData,
  getLabDataByEntity_id,
};
