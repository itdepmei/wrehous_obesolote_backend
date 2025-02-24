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
const getDataCountOfMaterial = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    console.log("Connection established");
    const getCountMaterial = `
        SELECT COUNT(*) AS total_count
        FROM stagnant_materials
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
      `;
    const getDataCountUser = `
      SELECT COUNT(*) AS total_count
      FROM users_management
    `;
    const getDataCountBookedData = `
    SELECT COUNT(*) AS total_count
    FROM booking_data_material
  `;
    const [rows] = await connection.execute(getCountMaterial);
    const [rowMinistry] = await connection.execute(getDataCountMinistry);
    const [rowEntities] = await connection.execute(getDataCountEntities);
    const [rowForCurrentMonth] = await connection.execute(getDataMonth);
    const [rowCountUser] = await connection.execute(getDataCountUser);
    const [rowCountBooked] = await connection.execute(getDataCountBookedData);
    // const [rowCountBookMaterial] = await connection.execute(getBookMaterial, [
    //   req.query.id,
    // ]);
    const totalCount = rows.length > 0 ? rows[0].total_count : 0;
    const totalMinistry =
      rowMinistry.length > 0 ? rowMinistry[0].total_count : 0;
    const totalEntities =
      rowEntities.length > 0 ? rowEntities[0].total_count : 0;
    const totalCountMonth =
      rowForCurrentMonth.length > 0 ? rowForCurrentMonth[0].total_count : 0;
    const totalCountUser =
      rowCountUser.length > 0 ? rowCountUser[0].total_count : 0;
    const totalCountBooked =
      rowCountBooked.length > 0 ? rowCountBooked[0].total_count : 0;
    res.status(200).json({
      total_count: totalCount,
      totalMinistry,
      totalCountMonth,
      totalCountUser,
      totalEntities,
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
      dateFrom,
      dateTo,
      ifEntity,
      entity_id,
      dataUser,
      dataMaterial,
    } = req.body;
    const pool = await connect();
    connection = await pool.getConnection();
    console.log("Connection established");
    // Define fetching functions
    const fetchUsersData = async () => {
      const [rows] = await connection.execute(queryUserData);
      return Array.isArray(rows)
        ? rows.map((row, index) => {
            const userData = {
              التسلسل: index + 1,
            };
            // Check if user_name exists in dataUser
            if (dataUser.includes("user_name")) {
              userData["أسم المستخدم"] = row.user_name;
            }
            if (dataUser.includes("phone_number")) {
              userData["رقم الهاتف"] = row.phone_number;
            }
            if (dataUser.includes("email")) {
              userData["أيميل"] = row.email;
            }
            if (dataUser.includes("create_At")) {
              userData["تاريخ الانشاء"] = formatDateNew(row.create_At);
            }
            if (dataUser.includes("ministries")) {
              userData["الوزارة"] = row.ministries;
            }
            if (dataUser.includes("Entities_name")) {
              userData["الجهة المستفيدة"] = row.Entities_name;
            }
            if (dataUser.includes("governorate_name")) {
              userData["العنوان"] = row.governorate_name;
            }
            if (dataUser.includes("job_name")) {
              userData["العنوان الوظيفي"] = row.job_name;
            }
            return userData;
          })
        : [];
    };
    const fetchMinistriesAndEntitiesData = async () => {
      const [rows] = await connection.execute(queryMinistries);
      return Array.isArray(rows)
        ? rows.map((row, index) => ({
            التسلسل: index + 1,
            "أسم الوزراة": row.ministries,
            "الجهات التابعة لها": row.entities_name,
          }))
        : [];
    };
    const fetchMaterialsData = async () => {
      const query = ifEntity ? getDataMaterialByEntityId : getDataMaterial;
      const [rows] = await connection.execute(
        query,
        ifEntity ? [entity_id] : []
      );
      return Array.isArray(rows)
        ? rows.map((row, index) => {
            const materialData = {
              التسلسل: index + 1,
            };
            // Check if user_name exists in dataUser
            if (dataMaterial.includes("name_material")) {
              materialData["أسم المادة"] = row.name_material;
            }
            if (dataMaterial.includes("state_name")) {
              materialData["حالة الماجة"] = row.state_name;
            }
            if (dataMaterial.includes("Quantity")) {
              materialData["كمية المادة"] = row.Quantity;
            }
            if (dataMaterial.includes("created_at")) {
              materialData["تاريخ الادخال"] = formatDateNew(row.created_at);
            }
            return materialData;
          })
        : [];
    };

    const fetchMainClassesData = async () => {
      const [rows] = await connection.execute(queryMainClass);
      return Array.isArray(rows)
        ? rows.map((row, index) => ({
            التسلسل: index + 1,
            "أسم المادة الراكدة": row.main_Class_name,
            "عدد الفئات الفرعية": row.subclass_count,
            "الفئات الفرعية": row.subclasses,
          }))
        : [];
    };

    const fetchMaterialDateData = async () => {
      const query = `
        SELECT 
          stagnant_materials.name_material,
          stagnant_materials.Quantity,
          stagnant_materials.stagnant_id,
          sub_class_for_main_class.sub_class_name,
          main_class.main_Class_name,
          measuring_unit.measuring_unit,
          users_management.phone_number,
          users_management.user_name,
          entities.Entities_name,
          ministries.ministries,
          state_martial.state_name
        FROM 
          stagnant_materials
        LEFT JOIN
          sub_class_for_main_class ON stagnant_materials.subClass_id = sub_class_for_main_class.subClass_id
        LEFT JOIN
          main_class ON stagnant_materials.mainClass_id = main_class.mainClass_id
        LEFT JOIN
          users_management ON stagnant_materials.user_id = users_management.id
        LEFT JOIN
          measuring_unit ON stagnant_materials.measuring_unit_id = measuring_unit.unit_id
        LEFT JOIN
          ministries ON stagnant_materials.ministry_id = ministries.id
        LEFT JOIN 
          entities ON stagnant_materials.Entities_id = entities.id
        LEFT JOIN
          state_martial ON stagnant_materials.state_matrial_id = state_martial.id  
        WHERE
     stagnant_materials.created_at BETWEEN ? AND ?
       ${!ifEntity ? "" : "AND stagnant_materials.Entities_id = ?"}`;
      const values = !ifEntity
        ? [dateFrom, dateTo]
        : [dateFrom, dateTo, entity_id]; // include entity_id if ifEntity is false
      const [rows] = await connection.execute(query, values);
      return Array.isArray(rows)
        ? rows.map((row, index) => ({
            التسلسل: index + 1,
            "أسم المادة": row.name_material,
            الكمية: row.Quantity,
            "حالة المادة": row.state_name,
          }))
        : [];
    };

    const fetchMaterialsDataIsBooked = async () => {
      const query = `
          SELECT 
            booking_data_material.*,
            main_class.main_Class_name,
            measuring_unit.measuring_unit,
            users_management.phone_number,
            users_management.user_name,
            ministries.ministries,
            entities_from.Entities_name AS entity_name_from,
            entities_buy.Entities_name AS entity_name_buy,
            state_martial.state_name
          FROM 
            booking_data_material
          LEFT JOIN 
            main_class ON booking_data_material.mainClass_id = main_class.mainClass_id
          LEFT JOIN 
            users_management ON booking_data_material.user_id = users_management.id
          LEFT JOIN 
            measuring_unit ON booking_data_material.measuring_unit_id = measuring_unit.unit_id
          LEFT JOIN 
            entities AS entities_from ON booking_data_material.entity_id = entities_from.id
          LEFT JOIN 
            entities AS entities_buy ON booking_data_material.entity_buy_id = entities_buy.id
          LEFT JOIN 
            ministries ON entities_from.ministries_Id = ministries.id
          LEFT JOIN 
            files ON booking_data_material.obesolote_Material_id = files.insert_id
          LEFT JOIN 
            state_martial ON booking_data_material.state_matrial_id = state_martial.id
          WHERE
    ${!ifEntity ? null : "booking_data_material.entity_id = ?"}
        `;
      const values = ifEntity ? [entity_id] : []; // include entity_id if ifEntity is false
      const [rows] = await connection.execute(query, values);
      return Array.isArray(rows)
        ? rows.map((row, index) => ({
            التسلسل: index + 1,
            "أسم المادة": row.name_material,
            الكمية: row.Quantity_buy,
            "حالة المادة": row.state_name,
          }))
        : [];
    };

    // Fetch the requested data based on includes
    const usersData = reports.includes("users") ? await fetchUsersData() : [];
    const ministriesData = reports.includes("ministriesAndEntities")
      ? await fetchMinistriesAndEntitiesData()
      : [];
    const materialsData = reports.includes("material")
      ? await fetchMaterialsData()
      : [];
    const mainClassesData = reports.includes("mainClass")
      ? await fetchMainClassesData()
      : [];
    const materialOfDataWithinGivenDate = reports.includes(
      "materialOfDataWithinGivenDate"
    )
      ? await fetchMaterialDateData()
      : [];
    const materialsDataBooked = reports.includes("completedTransactions")
      ? await fetchMaterialsDataIsBooked()
      : [];

    // Create a new workbook and add sheets
    const workbook = new ExcelJS.Workbook();

    // Function to create a sheet with data and styles
    const createSheet = (data, sheetName) => {
      const sheet = workbook.addWorksheet(sheetName);

      // Set the sheet's direction to RTL
      sheet.properties.outlineLevelCol = 1; // Set the outline level for columns (optional)
      sheet.properties.defaultRowHeight = 15; // Set the default row height (optional)

      // Create the header row
      const headerRow = sheet.addRow(Object.keys(data[0]));

      // Apply styles to each cell in the header row
      headerRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true }; // Set font to bold
        cell.alignment = {
          horizontal: "center", // Center align the text
          vertical: "middle", // Vertical alignment (optional)
          readingOrder: 2, // Set reading order to RTL
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFC0C0C0" }, // Light gray background
        };
      });
      // Add data rows
      data.forEach((item) => {
        sheet.addRow(Object.values(item));
      });
      // Auto-adjust column widths
      sheet.columns.forEach((column) => {
        const maxLength = column.values.reduce(
          (max, value) => Math.max(max, value ? value.toString().length : 0),
          0
        );
        column.width = maxLength + 2; // Add some padding
      });
    };
    // Create sheets only if data is an array and has length > 0
    if (Array.isArray(usersData) && usersData.length > 0)
      createSheet(usersData, "المستخدمين");
    if (Array.isArray(ministriesData) && ministriesData.length > 0)
      createSheet(ministriesData, "الوزارات والجهات");
    if (Array.isArray(materialsData) && materialsData.length > 0)
      createSheet(materialsData, "المواد");
    if (Array.isArray(mainClassesData) && mainClassesData.length > 0)
      createSheet(mainClassesData, "الفئات الرئيسية");
    if (
      Array.isArray(materialOfDataWithinGivenDate) &&
      materialOfDataWithinGivenDate.length > 0
    )
      createSheet(materialOfDataWithinGivenDate, "بيانات المواد خلال الفترة");
    if (Array.isArray(materialsDataBooked) && materialsDataBooked.length > 0)
      createSheet(materialsDataBooked, "المعاملات المكتملة");

    // Set the response headers for the Excel file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=report_${Date.now()}.xlsx`
    );

    // Write to response stream
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel file:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
const getAsPdf = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    console.log("Connection established");
    const {
      reports,
      dateFrom,
      dateTo,
      ifEntity,
      entity_id,
      dataUser,
      dataMaterial,
    } = req.body;
    if (!reports || !Array.isArray(reports)) {
      console.error("Invalid reports structure:", reports);
      return res.status(400).json({ message: "Invalid request structure" });
    }
    const includes = reports || [];
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      timeout: 60000,
    });
    const page = await browser.newPage();
    // Optional: Wait for specific elements if needed, e.g., waiting for page to load completely
    // await page.waitForSelector('#some-element', { timeout: 600000 });  // Replace with your element selector
    // Generate the PDF with a longer timeout
    // Fetch users data if included
    const fetchUsersData = async (connection) => {
      const [rows] = await connection.execute(queryUserData);
      return rows;
    };
    // Fetch ministries and entities data
    const fetchMinistriesAndEntitiesData = async (connection) => {
      const [rows] = await connection.execute(queryMinistries);
      // Process the results to group entities under each ministry
      const ministriesMap = {};
      rows.forEach((row) => {
        const { ministry_id, ministry_name, entity_id, entity_name } = row;
        // If ministry is not yet added to the map, add it
        if (!ministriesMap[ministry_id]) {
          ministriesMap[ministry_id] = {
            id: ministry_id,
            ministry_name: ministry_name,
            entities: [],
          };
        }
        // If the entity exists, add it to the entities array
        if (entity_id) {
          ministriesMap[ministry_id].entities.push({
            id: entity_id,
            name: entity_name,
          });
        }
      });
      // Convert the map to an array of ministries
      const ministries = Object.values(ministriesMap);
      return ministries;
    };
    // Fetch materials data
    const fetchMaterialsData = async (connection) => {
      const query = ifEntity ? getDataMaterialByEntityId : getDataMaterial;
      const [rows] = await connection.execute(
        query,
        ifEntity ? [entity_id] : []
      );
      return rows;
    };
    // Fetch main classes data
    const fetchMainClassesData = async (connection) => {
      const [rows] = await connection.execute(queryMainClass);
      return rows;
    };
    // fetch data material by user defined date
    const fetchMaterialDateData = async (connection) => {
      const query = `
        SELECT 
          stagnant_materials.name_material,
          stagnant_materials.Quantity,
          stagnant_materials.stagnant_id,
          stagnant_materials.created_at,
          users_management.phone_number,
          users_management.user_name,
          entities.Entities_name,
          ministries.ministries,
          state_martial.state_name
        FROM 
          stagnant_materials
        LEFT JOIN
          users_management ON stagnant_materials.user_id = users_management.id
        LEFT JOIN
          ministries ON stagnant_materials.ministry_id = ministries.id
        LEFT JOIN 
          entities ON stagnant_materials.Entities_id = entities.id
        LEFT JOIN
          state_martial ON stagnant_materials.state_matrial_id = state_martial.id  
        WHERE
          stagnant_materials.created_at BETWEEN ? AND ?
          ${!ifEntity ? "" : "AND stagnant_materials.Entities_id = ?"}
      `;
      // Execute query with provided date range
      const values = !ifEntity
        ? [dateFrom, dateTo]
        : [dateFrom, dateTo, entity_id]; // include entity_id if ifEntity is false
      console.log(values);

      const [rows] = await connection.execute(query, values);
      return rows;
    };
    // Fetch materials data
    const fetchMaterialsDataIsBooked = async (connection) => {
      const query = `
      SELECT 
        booking_data_material.*,
        main_class.main_Class_name,
        measuring_unit.measuring_unit,
        users_management.phone_number,
        users_management.user_name,
        ministries.ministries,
        entities_from.Entities_name AS entity_name_from,
        entities_buy.Entities_name AS entity_name_buy,
        state_martial.state_name
      FROM 
        booking_data_material
      LEFT JOIN 
        main_class ON booking_data_material.mainClass_id = main_class.mainClass_id
      LEFT JOIN 
        users_management ON booking_data_material.user_id = users_management.id
      LEFT JOIN 
        measuring_unit ON booking_data_material.measuring_unit_id = measuring_unit.unit_id
      LEFT JOIN 
        entities AS entities_from ON booking_data_material.entity_id = entities_from.id
      LEFT JOIN 
        entities AS entities_buy ON booking_data_material.entity_buy_id = entities_buy.id
      LEFT JOIN 
        ministries ON entities_from.ministries_Id = ministries.id
      LEFT JOIN 
        files ON booking_data_material.obesolote_Material_id = files.insert_id
      LEFT JOIN 
        state_martial ON booking_data_material.state_matrial_id = state_martial.id
      WHERE
${!ifEntity ? null : "booking_data_material.entity_id = ?"}
    `;
      const values = ifEntity ? [entity_id] : []; // include entity_id if ifEntity is false
      const [rows] = await connection.execute(query, values);
      return rows;
    };
    const usersData = includes.includes("users")
      ? await fetchUsersData(connection)
      : [];
    // Fetch ministries and entities if included
    const ministriesData = includes.includes("ministriesAndEntities")
      ? await fetchMinistriesAndEntitiesData(connection)
      : [];
    // Fetch materials if included
    const materialsData = includes.includes("material")
      ? await fetchMaterialsData(connection)
      : [];
    // Fetch main classes if included
    const mainClassesData = includes.includes("mainClass")
      ? await fetchMainClassesData(connection)
      : [];
    // fetch data by date
    const materialOfDataWithinGivenData = includes.includes(
      "materialOfDataWithinGivenDate"
    )
      ? await fetchMaterialDateData(connection)
      : [];
    // number of completed transactions between institution
    const MaterialsDIsBooked = includes.includes("completedTransactions")
      ? await fetchMaterialsDataIsBooked(connection)
      : [];
    // Set content for the PDF
    await page.setContent(
      createHtmlContent({
        includes,
        usersData,
        ministriesData,
        materialsData,
        mainClassesData,
        materialOfDataWithinGivenData,
        dateFrom: formatDate(dateFrom), // Pass dateFrom
        dateTo: formatDate(dateTo), // Pass dateTo
        MaterialsDIsBooked,
        dataUser,
        dataMaterial,
      }),
      { timeout: 600000 }
    );
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      timeout: 600000,
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; padding: 10px;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
      margin: { top: "20px", bottom: "20px", left: "10px", right: "10px" },
    });
    await browser.close();
    res.setHeader("Content-Type", "application/pdf");
    res.end(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    if (connection) connection.release(); // Ensure connection is always released
  }
};
// Create the HTML content for the PDF
const createHtmlContent = ({
  includes,
  usersData,
  ministriesData,
  materialsData,
  mainClassesData,
  materialOfDataWithinGivenData,
  dateFrom,
  dateTo,
  MaterialsDIsBooked,
  dataUser,
  dataMaterial,
}) => {
  return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />
        <link rel="stylesheet" href="../../style.css" />

        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap');
          body { font-family: "Cairo", sans-serif; direction: rtl; }
          .pdfdisplay{ width: "210mm", padding: "20mm",
            margin: "auto", max-width:"100%"}
          table { width: "210mm",margin-bottom: 30px; } /* Add margin to separate tables */
          td, th { border: 1px solid #dddddd; padding: 5px; }
          td {
  white-space: normal;
  word-wrap: break-word;
  word-break: break-word;
}
  tr:nth-child(even) { background-color: #f2f2f2; }
.displayLoGO{display:flex ;}
  .logo-circle { display: flex; align-items:last baseline; gap: 5px; }
  .circleLogo {width: 30px;height: 30px; border-radius: 50%;}
  .yellow {background-color: #FFC107;}
  .purple {background-color: #6A1B9A;border-bottom-right-radius: 1px;}
  .light-purple {background-color: #7F6AD2; border-bottom-right-radius: 1px;}
  .light-yellow { background-color: #FFEB3B;border-bottom-right-radius: 1px; border-bottom-left-radius: 1px;}
        </style>
        <title>Document</title>
      </head>
      <body>
       <div class="logo-circle mb-0 p-1">
            <div class="displayLoGO gap-2">
              <div class="m-0">
                <div class="circleLogo yellow mb-2"></div>
                <div class="circleLogo light-purple"></div>
              </div>
              <div class="m-0">
                <div class="circleLogo purple mb-2"></div>
                <div class="circleLogo light-yellow"></div>
              </div>
            </div>
             <div class="displayNone">
              <p style="text-align: right; color: black">
                البنك <span style="color: orange">الوطني</span> <br />
                للمواد الراكدة وبطيئة الحركة
              </p>
            </div>
          </div>
          <hr/>
        <div class="pdfdisplay mt-4">
          <h1 class="text-center">البيانات</h1>
          ${
            includes.includes("users")
              ? `
            <h3 style="color:#1e6a99">بيانات المستخدمين</h3>
            <table class="table table-striped">
     <thead>
  <tr>
    <th>#</th>
    ${dataUser.includes("user_name") ? `<th>اسم المستخدم</th>` : ""}
    ${dataUser.includes("phone_number") ? `<th>رقم الهاتف</th>` : ""}
    ${dataUser.includes("email") ? `<th>البريد الالكتروني</th>` : ""}
    ${dataUser.includes("job_name") ? `<th>العنوان  الوظيفي</th>` : ""}
    ${dataUser.includes("governorate_name") ? `<th> العنوان</th>` : ""}
    ${dataUser.includes("Entities_name") ? `<th>الجهة المستفسدة</th>` : ""}
    ${dataUser.includes("ministries") ? `<th>الوزارة</th>` : ""}
    ${dataUser.includes("create_At") ? `<th>تاريخ الانشاء</th>` : ""}
  </tr>
</thead>
<tbody>
  ${usersData
    .map(
      (item, index) => `
      <tr>
        <th>${index + 1}</th>
        ${dataUser.includes("user_name") ? `<td>${item.user_name}</td>` : ""}
        ${
          dataUser.includes("phone_number")
            ? `<td>${item.phone_number}</td>`
            : ""
        }
        ${dataUser.includes("email") ? `<td>${item.email}</td>` : ""}
        ${dataUser.includes("job_name") ? `<td>${item.job_name}</td>` : ""}
        ${
          dataUser.includes("governorate_name")
            ? `<td>${item.governorate_name}</td>`
            : ""
        }

        ${
          dataUser.includes("Entities_name")
            ? `<td>${item.Entities_name}</td>`
            : ""
        }
        ${dataUser.includes("ministries") ? `<td>${item.ministries}</td>` : ""}
        ${
          dataUser.includes("create_At")
            ? `<td>${formatDateNew(item.create_At)}</td>`
            : ""
        }
      </tr>
    `
    )
    .join("")}
</tbody>
                 <tfoot>
                    <tr>
                  <th colspan=${dataUser.length}>الإجمالي</th>
                  <th>${usersData.length}</th>
                </tr>
              </tfoot>
            </table>`
              : ""
          }
          ${
            includes.includes("ministriesAndEntities")
              ? `
            <h3 style="color:#1e6a99">الوزارات والجهات المستفيدة</h3>
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>#</th>
                  <th>اسم الوزارة</th>
                  <th>الجهة المستفيدة</th>
                </tr>
              </thead>
                        <tbody>
                  ${ministriesData
                    .map(
                      (ministry, ministryIndex) => `
                    <tr key=${ministryIndex}>
                      <th>${ministryIndex + 1}</th>
                      <td>${ministry?.ministry_name || "N/A"}</td>
                      <td>
                        <ul style="list-style-type:square">
                          ${
                            ministry?.entities?.length > 0
                              ? ministry?.entities
                                  ?.map(
                                    (entity, entityIndex) => `
                                <li key=${entityIndex}>${
                                      entity?.name || "N/A"
                                    }</li>
                            `
                                  )
                                  .join("")
                              : "No entities"
                          }
                        </ul>
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
               <tfoot>
                  <tr>
                  <th colspan="2">الإجمالي</th>
                  <th>${ministriesData.length}</th>
                </tr>
              </tfoot>
            </table>`
              : ""
          }
          ${
            includes.includes("material")
              ? `
            <h3 style="color:#1e6a99">المواد</h3>
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>#</th>
                  ${
                    dataMaterial.includes("name_material")
                      ? `<th>أسم المادة</th>`
                      : ""
                  }
                  ${
                    dataMaterial.includes("state_name")
                      ? `<th>حالة المادة</th>`
                      : ""
                  }
                  ${dataMaterial.includes("Quantity") ? `<th>الكمية</th>` : ""}
                  ${
                    dataMaterial.includes("created_at")
                      ? `<th>تاريخ الادخال</th>`
                      : ""
                  }
                </tr>
              </thead>
              <tbody>
                ${materialsData
                  .map(
                    (item, index) => `
                  <tr>
                    <th>${index + 1}</th>
                      ${
                        dataMaterial.includes("name_material")
                          ? `<td>${item.name_material}</td>`
                          : ""
                      }
                     ${
                       dataMaterial.includes("state_name")
                         ? `<td>${item.state_name}</td>`
                         : ""
                     }
                      ${
                        dataMaterial.includes("Quantity")
                          ? `<td>${item.Quantity}</td>`
                          : ""
                      }
                       ${
                         dataMaterial.includes("created_at")
                           ? `<td>${formatDateNew(item.created_at)}</td>`
                           : ""
                       }
                  </tr>
                  `
                  )
                  .join("")}
              </tbody>
              <tfoot>
                <tr>
                  <th colspan=${dataMaterial.length}>الإجمالي</th>
                  <th>${materialsData.length}</th>
                </tr>
              </tfoot>
            </table>`
              : ""
          }
          ${
            includes.includes("mainClass")
              ? `
            <h3 style="color:#1e6a99">الفئات الرئيسية</h3>
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>#</th>
                  <th>اسم الفئة الرئيسية</th>
                  <th>اسم الفئة الفرعية</th>
                </tr>
              </thead>
              <tbody>
                ${mainClassesData
                  .map(
                    (item, index) => `
                  <tr>
                    <th>${index + 1}</th>
                    <td>${item.main_Class_name}</td>
                    <td>${item.subclasses}</td>
                  </tr>`
                  )
                  .join("")}
              </tbody>
            </table>`
              : ""
          }
          ${
            includes.includes("materialOfDataWithinGivenDate")
              ? `
                <h3 style="color:#1e6a99;">
                  المواد المحدد خلال ${dateFrom ? dateFrom : null} الى
                  ${dateTo ? dateTo : null}
                </h3>
                <table class="table table-striped">
                  <thead>
                    <tr>
                      <th>#</th>
                      ${
                        dataMaterial.includes("name_material")
                          ? `<th>أسم المادة</th>`
                          : ""
                      }
                      ${
                        dataMaterial.includes("state_name")
                          ? `<th>حالة المادة</th>`
                          : ""
                      }
                      ${
                        dataMaterial.includes("Quantity")
                          ? `<th>الكمية</th>`
                          : ""
                      }
                      ${
                        dataMaterial.includes("created_at")
                          ? `<th>تاريخ الادخال</th>`
                          : ""
                      }
                    </tr>
                  </thead>
                  <tbody>
                    ${materialOfDataWithinGivenData
                      .map(
                        (item, index) => `
                        <tr>
                          <th>${index + 1}</th>
                          ${
                            dataMaterial.includes("name_material")
                              ? `<td>${item.name_material}</td>`
                              : ""
                          }
                          ${
                            dataMaterial.includes("state_name")
                              ? `<td>${item.state_name}</td>`
                              : ""
                          }
                          ${
                            dataMaterial.includes("Quantity")
                              ? `<td>${item.Quantity}</td>`
                              : ""
                          }
                          ${
                            dataMaterial.includes("created_at")
                              ? `<td>${formatDateNew(item.created_at)}</td>`
                              : ""
                          }
                        </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colspan=${dataMaterial.length}>الإجمالي</th>
                      <th>${materialOfDataWithinGivenData.length}</th>
                    </tr>
                  </tfoot>
                </table>`
              : ""
          }
           
           ${
             includes.includes("completedTransactions")
               ? `
            <h3 style="color:#1e6a99">عدد الصفقات المكتملة</h3>
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>#</th>
                  <th>اسم المادة</th>
                  <th> حالة المادة</th>
                  <th>الكمية</th>
                </tr>
              </thead>
              <tbody>
                ${MaterialsDIsBooked.map(
                  (item, index) => `
                  <tr>
                    <th>${index + 1}</th>
                    <td>${item.name_material}</td>
                    <td>${item.state_name}</td>
                    <td>${item.Quantity_buy}</td>
                  </tr>
                  `
                ).join("")}
              </tbody>
              <tfoot>
                <tr>
                  <th colspan="3">الإجمالي</th>
                  <th>${MaterialsDIsBooked.length}</th>
                </tr>
              </tfoot>
            </table>`
               : ""
           }
        </div>
      </body>
    </html>`;
};
const exportData = (req, res) => {
  const { format } = req.body;

  if (format === "pdf") {
    console.log(format);

    getAsPdf(req, res);
  } else if (format === "excel") {
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
    const reports = req.query.selectedReports
      ? req.query.selectedReports.split(",")
      : [];
    const { dateFrom, dateTo, ifEntity, entity_id, dataMaterial, dataUser } =
      req.query;

    if (!Array.isArray(reports) || reports.length === 0) {
      console.error("Invalid reports structure:", reports);
      return res.status(400).json({ message: "Invalid request structure" });
    }
    const checkEntity = ifEntity === "false" ? false : true;
    // Continue processing the array
    const includes = reports || [];
    const fetchUsersData = async (connection) => {
      const [rows] = await connection.execute(queryUserData);
      return rows;
    };
    // Fetch ministries and entities data
    const fetchMinistriesAndEntitiesData = async (connection) => {
      const [rows] = await connection.execute(queryMinistries);
      // Process the results to group entities under each ministry
      const ministriesMap = {};
      rows.forEach((row) => {
        const { ministry_id, ministry_name, entity_id, entity_name } = row;
        // If ministry is not yet added to the map, add it
        if (!ministriesMap[ministry_id]) {
          ministriesMap[ministry_id] = {
            id: ministry_id,
            ministry_name: ministry_name,
            entities: [],
          };
        }
        // If the entity exists, add it to the entities array
        if (entity_id) {
          ministriesMap[ministry_id].entities.push({
            id: entity_id,
            name: entity_name,
          });
        }
      });
      const ministries = Object.values(ministriesMap);
      return ministries;
    };
    // Fetch materials data
  const fetchMaterialsData = async (connection) => {
    const query = checkEntity ? getDataMaterialByEntityId : getDataMaterial;
    const [rows] = await connection.execute(
      query,
      checkEntity ? [entity_id] : []
    );
    return rows;
  };

    // Fetch main classes data
    const fetchMainClassesData = async (connection) => {
      const [rows] = await connection.execute(queryMainClass);
      return rows;
    };
    // Fetch materials data within a date range
    const fetchMaterialDateData = async (connection) => {
      if (!dateFrom || !dateTo) {
        throw new Error("Date range must be provided");
      }

      try {
        // Convert the dates to 'Tue, 24 Sep 2024 21:00:00 GMT' format
        const formattedDateFrom = new Date(dateFrom).toISOString();
        const formattedDateTo = new Date(dateTo).toISOString();
        // Build the query with dynamic conditions
        const query = `
          SELECT 
            stagnant_materials.name_material,
            stagnant_materials.Quantity,
            stagnant_materials.stagnant_id,
            stagnant_materials.created_at,
            users_management.phone_number,
            users_management.user_name,
            entities.Entities_name,
            ministries.ministries,
            state_martial.state_name
          FROM 
            stagnant_materials
          LEFT JOIN
            users_management ON stagnant_materials.user_id = users_management.id
          LEFT JOIN
            ministries ON stagnant_materials.ministry_id = ministries.id
          LEFT JOIN 
            entities ON stagnant_materials.Entities_id = entities.id
          LEFT JOIN
            state_martial ON stagnant_materials.state_matrial_id = state_martial.id  
          WHERE
            stagnant_materials.created_at BETWEEN ? AND ?
            ${checkEntity ? "AND stagnant_materials.Entities_id = ?" : ""}
        `;
        // Determine the values for the query
        const values = checkEntity
          ? [formattedDateFrom, formattedDateTo, entity_id]
          : [formattedDateFrom, formattedDateTo]; // include entity_id if checkEntity is true
        // Execute the query
        const [rows] = await connection.execute(query, values);

        return rows;
      } catch (error) {
        console.error("Error fetching data:", error.message); // Log any errors
        throw error; // Optionally re-throw the error for further handling
      }
    };
    // Fetch booked materials data
    const fetchMaterialsDataIsBooked = async (connection) => {
      const query = `
              SELECT 
        booking_data_material.*,
        main_class.main_Class_name,
        measuring_unit.measuring_unit,
        users_management.phone_number,
        users_management.user_name,
        ministries.ministries,
        entities_from.Entities_name AS entity_name_from,
        entities_buy.Entities_name AS entity_name_buy,
        state_martial.state_name
      FROM 
        booking_data_material
      LEFT JOIN 
        main_class ON booking_data_material.mainClass_id = main_class.mainClass_id
      LEFT JOIN 
        users_management ON booking_data_material.user_id = users_management.id
      LEFT JOIN 
        measuring_unit ON booking_data_material.measuring_unit_id = measuring_unit.unit_id
      LEFT JOIN 
        entities AS entities_from ON booking_data_material.entity_id = entities_from.id
      LEFT JOIN 
        entities AS entities_buy ON booking_data_material.entity_buy_id = entities_buy.id
      LEFT JOIN 
        ministries ON entities_from.ministries_Id = ministries.id
      LEFT JOIN 
        files ON booking_data_material.obesolote_Material_id = files.insert_id
      LEFT JOIN 
        state_martial ON booking_data_material.state_matrial_id = state_martial.id
          ${
            ifEntity && entity_id
              ? "WHERE booking_data_material.entity_id = ?"
              : ""
          }
        `;
      const values = ifEntity && entity_id ? [entity_id] : [];
      console.log(values, ifEntity);
      const [rows] = await connection.execute(query, values);
      return rows;
    };
    // Gather data based on the reports requested
    const usersData = includes.includes("users")
      ? await fetchUsersData(connection)
      : [];
    const ministriesData = includes.includes("ministriesAndEntities")
      ? await fetchMinistriesAndEntitiesData(connection)
      : [];
    const materialsData = includes.includes("material")
      ? await fetchMaterialsData(connection)
      : [];
    const mainClassesData = includes.includes("mainClass")
      ? await fetchMainClassesData(connection)
      : [];
    const materialOfDataWithinGivenData = includes.includes(
      "materialOfDataWithinGivenDate"
    )
      ? await fetchMaterialDateData(connection)
      : [];
    const materialsBookedData = includes.includes("completedTransactions")
      ? await fetchMaterialsDataIsBooked(connection)
      : [];
    // Send response
    return res.status(200).json({
      includes: reports,
      usersData,
      ministriesData,
      materialsData,
      mainClassesData,
      materialOfDataWithinGivenData,
      materialsBookedData,
      dateFrom,
      dateTo,
      dataMaterial,
      dataUser,
    });
  } catch (error) {
    console.error("Error fetching report data:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    if (connection) connection.release(); // Ensure connection is always released
  }
};

module.exports = {
  getDataCountOfMaterial,
  exportData,
  getDataCountOfEntity,
  getDataINforamaitionReport,
};
