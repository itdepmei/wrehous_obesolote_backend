const { connect } = require("../../Config/db");
const pusher = require("../../utils/pusherINfo"); // Ensure pusher is configured correctly
const createLogEntry = require("../../utils/createLog");
const {insertNotification} = require("../../utils/createNotifction");
const { logger } = require("../../middleware/errorHandel");
const storeDataRegister = async (req, res) => {
  const {
    formData,
    entity_id,
    ministry_id,
    user_id,
    warehouse_id,
    lab_id,
    factory_id,
  } = req.body;
  const {
    name,
    measuring_id,
    specification,
    code,
    origin,
    minimum_stock_level,
  } = formData;
  // Trim fields
  console.log(req.body);

  const trimmedFields = {
    name: name?.trim() || "",
    specification: specification?.trim() || "",
    minimum_stock_level: minimum_stock_level?.trim(),
    code: code?.trim() || "",
  };
  const {
    name: trimmedName,
    specification: trimmedSpecification,
    minimum_stock_level: trimmedMinimumStockLevel,
    code: trimmedCode,
  } = trimmedFields;

  // Validate required fields
  if (
    !trimmedName ||
    !measuring_id ||
    !trimmedMinimumStockLevel ||
    !trimmedCode ||
    !entity_id ||
    !ministry_id ||
    !warehouse_id ||
    !factory_id ||
    !lab_id
  ) {
    return res.status(400).json({ message: "أدخل البيانات المطلوبة" });
  }
  if (isNaN(trimmedMinimumStockLevel) || trimmedMinimumStockLevel <= 0) {
    return res
      .status(400)
      .json({ message: "يرجى إدخال الحد الأدنى للمخزون صالح" });
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    const userAuth = req.user._id; // Authenticated user ID
    try {
      const checkCodeQuery = `SELECT COUNT(*) AS count FROM store_data WHERE cod_material = ? AND entity_id = ?`;
      const [codeCheckResult] = await connection.execute(checkCodeQuery, [
        trimmedCode,
        entity_id,
      ]);
      if (codeCheckResult[0].count > 0) {
        return res
          .status(400)
          .json({ message: "الرقم الرمزي موجود مسبقًا، يرجى إدخال كود جديد" });
      }
      // Insert new record
      const insertQuery = `
        INSERT INTO store_data 
        (name_of_material, measuring_id, specification,
          origin, cod_material, user_id, entity_id, ministry_id, 
         warehouse_id, minimum_stock_level, Laboratory_id, factory_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const [response] = await connection.execute(insertQuery, [
        trimmedName,
        measuring_id,
        trimmedSpecification,
        origin || null,
        trimmedCode,
        user_id,
        entity_id,
        ministry_id,
        warehouse_id,
        trimmedMinimumStockLevel,
        lab_id || null,
        factory_id || null,
      ]);

      if (response.affectedRows > 0) {
        const logInfo = `تم إدراج المنتج ${trimmedName} من قبل المستخدم ${userAuth}`;
        await createLogEntry(connection, 1, user_id, entity_id, logInfo,2); // Assuming createLogEntry is an async function
        return res.status(201).json({ message: "تم أضافة المادة بنجاح" });
      } else {
        return res.status(500).json({ message: "لم يتم إضافة المادة" });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error registering material:", error);
    return res.status(500).json({ message: "خطأ في النظام الداخلي" });
  }
};

const GetDataStoreData = async (req, res) => {
  try {
    const { ministry_id, entity_id, store_id } = req.query;
    console.log(req.query);
    // Validate input
    if (!ministry_id || !entity_id) {
      return res
        .status(400)
        .json({ message: "معرف الوزارة أو الجهة غير موجود" });
    }
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT
          sto.*,
          m.measuring_unit,
          w.name AS warehouse_name,
          u.user_name
        FROM store_data sto
        LEFT JOIN measuring_unit m ON sto.measuring_id = m.unit_id
        LEFT JOIN users_management u ON sto.user_id = u.id
        LEFT JOIN warehouse w ON sto.warehouse_id = w.id
        WHERE sto.ministry_id = ? AND sto.entity_id = ? AND sto.warehouse_id=?
      `;
      const [rows] = await connection.execute(query, [
        ministry_id,
        entity_id,
        store_id,
      ]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "لا توجد بيانات في المستودع" });
      }
      return res.status(200).json({ data: rows });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching inventory data:", error.message, error.stack);
    return res
      .status(500)
      .json({ message: "حدث خطأ أثناء جلب بيانات المخزون" });
  }
};

