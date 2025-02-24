const { connect } = require("../../config/db");
const puppeteer = require("puppeteer");
const { formatDate, formatDateNew } = require("../../utils/function");
const ExcelJS = require("exceljs");
const {
  queryUserData,
  queryMinistries,
  getDataMaterialByEntityId,
  getDataMaterial,
  queryMainClass,
} = require("../../query/reportQuery");
const { log } = require("winston");
const getDataCountDataOfEntity = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    console.log(req.query);

    console.log("Connection established");
    const getCountWarehouse = `
        SELECT COUNT(*) AS total_count
        FROM warehouse WHERE entity_id = ?
      `;

    const getDataCountLaboratories = `
        SELECT COUNT(*) AS total_count
        FROM laboratories WHERE entity_id = ?
      `;
    const getDataCountFactories = `
      SELECT COUNT(*) AS total_count
      FROM factories WHERE entity_id = ?
    `;
    const getDataCountUser = `
      SELECT COUNT(*) AS total_count
      FROM users_management WHERE entities_id = ?
    `;

    const [rows] = await connection.execute(getCountWarehouse, [req.query.id]);
    const [rowLab] = await connection.execute(getDataCountLaboratories, [
      req.query.id,
    ]);
    const [rowFactory] = await connection.execute(getDataCountFactories, [
      req.query.id,
    ]);
    const [rowCountUser] = await connection.execute(getDataCountUser, [
      req.query.id,
    ]);

    const totalCount = rows.length > 0 ? rows[0].total_count : 0;
    const totalLab = rowLab.length > 0 ? rowLab[0].total_count : 0;
    const totalFactory = rowFactory.length > 0 ? rowFactory[0].total_count : 0;

    const totalCountUser =
      rowCountUser.length > 0 ? rowCountUser[0].total_count : 0;

    res.status(200).json({
      total_count: totalCount,
      totalLab,
      totalCountUser,
      totalFactory,
    });
  } catch (error) {
    console.error("An error occurred: ", error);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    if (connection) connection.release();
    console.log("Connection released");
  }
};
const getDataCountOfEntity = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    console.log("Connection established");
    const getCountMaterial = `
      SELECT COUNT(*) AS total_count
      FROM stagnant_materials 
      WHERE Entities_id=?
    `;
    const getDataCountMinistry = `
      SELECT COUNT(*) AS total_count
      FROM ministries
    `;
    const getDataCountEntities = `
      SELECT COUNT(*) AS total_count
      FROM entities
    `;
    const getDataMonth = `
      SELECT COUNT(*) AS total_count
      FROM stagnant_materials
      WHERE MONTH(stagnant_materials.created_at) = MONTH(CURRENT_DATE())
      AND YEAR(stagnant_materials.created_at) = YEAR(CURRENT_DATE()) 
      AND Entities_id=?
    `;
    const getDataCountBookedData = `
      SELECT COUNT(*) AS total_count
      FROM booking_data_material
      WHERE entity_id=?
    `;
    // Execute the queries, passing the Entities_id as required
    const [rows] = await connection.execute(getCountMaterial, [req.params.id]);
    const [rowMinistry] = await connection.execute(getDataCountMinistry);
    const [rowEntities] = await connection.execute(getDataCountEntities);
    const [rowForCurrentMonth] = await connection.execute(getDataMonth, [
      req.params.id,
    ]);
    const [rowCountBooked] = await connection.execute(getDataCountBookedData, [
      req.params.id,
    ]);
    // Retrieve the counts from the results
    const totalCount = rows.length > 0 ? rows[0].total_count : 0;
    const totalMinistry =
      rowMinistry.length > 0 ? rowMinistry[0].total_count : 0;
    const totalEntities =
      rowEntities.length > 0 ? rowEntities[0].total_count : 0;
    const totalCountMonth =
      rowForCurrentMonth.length > 0 ? rowForCurrentMonth[0].total_count : 0;
    const totalCountBooked =
      rowCountBooked.length > 0 ? rowCountBooked[0].total_count : 0;
    // Return the result
    res.status(200).json({
      total_count: totalCount,
      totalMinistry,
      totalEntities,
      totalCountMonth,
      totalCountBooked,
    });
  } catch (error) {
    console.error("An error occurred: ", error.message);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    if (connection) connection.release();
    console.log("Connection released");
  }
};
const getDateAsFileExcel = async (req, res) => {
  let connection;
  try {
    const {
      reports,
      informationMaterial,
      activeWareHouse,
      activeFactory,
      ActiveLab,
    } = req.body; // Assuming reports is an array of warehouse IDs
    const pool = await connect();
    connection = await pool.getConnection();
    console.log(req.body);
    console.log("Database connection established");
    // Fetch warehouse and inventory data for a given warehouse ID
    const fetchWarehouseData = async (warehouseId) => {
      const warehouseQuery = `
        SELECT 
          W.id AS warehouse_id, W.*, 
          e.Entities_name, 
          us.user_name, 
          f.Factories_name, 
          La.Laboratory_name
        FROM warehouse AS W
        LEFT JOIN factories AS f ON W.factory_id = f.id
        LEFT JOIN users_management AS us ON W.user_id = us.id
        LEFT JOIN entities AS e ON W.entity_id = e.id
        LEFT JOIN laboratories AS La ON W.laboratory_id = La.id
        WHERE W.id = ?;
      `;
      const inventoryQuery = `
        SELECT
          inventory.*, 
          m.measuring_unit, 
          sto.*,
          s.state_name
        FROM inventory
      LEFT JOIN store_data sto ON inventory.material_id = sto.id
        LEFT JOIN state_martial s ON inventory.state_id = s.id
        LEFT JOIN measuring_unit m ON sto.measuring_id = m.unit_id
        WHERE inventory.warehouse_id = ?
      `;
      const [[warehouse], [inventory]] = await Promise.all([
        connection.execute(warehouseQuery, [warehouseId]),
        connection.execute(inventoryQuery, [warehouseId]),
      ]);
      return {
        dataWarehouse: warehouse[0],
        inventory: inventory.sort((a, b) =>
          a.name_of_material.localeCompare(b.name_of_material)
        ),
      };
    };
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    // Process each warehouse
    for (const warehouseId of activeWareHouse) {
      const { dataWarehouse, inventory } = await fetchWarehouseData(
        warehouseId
      );
      if (dataWarehouse) {
        const sheetName =
          dataWarehouse.name || `Warehouse_${dataWarehouse.name}`;
        const sheet = workbook.addWorksheet(sheetName);
        // Header: Warehouse Information
        const warehouseHeaderRow = sheet.addRow(["معلومات المخزن"]);
        warehouseHeaderRow.font = { bold: true, color: { argb: "FFFFFF" } };
        warehouseHeaderRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "4F81BD" },
        };
        const warehouseInfoRow = sheet.addRow([
          "الشركة",
          dataWarehouse.Entities_name,
          "المصنع",
          dataWarehouse.Factories_name,
          "أسم المعمل",
          dataWarehouse.Laboratory_name,
          "أسم المخزن",
          dataWarehouse.name,
          "مدير المخزن",
          dataWarehouse.user_name,
        ]);
        warehouseInfoRow.alignment = { wrapText: true };
        sheet.addRow([]); // Empty row for spacing
        // Sub-header: Inventory Data
        const inventoryHeaderRow = sheet.addRow([" أستمارة الجرد"]);
        inventoryHeaderRow.font = { bold: true, color: { argb: "FFFFFF" } };
        inventoryHeaderRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "4F81BD" },
        };

        if (inventory.length > 0) {
          const inventoryColumns = [
            "الرقم الرمزي",
            "أسم المادة",
            " وحدة القياس",
            " رقم المستند",
            " تابيخ المستند",
            "الكمية الواردة",
            "الكمية الصادرة",
            "الرصيد",
            "االمواصفات الفنية",
            "تاريخ الانتاج",
            "تاريخ نفاذ الصلاحية",
            "المنشأ",
            "تاريخ شراء المادة",
            "قيمة شراء الوحدة الواحدة",
            "الحد الادنا للمخزون",
            "حالة المادة الموجودة في  المخزن",
            "الجهة المستفيدة",
            " تاريخ أدخال المادة للنظام",
          ];
          const inventoryHeader = sheet.addRow(inventoryColumns);
          inventoryHeader.alignment = { wrapText: true };
          inventoryHeader.font = { bold: true, color: { argb: "FFFFFF" } };
          inventoryHeader.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "9e9e9e" },
          };

          // Add inventory data
          inventory.forEach((item) => {
            const row = sheet.addRow([
              item.cod_material,
              item.name_of_material,
              item.measuring_unit,
              item.document_number,
              new Date(item.document_date).toLocaleDateString(),
              item.quantity_incoming,
              item.quantity_outgoing,
              item.balance,
              item.specification,
              new Date(item.production_date).toLocaleDateString(),
              new Date(item.expiry_date).toLocaleDateString(),
              item.origin,
              new Date(item.purchase_date).toLocaleDateString(),
              item.price,
              item.minimum_stock_level,
              item.state_name,
              item.beneficiary,
              new Date(item.created_at).toLocaleDateString(),
            ]);
            row.alignment = { wrapText: true, vertical: "middle" };
          });
        } else {
          const noDataRow = sheet.addRow(["لا توجد بيانات جرد لهذه المخزن."]);
          noDataRow.alignment = { wrapText: true };
        }
        // Adjust column widths and add padding
        sheet.columns.forEach((column) => {
          const maxLength = column.values.reduce(
            (max, value) => Math.max(max, value ? value.toString().length : 0),
            0
          );
          column.width = maxLength + 2; // Add padding for better readability
        });
      }
    }
    // Set response headers and stream the workbook to the client
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=warehouse_report_${Date.now()}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel file:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release();
  }
};


