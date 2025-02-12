const { connect } = require("../../Config/db");
const { getInformation } = require("../../query/userMangeController-db");
const createLogEntry = require("../../utils/createLog");

const FactoriesRegister = async (req, res) => {
  const { name, location, state_id, entity_id, user_id } = req.body;
  console.log(req.body);

  // Validate required fields
  const requiredFields = [
    { field: name, message: "اسم المستودع مطلوب" },
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
        INSERT INTO factories 
        (Factories_name, location, state_id, entity_id, user_id)
        VALUES (?, ?, ?, ?, ?)
      `;
      const [response] = await connection.execute(insertQuery, [
        name.trim(),
        location.trim(),
        state_id || "نشط",
        entity_id,
        user_id,
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

const getFactoriesData = async (req, res) => {
  const { entity_id, ministry_id } = req.query;
  try {
    const pool = await connect();
    const connection = await pool.getConnection();

    try {
      const query = `
        SELECT 
          id, Factories_name AS name, location, 
           state_id AS status, 
          entity_id, user_id
        FROM factories
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

const warehouseEdit = async (req, res) => {
  const {
    warehouse_id,
    name,
    location,
    capacity,
    manager,
    sections,
    status,
    used,
  } = req.body;

  const requiredFields = [
    { field: warehouse_id, message: "معرف المستودع مطلوب" },
    { field: name, message: "اسم المستودع مطلوب" },
    { field: location, message: "الموقع مطلوب" },
    { field: capacity, message: "السعة الكلية مطلوبة" },
    { field: manager, message: "اسم المدير مطلوب" },
  ];
  const missingField = requiredFields.find((field) => !field.field);
  if (missingField) {
    return res.status(400).json({ message: missingField.message });
  }

  const parsedCapacity = Number(capacity);
  if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
    return res.status(400).json({ message: "يجب أن تكون السعة رقمًا موجبًا" });
  }

  try {
    const pool = await connect();
    const connection = await pool.getConnection();

    try {
      const updateQuery = `
        UPDATE factories
        SET 
          Factories_name = ?, location = ?, capacity = ?, 
          manager = ?, sections_warehouse = ?, status_id = ?, used = ?
        WHERE id = ?
      `;

      const parsedSections = Array.isArray(sections)
        ? sections.join(", ")
        : sections;

      const [response] = await connection.execute(updateQuery, [
        name.trim(),
        location.trim(),
        parsedCapacity,
        manager.trim(),
        parsedSections,
        status || "نشط",
        used,
        warehouse_id,
      ]);

      if (response.affectedRows > 0) {
        const logInfo = `تم تحديث بيانات المستودع "${name}" بواسطة المستخدم ${req.user._id}`;
        await createLogEntry(connection, 3, req.user._id, null, logInfo);

        return res.status(200).json({
          message: "تم تحديث بيانات المستودع بنجاح",
        });
      }

      return res.status(404).json({ message: "المستودع غير موجود" });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error updating warehouse:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء تحديث بيانات المستودع",
      error: error.message,
    });
  }
};

const deleteWareHouseById = async (req, res) => {
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

module.exports = {
  FactoriesRegister,
  getFactoriesData,
  warehouseEdit,
  deleteWareHouseById,
};
