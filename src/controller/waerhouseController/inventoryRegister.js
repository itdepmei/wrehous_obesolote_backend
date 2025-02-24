const { connect } = require("../../config/db");
const createLogEntry = require("../../utils/createLog");
const { logger } = require("../../middleware/errorHandel");
const { formatDateE } = require("../../utils/function");
const {
  insertInventory,
  updateStoreBalance,
  updateMaterialBalance,
} = require("../../model/invevtoryModel/inventoryModel");
const { getUserDataById } = require("../../model/userModel");
/**
 * Register new inventory entry
 *
 * @param {string} formData - form data with all required fields
 * @param {number} entity_id - entity id
 * @param {number} ministry_id - ministry id
 * @param {number} user_id - user id
 * @param {number} warehouse_id - warehouse id
 * @param {number} material_id - material id
 *
 * @returns {Promise<Object>} - response with message and inserted data
 */

const inventoryRegister = async (req, res) => {
  const {
    formData,
    entity_id,
    ministry_id,
    user_id,
    warehouse_id,
    material_id,
  } = req.body;
  const {
    quantity_incoming_outgoing,
    purchase_date,
    price,
    expiry_date,
    document_number,
    document_date,
    beneficiary,
    document_type,
    production_date,
    state_id,
  } = formData;
  const trimDocumentNumber = document_number?.trim() || "";
  const trimBeneficiary = beneficiary?.trim() || "";

  if (
    !quantity_incoming_outgoing ||
    !warehouse_id ||
    !material_id ||
    !trimDocumentNumber ||
    !trimBeneficiary ||
    !state_id ||
    !production_date ||
    !purchase_date ||
    !expiry_date ||
    !price ||
    !document_date ||
    !document_type
  ) {
    return res.status(400).json({ message: "أدخل البيانات المطلوبة" });
  }

  try {
    await insertInventory([
      quantity_incoming_outgoing,
      formatDateE(expiry_date),
      formatDateE(purchase_date),
      user_id,
      entity_id,
      ministry_id,
      warehouse_id,
      price,
      trimDocumentNumber,
      formatDateE(document_date),
      trimBeneficiary,
      document_type || null,
      material_id,
      formatDateE(production_date),
      state_id,
    ]);

    await updateStoreBalance(
      quantity_incoming_outgoing,
      material_id,
      document_type
    );

    return res.status(200).json({ message: "تمت العملية بنجاح" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: error.message });
  }
};
const inventoryGetData = async (req, res) => {
  try {
    const { entity_id, warehouse_id, document_type } = req.query;
    console.log("Request query:", req.query);
    // Validate required query parameters
    if (!entity_id || !warehouse_id) {
      return res
        .status(400)
        .json({ message: "معلمات الطلب مفقودة أو غير صحيحة" });
    }

    // Establish a connection pool
    const pool = await connect();
    const connection = await pool.getConnection();

    try {
      let parameters = [entity_id, warehouse_id];
      let queryCondition = "";

      // Determine the query condition based on document_type
      if (document_type === "مستند صادر") {
        queryCondition = ` AND i.document_type = ?`;
        parameters.push("مستند صادر");
      } else if (document_type === "مستند وارد") {
        queryCondition = ` AND i.document_type = ?`;
        parameters.push("مستند وارد");
      }
      // Define the main SQL query
      const query = `
        SELECT
          i.*, 
          s.state_name, 
          m.measuring_unit, 
          w.name AS warehouse_name,
          u.user_name,
          sto.name_of_material,
          sto.cod_material,
          sto.specification,
          sto.minimum_stock_level,
          sto.balance,
          sto.origin
        FROM 
          inventory i
        LEFT JOIN store_data sto ON i.material_id = sto.id
        LEFT JOIN state_martial s ON i.state_id = s.id
        LEFT JOIN measuring_unit m ON sto.measuring_id = m.unit_id
        LEFT JOIN users_management u ON sto.user_id = u.id
        LEFT JOIN warehouse w ON i.warehouse_id = w.id
        WHERE i.entity_id = ? AND i.warehouse_id = ?${queryCondition}
      `;
      // Execute the query with the provided parameters
      const [rows] = await connection.execute(query, parameters);

      // Check if rows are returned
      if (rows.length === 0) {
        return res.status(404).json({ message: "لا توجد بيانات في المستودع" });
      }

      // Return fetched data
      return res.status(200).json({ response: rows });
    } finally {
      // Release the database connection
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching inventory data:", error.message, error.stack);
    return res
      .status(500)
      .json({ message: "حدث خطأ أثناء جلب بيانات المخزون" });
  }
};

/**
 * Fetch inventory data by ID with a LEFT JOIN to include related data
 *
 * @param {number} id - inventory id
 * @returns {Promise<Object>} - response with message and fetched data
 */
const inventoryGetDataById = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      // Query to fetch inventory data with a LEFT JOIN to include related data
      const query = `
       SELECT 
          i.* , 
          s.state_name, 
          m.measuring_unit, 
          wr.name AS warehouse_name,
          u.user_name ,
           sto.*
        FROM inventory i
           LEFT JOIN store_data sto ON i.material_id = sto.id
      LEFT JOIN state_martial s ON i.state_id = s.id
        LEFT JOIN measuring_unit m ON sto.measuring_id = m.unit_id
        LEFT JOIN warehouse wr ON sto.warehouse_id = wr.id
        LEFT JOIN users_management u ON sto.user_id = u.id
        WHERE i.id = ?
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
const materialMovements = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      // Query to fetch inventory data with a LEFT JOIN to include related data
      const query = `
        SELECT 
          i.* , 
          s.state_name, 
          m.measuring_unit, 
          wr.name AS warehouse_name,
          u.user_name ,
           sto.*
        FROM inventory i
           LEFT JOIN store_data sto ON i.material_id = sto.id
      LEFT JOIN state_martial s ON i.state_id = s.id
        LEFT JOIN measuring_unit m ON sto.measuring_id = m.unit_id
        LEFT JOIN warehouse wr ON sto.warehouse_id = wr.id
        LEFT JOIN users_management u ON sto.user_id = u.id
        WHERE i.material_id = ?
      `;
      const [rows] = await connection.execute(query, [req.params.id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "لا توجد بيانات في المستودع" });
      }
      return res.status(200).json({ data: rows });
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

const inventoryEdit = async (req, res) => {
  const { formData, inventory_id, material_id, typeOption, originQuantity } =
    req.body;
  const user_id = req.user._id; // Authenticated user ID

  if (!formData || originQuantity === undefined) {
    return res
      .status(400)
      .json({ message: "معلمات الطلب مفقودة أو غير صحيحة" });
  }

  const {
    purchase_date,
    price,
    expiry_date,
    document_number,
    quantity_incoming_outgoing,
    document_date,
    beneficiary,
  } = formData;
  // console.log(req.body);

  if (!quantity_incoming_outgoing) {
    return res.status(400).json({ message: "الرجاء إدخال الكمية المطلوبة" });
  }

  const trimField = (field) => field?.trim() || "";
  const trimmedDocumentNumber = trimField(document_number);
  const trimBeneficiary = trimField(beneficiary);

  try {
    const pool = await connect();
    const connection = await pool.getConnection();

    await updateMaterialBalance(
      connection,
      material_id,
      typeOption,
      quantity_incoming_outgoing,
      originQuantity
    );

    try {
      // Update inventory record
      const updateQuery = `
        UPDATE inventory 
        SET 
          quantity_incoming_outgoing = ?, expiry_date = ?, purchase_date = ?, 
          price = ?, document_number = ?, document_date = ?, beneficiary = ? 
        WHERE id = ?
      `;
      const [response] = await connection.execute(updateQuery, [
        quantity_incoming_outgoing,
        expiry_date,
        purchase_date,
        price,
        trimmedDocumentNumber,
        document_date,
        trimBeneficiary,
        inventory_id,
      ]);

      if (response.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "المادة غير موجودة أو لم يتم تحديثها" });
      }
      const dataUser = await getUserDataById(connection, user_id);
      // Log the action
      const logInfo = `تم تحديث المخزون  رقم الكتاب  ${trimmedDocumentNumber} بواسطة المستخدم ${dataUser.usr_name}`;
      await createLogEntry(connection, 1, user_id, inventory_id, logInfo,2);

      return res.status(200).json({ message: "تم تحديث المادة بنجاح" });
    } catch (error) {
      console.error("Database operation failed:", error);
      return res.status(500).json({ message: "خطأ في تحديث المادة" });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error connecting to the database:", error);
    return res.status(500).json({ message: "خطأ داخلي في الخادم" });
  }
};

// Function to handle notifications
const SearchInventory = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    let searchConditions = [];
    let queryParams = [req.query.entity_id, req.query.warehouse_id];
    if (req.query.search_term) {
      searchConditions.push(`(
        i.document_number LIKE ? OR 
        i.document_type LIKE ? or
        i.state_id LIKE ?
      )`);
      const searchTerm = `%${req.query.search_term}%`;
      queryParams.push(searchTerm, searchTerm);
    }
    if (req.query.state_id) {
      // Ensure state_id exists in store_data
      searchConditions.push("i.state_id = ?");
      queryParams.push(req.query.state_id);
    }
    if (req.query.document_type) {
      // Ensure state_id exists in store_data
      searchConditions.push("i.document_type = ?");
      queryParams.push(req.query.document_type);
    }
    const whereClause = searchConditions.length
      ? `AND ${searchConditions.join(" AND ")}`
      : "";
    const countQuery = `
      SELECT COUNT(*) AS count
      FROM inventory i
      WHERE i.entity_id = ? AND i.warehouse_id = ?
      ${whereClause};
    `;
    const [totalRows] = await connection.execute(countQuery, queryParams);
    const totalItems = totalRows[0].count;
    const totalPages = Math.ceil(totalItems / limit);
    const dataQuery = `
      SELECT 
          i.*, 
          i.id AS inventory_id,
          s.state_name, 
          m.measuring_unit, 
          w.name AS warehouse_name,
          u.user_name,
          sto.*
      FROM 
          inventory i
      LEFT JOIN store_data sto ON i.material_id = sto.id
      LEFT JOIN state_martial s ON i.state_id = s.id
      LEFT JOIN measuring_unit m ON sto.measuring_id = m.unit_id
      LEFT JOIN users_management u ON sto.user_id = u.id
      LEFT JOIN warehouse w ON i.warehouse_id = w.id
      WHERE i.entity_id = ? AND i.warehouse_id = ?
      ${whereClause}
      ORDER BY i.id DESC
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

const deleteInventoryById = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const deleteWareHouseQuery = "DELETE FROM inventory WHERE id = ?";
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
const inventoryRegisterAsForLoop = async (req, res) => {
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
        price,
        origin,
        status_martials,
        measuring_unit,
        specification,
        quantity_incoming,
        quantity_outgoing,
        minimum_stock_level,
        document_date,
        purchase_date,
        expiry_date,
        production_date,
        ministry_id,
        entity_id,
        document_number,
        user_id,
        warehouseId,
        lab_id,
        factory_id,
        beneficiary,
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
        INSERT INTO inventory 
        (name_of_material, state_id, measuring_id, quantity_incoming, specification,
         production_date, expiry_date, origin, purchase_date, cod_material,
         user_id, entity_id, ministry_id, warehouse_id, price, minimum_stock_level,
         quantity_outgoing, document_number, document_date,Laboratory_id,factory_id,beneficiary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
      `;
      const [response] = await connection.execute(insertQuery, [
        nameMartials,
        stateId,
        unitId,
        quantity_incoming,
        specification,
        production_date,
        expiry_date,
        origin,
        purchase_date,
        code,
        user_id,
        entity_id,
        ministry_id,
        warehouseId,
        price,
        minimum_stock_level,
        quantity_outgoing,
        document_number,
        document_date,
        lab_id,
        factory_id,
        beneficiary,
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
  inventoryRegister,
  inventoryGetData,
  inventoryGetDataById,
  SearchInventory,
  inventoryEdit,
  deleteInventoryById,
  inventoryRegisterAsForLoop,
  materialMovements,
};