const storGetDataById = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      // Query to fetch inventory data with a LEFT JOIN to include related data
      const query = `
           SELECT
          sto.*,
          m.measuring_unit,
          w.name AS warehouse_name,
          u.user_name
        FROM store_data sto
        LEFT JOIN measuring_unit m ON sto.measuring_id = m.unit_id
        LEFT JOIN users_management u ON sto.user_id = u.id
        LEFT JOIN warehouse w ON sto.warehouse_id = w.id
        WHERE sto.id = ?;
      `;
      const [rows] = await connection.execute(query, [req.params.id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "لا توجد بيانات في المستودع" });
      }
      return res.status(200).json({ data: rows[0] });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching inventory data:", error);
    return res
      .status(500)
      .json({ message: "حدث خطأ أثناء جلب بيانات المخزون" });
  }
};
const inventoryGetDataByCode = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    console.log(req.query);
    try {
      // Query to fetch inventory data with a LEFT JOIN to include related data
      const query = `
        SELECT * FROM  store_data WHERE cod_material = ? AND entity_id = ? AND warehouse_id = ?;
      `;
      const [rows] = await connection.execute(query, [
        req.query.search_term.trim(),
        req.query.entity_id,
        req.query.warehouse_id,
      ]);
      console.log(rows);
      if (rows.length === 0) {
        return res.status(404).json({ message: "لا توجد بيانات في المستودع" });
      }
      return res.status(200).json({ data: rows[0] });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching inventory data:", error);
    return res
      .status(500)
      .json({ message: "حدث خطأ أثناء جلب بيانات المخزون" });
  }
};
/**
 * Handles updating an existing store data entry.
 * @param {Object} req.body - request body with updated store data
 * @param {number} req.body.storeData_id - store data ID
 * @param {number} req.body.user_id - user ID
 * @param {number} req.body.entity_id - entity ID
 * @returns {Promise<Object>} - response with message and inserted data
 */
