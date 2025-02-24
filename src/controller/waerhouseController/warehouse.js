const { connect } = require("../../config/db");
const { getInformation } = require("../../query/userMangeController-db");
const createLogEntry = require("../../utils/createLog");
const warehouseRegister = async (req, res) => {
  const {
    name,
    location,
    status,
    entity_id,
    ministry_id,
    user_id,
    code,
    factory_id,
    lab_id,
  } = req.body;
  // Validate required fields
  // console.log(req.body);

  const requiredFields = [
    { field: name, message: "اسم المستودع مطلوب" },
    { field: location, message: "الموقع مطلوب" },
  ];
  // Check for missing or invalid fields
  const missingField = requiredFields.find((req) => !req.field);
  if (missingField) {
    return res.status(400).json({ message: missingField.message });
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    const userAuth = req.user._id; // Authenticated user ID
    try {
      const insertQuery = `
          INSERT INTO warehouse 
          (name, location, status, user_id, entity_id, ministry_id,code,factory_id,laboratory_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?,?)
        `;
      const [response] = await connection.execute(insertQuery, [
        name.trim(),
        location.trim(),
        status || "نشط",
        user_id,
        entity_id,
        ministry_id,
        code,
        factory_id,
        lab_id,
      ]);
      if (response.affectedRows > 0) {
        const insertId = response.insertId;
        // Logging
        const logInfo = `تم إنشاء مستودع جديد "${name}" بواسطة المستخدم ${userAuth}`;
        await createLogEntry(connection, 1, user_id, entity_id, logInfo, 2);
        return res.status(201).json({
          message: "تم إضافة المستودع بنجاح",
          warehouseId: insertId,
        });
      }

      return res.status(500).json({ message: "فشل في إنشاء المستودع" });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error registering warehouse:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء إضافة المستودع",
      error: error.message,
    });
  }
};
const getWarehouseData = async (req, res) => {
  const { entity_id, lab_id, factory_id } = req.query;
  try {
    console.log("sdlfkjhskldjfhlksd",req.query);
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT 
          warehouse.*,
          users.user_name, 
          Fa.Factories_name,
          La.Laboratory_name
        FROM warehouse
        LEFT JOIN users_management AS users ON warehouse.user_id = users.id
        LEFT JOIN factories AS Fa ON warehouse.factory_id = Fa.id
        LEFT JOIN laboratories AS La ON warehouse.laboratory_id = La.id
        WHERE 1=1 AND warehouse.entity_id = ? 
      `;
      const params = [entity_id];
      if (lab_id && lab_id !== "null" && lab_id !== "undefined") {
        query += " AND warehouse.laboratory_id = ?";
        params.push(lab_id);
      }
      if (factory_id && factory_id !== "null" && factory_id !== "undefined") {
        query += " AND warehouse.factory_id = ?";
        params.push(factory_id);
      }
      // Execute the query
      console.log(params);

      const [rows] = await connection.execute(query, params);
      if (rows.length > 0) {
        return res.status(200).json({
          message: "تم استرجاع بيانات المستودع بنجاح",
          data: rows,
        });
      } else {
        return res
          .status(404)
          .json({ message: "لم يتم العثور على بيانات المستودع" });
      }
    } finally {
      // Ensure the connection is released
      connection.release();
    }
  } catch (error) {
    // Log and return error details
    console.error("Error fetching warehouse data:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء استرجاع بيانات المستودع",
      error: error.message,
    });
  }
};
const getWarehouseDataByEntity_id = async (req, res) => {
  const { entity_id } = req.query;
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT 
          warehouse.*,
          users.user_name, 
          Fa.Factories_name,
          La.Laboratory_name
        FROM warehouse
        LEFT JOIN users_management AS users ON warehouse.user_id = users.id
        LEFT JOIN factories AS Fa ON warehouse.factory_id = Fa.id
        LEFT JOIN laboratories AS La ON warehouse.laboratory_id = La.id
        WHERE 1=1 AND warehouse.entity_id = ? 
      `;
      const params = [entity_id];
      // Execute the query
      const [rows] = await connection.execute(query, params);
      if (rows.length > 0) {
        return res.status(200).json({
          message: "تم استرجاع بيانات المستودع بنجاح",
          data: rows,
        });
      } else {
        return res
          .status(404)
          .json({ message: "لم يتم العثور على بيانات المستودع" });
      }
    } finally {
      // Ensure the connection is released
      connection.release();
    }
  } catch (error) {
    // Log and return error details
    console.error("Error fetching warehouse data:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء استرجاع بيانات المستودع",
      error: error.message,
    });
  }
};
const getWarehouseDataById = async (req, res) => {
  const { store_id } = req.query;
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      let query = ` SELECT * FROM warehouse WHERE id = ?`;
      // Execute the query
      const [rows] = await connection.execute(query, [store_id]);
      if (rows.length > 0) {
        return res.status(200).json({
          message: "تم استرجاع بيانات المستودع بنجاح",
          data: rows[0],
        });
      } else {
        return res
          .status(404)
          .json({ message: "لم يتم العثور على بيانات المستودع" });
      }
    } finally {
      // Ensure the connection is released
      connection.release();
    }
  } catch (error) {
    // Log and return error details
    console.error("Error fetching warehouse data:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء استرجاع بيانات المستودع",
      error: error.message,
    });
  }
};
const warehouseEdit = async (req, res) => {
  const { name, location, capacity, status, used, code, warehouse_id } =
    req.body;
  // Validate required fields
  const user_id = req.user._id;
  const requiredFields = [
    { field: warehouse_id, message: "معرف المستودع مطلوب" },
    { field: name, message: "اسم المستودع مطلوب" },
    { field: location, message: "الموقع مطلوب" },
    { field: capacity, message: "السعة الكلية مطلوبة" },
  ];
  // Check for missing or invalid fields
  const missingField = requiredFields.find((req) => !req.field);
  if (missingField) {
    return res.status(400).json({ message: missingField.message });
  }
  // Validate capacity
  const parsedCapacity = Number(capacity);
  if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
    return res.status(400).json({ message: "يجب أن تكون السعة رقمًا موجبًا" });
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    const userAuth = req.user; // Authenticated user ID
    try {
      const updateQuery = `
          UPDATE warehouse
          SET 
            name = ?,
            location = ?,
            capacity = ?,
            status = ?,
            used = ?,
            code=?
          WHERE id = ?
        `;
      const [response] = await connection.execute(updateQuery, [
        name.trim(),
        location.trim(),
        parsedCapacity,
        status,
        used,
        code,
        warehouse_id,
      ]);
      if (response.affectedRows > 0) {
        // Logging
        const [userInfoRows] = await connection.execute(getInformation, [
          userAuth._id,
        ]);
        const userInfo = userInfoRows[0];
        const logInfo = `تم تحديث بيانات المستودع "${name}" بواسطة المستخدم ${userAuth}`;
        await createLogEntry(
          connection,
          3,
          user_id,
          userInfo?.entities_id,
          logInfo,
          2
        );
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
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const deleteWareHouseQuery = "DELETE FROM warehouse WHERE id = ?";
    const [response] = await connection.execute(deleteWareHouseQuery, [
      req.params.id,
    ]);
    // Check if the main class was deleted
    if (response.affectedRows > 0) {
      // Commit the transaction if everything went fine
      await connection.commit();
      return res.status(200).json({ message: "تم الحذف بنجاح" });
    } else {
      // Rollback if no rows were affected (main class not found)
      await connection.rollback();
      return res.status(404).json({ message: "Item not found" });
    }
  } catch (error) {
    // Rollback on any general error
    await connection.rollback();
    console.error("Error deleting main class:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    // Ensure connection is always released
    connection.release();
  }
};
module.exports = {
  warehouseRegister,
  getWarehouseData,
  warehouseEdit,
  deleteWareHouseById,
  getWarehouseDataById,
  getWarehouseDataByEntity_id,
};