// Create the HTML content for the PDF

const exportData = (req, res) => {
  const { format } = req.body;
 if (format === "excel") {
    getDateAsFileExcel(req, res);
  } else {
    res.status(400).json({ message: "Invalid format specified" });
  }
};
const getDataINforamaitionReport = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    console.log("Connection established");
    console.log(req.query);

    const {
      entity_id,
      activeWareHouse,
      activeMaterial,
      reports,
      permissionIdToAlow,
    } = req.query;

    const hasPermission = permissionIdToAlow === "true";
    if (hasPermission) {
      return res.status(403).json({
        message: "You do not have permission to access this resource",
      });
    }

    if (!Array.isArray(reports) || reports.length === 0) {
      console.error("Invalid reports structure:", reports);
      return res.status(400).json({ message: "Invalid request structure" });
    }

    if (!Array.isArray(activeWareHouse) || activeWareHouse.length === 0) {
      return res.status(400).json({ message: "Invalid activeWareHouse structure" });
    }

    // Fetch warehouse data
    const fetchWarehouseData = async (connection, warehouseId) => {
      const warehouseQuery = `
        SELECT 
          W.id AS warehouse_id, W.*, 
          e.Entities_name, 
          us.user_name, 
          f.Factories_name, 
          La.Laboratory_name
        FROM warehouse AS W
        LEFT JOIN factories AS f ON W.factory_id = f.id
        LEFT JOIN users_management AS us ON W.user_id = us.id
        LEFT JOIN entities AS e ON W.entity_id = e.id
        LEFT JOIN laboratories AS La ON W.laboratory_id = La.id
        WHERE W.id = ?;
      `;
      const inventoryQuery = `
        SELECT
          inventory.*, 
          m.measuring_unit, 
          sto.*,
          s.state_name
        FROM inventory
        LEFT JOIN store_data sto ON inventory.material_id = sto.id
        LEFT JOIN state_martial s ON inventory.state_id = s.id
        LEFT JOIN measuring_unit m ON sto.measuring_id = m.unit_id
        WHERE inventory.warehouse_id = ?
      `;

      console.log("Executing warehouseQuery with warehouseId:", warehouseId);
      const [[warehouse], [inventory]] = await Promise.all([
        connection.execute(warehouseQuery, [warehouseId]),
        connection.execute(inventoryQuery, [warehouseId]),
      ]);

      return {
        dataWarehouse: warehouse[0],
        inventory: inventory.sort((a, b) =>
          a.name_of_material.localeCompare(b.name_of_material)
        ),
      };
    };

    // Fetch lab data
    const fetchLabData = async (connection) => {
      const query = `
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
        WHERE La.entity_id = ?
      `;
      const [rows] = await connection.execute(query, [entity_id]);
      return rows;
    };

    // Fetch factory data
    const fetchFactoryData = async (connection) => {
      const query = `
        SELECT 
          Fa.id AS factory_id,
          Fa.*, 
          us.user_name,
          e.Entities_name
        FROM factories AS Fa
        LEFT JOIN users_management AS us ON Fa.user_id = us.id
        LEFT JOIN entities AS e ON Fa.entity_id = e.id
        WHERE Fa.entity_id = ?
      `;
      const [rows] = await connection.execute(query, [entity_id]);
      return rows;
    };

    // Process data based on the selected reports
    const warehouseData =
      reports.includes("1") && activeWareHouse
        ? await Promise.all(
            activeWareHouse.map(async (warehouseId) => {
              return await fetchWarehouseData(connection, warehouseId);
            })
          )
        : [];

    const labInformation =
      reports.includes("2") && hasPermission
        ? await fetchLabData(connection)
        : [];

    const factoryData =
      reports.includes("3") && hasPermission
        ? await fetchFactoryData(connection)
        : [];

    // Log and send the response
    return res.status(200).json({
      includes: reports,
      warehouseData,
      labInformation,
      factoryData,
      activeMaterial,
    });
  } catch (error) {
    console.error("Error fetching report data:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    if (connection) connection.release(); // Ensure connection is released
  }
};
module.exports = {
  getDataCountDataOfEntity,
  exportData,
  getDataCountOfEntity,
  getDataINforamaitionReport,
};