const StorDataEdit = async (req, res) => {
  const { formData, storeData_id, user_id, entity_id } = req.body;
  const userAuth = req.user._id; // Authenticated user ID

  // Extract fields from formData
  const {
    name,
    measuring_id,
    specification,
    code,
    origin,
    minimum_stock_level,
  } = formData;

  // Trim fields
  const trimField = (field) => field?.trim() || "";
  const trimmedFields = {
    name: trimField(name),
    specification: trimField(specification),
    code: trimField(code),
  };
  const {
    name: trimmedName,
    specification: trimmedSpecification,
    code: trimmedCode,
  } = trimmedFields;

  // Validate required fields
  if (!trimmedName || !measuring_id || minimum_stock_level === undefined) {
    return res.status(400).json({ message: "أدخل البيانات المطلوبة" });
  }

  // Validate numerical fields
  const isValidNumber = (value) => !isNaN(Number(value)) && Number(value) >= 0;
  const numericFields = {
    "الحد الأدنى للمخزون": minimum_stock_level,
  };
  for (const [field, value] of Object.entries(numericFields)) {
    if (!isValidNumber(value)) {
      return res
        .status(400)
        .json({ message: `${field} يجب أن يكون رقمًا صحيحًا وغير سالب` });
    }
  }

  try {
    const pool = await connect();
    const connection = await pool.getConnection();

    try {
      // Check if the code already exists
      // const checkCodeQuery = `SELECT COUNT(*) AS count FROM store_data WHERE cod_material = ? AND entity_id = ?`;
      // const [codeCheckResult] = await connection.execute(checkCodeQuery, [
      //   trimmedCode,
      //   entity_id,
      // ]);
      // if (codeCheckResult[0].count > 0) {
      //   return res
      //     .status(400)
      //     .json({ message: "الرقم الرمزي موجود مسبقًا، يرجى إدخال كود جديد" });
      // }

      // Update store data
      const updateQuery = `
        UPDATE store_data 
        SET name_of_material = ?,
            measuring_id = ?,
            specification = ?,
            origin = ?,
            cod_material = ?,
            minimum_stock_level = ?
        WHERE id = ?
      `;
      console.log(
        trimmedName,
        measuring_id,
        trimmedSpecification,
        origin,
        trimmedCode,
        minimum_stock_level,
        storeData_id
      );

      const [response] = await connection.execute(updateQuery, [
        trimmedName,
        measuring_id,
        trimmedSpecification,
        origin,
        trimmedCode,
        minimum_stock_level,
        storeData_id,
      ]);

      if (response.affectedRows > 0) {
        const logInfo = `تم تحديث المنتج "${trimmedName}" من قبل المستخدم "${userAuth}"، }`;
        await createLogEntry(connection, 1, user_id, storeData_id, logInfo,2);
        return res.status(201).json({ message: "تم تحديث المادة بنجاح" });
      } else {
        return res
          .status(404)
          .json({ message: "المادة غير موجودة أو لم يتم تحديثها" });
      }
    } catch (error) {
      console.error("Database operation failed:", error);
      return res.status(500).json({ message: "خطأ في تحديث المادة" });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error connecting to the database:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Function to handle notifications
const SearchStoreData = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    // Pagination setup
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    // Initialize search conditions and query parameters
    let searchConditions = [];
    let queryParams = [req.query.entity_id, req.query.warehouse_id]; // Start with mandatory params
    // Add search conditions based on search_term (searches across multiple fields)
    if (req.query.search_term) {
      searchConditions.push(`(
        sto.cod_material LIKE ? OR 
        sto.name_of_material LIKE ? OR 
        sto.specification LIKE ?
      )`);
      const searchTerm = `%${req.query.search_term}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }
    // Add state filter if provided
    // if (req.query.state_id) {
    //   searchConditions.push("i.state_id = ?");
    //   queryParams.push(req.query.state_id);
    // }
    // Construct WHERE clause
    const whereClause = searchConditions.length
      ? `AND ${searchConditions.join(" AND ")}`
      : "";
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) AS count
      FROM store_data sto
      LEFT JOIN measuring_unit m ON sto.measuring_id = m.unit_id
      LEFT JOIN users_management u ON sto.user_id = u.id
      LEFT JOIN warehouse w ON sto.warehouse_id = w.id
      WHERE sto.entity_id = ? AND sto.warehouse_id = ?
      ${whereClause};
    `;
    const [totalRows] = await connection.execute(countQuery, queryParams);
    const totalItems = totalRows[0].count;
    const totalPages = Math.ceil(totalItems / limit);

    // Get data with pagination
    const dataQuery = `
      SELECT 
          sto.*, 
          m.measuring_unit, 
          w.name AS warehouse_name,
          u.user_name
      FROM 
          store_data sto
      LEFT JOIN measuring_unit m ON sto.measuring_id = m.unit_id
      LEFT JOIN users_management u ON sto.user_id = u.id
      LEFT JOIN warehouse w ON sto.warehouse_id = w.id
      WHERE sto.entity_id = ? AND sto.warehouse_id = ?
      ${whereClause}
      ORDER BY sto.id DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

    const [rows] = await connection.execute(dataQuery, queryParams);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "لا توجد بيانات متطابقة مع معايير البحث",
        pagination: {
          totalItems: 0,
          totalPages: 0,
          currentPage: page,
          itemsPerPage: limit,
        },
      });
    }

    res.status(200).json({
      response: rows,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("An error occurred: ", error.message);
    res.status(500).json({
      message: "حدث خطأ أثناء البحث",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};


const deleteStorDataById = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const deleteWareHouseQuery = "DELETE FROM store_data WHERE id = ?";
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
const dataStoreRegisterAsForLoop = async (req, res) => {
  const { data } = req.body;
  const materials = JSON.parse(data);
  console.log(materials);
  if (!materials || !Array.isArray(materials) || materials.length === 0) {
    logger.error("Invalid or empty materials data provided.");
    return res.status(400).json({ message: "Invalid or empty data provided." });
  }

  logger.info("Starting inventory registration process.");
  const pool = await connect();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction(); // Start transaction
    const existingMaterials = []; // Store messages about existing materials
    for (const material of materials) {
      const {
        code,
        nameMartials,
        origin,
        status_martials,
        measuring_unit,
        specification,
        minimum_stock_level,
        ministry_id,
        entity_id,
        user_id,
        warehouseId,
        lab_id,
        factory_id,
        balance,
      } = material;
      // Validate dependent tables
      const [[rowsMeasuringUnit], [rowsStateMaterial]] = await Promise.all([
        connection.execute(
          `SELECT * FROM measuring_unit WHERE measuring_unit = ?`,
          [measuring_unit]
        ),
        connection.execute(`SELECT * FROM state_martial WHERE state_name = ?`, [
          status_martials,
        ]),
      ]);

      const unitId = rowsMeasuringUnit[0].unit_id;
      const stateId = rowsStateMaterial[0].id;
      const checkCodeQuery = `SELECT COUNT(*) AS count FROM store_data WHERE cod_material = ? AND entity_id = ?`;
      const [codeCheckResult] = await connection.execute(checkCodeQuery, [
        code,
        entity_id,
      ]);
      if (codeCheckResult[0].count > 0) {
        return res
          .status(400)
          .json({ message: "الرقم الرمزي موجود مسبقًا، يرجى إدخال كود جديد" });
      }
      // const [existing] = await connection.execute(
      //   `SELECT * FROM inventory WHERE name_of_material = ? AND mainClass_id = ? AND entity_id = ? AND warehouse_id=?`,
      //   [nameMartials, mainClassId, entity_id, warehouse_id]
      // );
      // if (existing.length) {
      //   logger.info("Material already exists.", { nameMartials });
      //   existingMaterials.push(`Material ${nameMartials} already exists.`);
      //   continue;
      // }
      // Insert material into inventory
      const insertQuery = `
        INSERT INTO store_data 
        (name_of_material, state_id, measuring_id, specification,
          origin, cod_material, user_id, entity_id, ministry_id, 
         warehouse_id, minimum_stock_level, Laboratory_id, factory_id,balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const [response] = await connection.execute(insertQuery, [
        nameMartials,
        stateId,
        unitId,
        specification,
        origin,
        code,
        user_id,
        entity_id,
        ministry_id,
        warehouseId,
        minimum_stock_level,
        lab_id,
        factory_id,
        balance || 0,
      ]);

      if (response.affectedRows > 0) {
        logger.info("Material inserted successfully.", { nameMartials });
      }
    }
    await connection.commit(); // Commit transaction
    logger.info("Transaction committed successfully.");
    res.status(201).json({
      message: "Materials registered successfully.",
      existingMaterials,
    });
  } catch (error) {
    console.log(error);

    logger.error("Error occurred during registration.", { error });
    await connection.rollback(); // Rollback transaction
    res.status(500).json({ message: "Internal server error." });
  } finally {
    connection.release(); // Release connection
    logger.info("Database connection released.");
  }
};

module.exports = {
  storeDataRegister,
  GetDataStoreData,
  storGetDataById,
  SearchStoreData,
  StorDataEdit,
  deleteStorDataById,
  dataStoreRegisterAsForLoop,
  inventoryGetDataByCode,
  
};
