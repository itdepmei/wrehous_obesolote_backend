const ExcelJS = require("exceljs");
const { connect } = require("../../Config/db");


const getTemplateFileExcel = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      // Fetch data from the database
      const [rowsMainClass] = await connection.execute(`SELECT main_Class_name FROM main_class`);
      const [rowsSubClass] = await connection.execute(`
          SELECT sub_class_for_main_class.*, main_class.main_Class_name 
          FROM sub_class_for_main_class 
          JOIN main_class ON sub_class_for_main_class.mainClass_id = main_class.mainClass_id
      `);
      const [rowsMeasuringUnit] = await connection.execute(`SELECT measuring_unit FROM measuring_unit`);
      const [rowsStateMaterial] = await connection.execute(`SELECT state_name FROM state_martial`);
      const typeMaterialArray = ["مادة راكدة", "مادة بطيئة الحركة"];
      // Create mapping of main class to sub classes
      const mainClassToSubClass = {};
      rowsSubClass.forEach(row => {
          if (!mainClassToSubClass[row.main_Class_name]) {
              mainClassToSubClass[row.main_Class_name] = [];
          }
          mainClassToSubClass[row.main_Class_name].push(row.sub_class_name);
      });
      // Extract all options for dropdowns
      const mainClassOptions = rowsMainClass.map(row => row.main_Class_name);
      const measuringUnitOptions = rowsMeasuringUnit.map(row => row.measuring_unit);
      const stateMaterialOptions = rowsStateMaterial.map(row => row.state_name);
      // Get all subclasses in a single array
      const allSubClasses = Object.values(mainClassToSubClass).flat();
      // Create a new workbook
      const workbook = new ExcelJS.Workbook();
      // Function to create and format a worksheet
      const createWorksheet = (name, labels) => {
        const sheet = workbook.addWorksheet(name);
        // Add and format header row
        sheet.addRow(labels).eachCell((cell, colNumber) => {
          cell.font = { bold: true };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "EEEEEE" },
          };
          sheet.getColumn(colNumber).width = 25;
        });
        return sheet;
      };
      // Function to apply dropdown validation
      const applyDataValidation = (cell, options) => {
        if (options && options.length > 0) {
          const optionsString = options.join(',');
          if (optionsString.length < 255) {  // Excel's limitation
            cell.dataValidation = {
              type: 'list',
              allowBlank: true,
              formulae: [`"${optionsString}"`]
            };
          }
        }
      };
      // Define labels for columns
      const labels = [
        "التصنيف الرئيسي", // Main Class
        "الصنف الفرعي",    // Sub-Class
        "نوع المادة",      // Material Type
        "أسم المادة",      // Material Name
        "حالة المادة",     // Material Status
        "وحدة القياس",     // Unit Measuring
        "ملاحظات",         // Notes
        "تاريخ شراء المادة", // Purchase Date
        "صورة المادة",     // Material Image
        "الكمية",          // Quantity
      ];
      // Set number of rows per sheet
      const ROWS_PER_SHEET = 10;
      // Split main classes into groups of 10
      const numberOfSheets = Math.ceil(mainClassOptions.length / 10);
      // Create multiple sheets based on the number of main classes
      for (let sheetIndex = 0; sheetIndex < numberOfSheets; sheetIndex++) {
        const sheetName = `Template-${sheetIndex + 1}`;
        const worksheet = createWorksheet(sheetName, labels);
        // Apply dropdowns and formatting to 10 rows in this sheet
        for (let rowIndex = 2; rowIndex <= ROWS_PER_SHEET + 1; rowIndex++) {
          // Apply Main Class dropdown with all options
          applyDataValidation(worksheet.getCell(`A${rowIndex}`), mainClassOptions.slice(sheetIndex * 10, (sheetIndex + 1) * 10));
          // Apply Sub Class dropdown with all options
          applyDataValidation(worksheet.getCell(`B${rowIndex}`), allSubClasses);
          // Apply other dropdowns
          applyDataValidation(worksheet.getCell(`C${rowIndex}`), typeMaterialArray);
          applyDataValidation(worksheet.getCell(`E${rowIndex}`), stateMaterialOptions);
          applyDataValidation(worksheet.getCell(`F${rowIndex}`), measuringUnitOptions);
          // Date column formatting
          const dateCell = worksheet.getCell(`H${rowIndex}`);
          dateCell.numFmt = "yyyy-mm-dd";
          // Quantity validation
          worksheet.getCell(`J${rowIndex}`).dataValidation = {
            type: "decimal",
            operator: "greaterThanOrEqual",
            formulae: [0],
            showErrorMessage: true,
            errorTitle: "خطأ في الإدخال",
            error: "يرجى إدخال رقم صحيح أكبر من أو يساوي 0",
          };
        }
        // Add a note about the main classes in this sheet
        const sheetMainClasses = mainClassOptions.slice(sheetIndex * 10, (sheetIndex + 1) * 10);
        worksheet.getCell('A1').note = {
          texts: [{
            text: `Main Classes in this sheet (${sheetIndex + 1}): ${sheetMainClasses.join(', ')}`,
            font: { bold: true }
          }]
        };
      }
      // Create a summary sheet
      const summarySheet = createWorksheet('Summary', ['Main Class', 'Available Sub-Classes']);
      let rowIndex = 2;
      for (const [mainClass, subClasses] of Object.entries(mainClassToSubClass)) {
        summarySheet.getCell(`A${rowIndex}`).value = mainClass;
        summarySheet.getCell(`B${rowIndex}`).value = subClasses.join(', ');
        rowIndex++;
      }
      // Write the Excel file to a buffer
      const buffer = await workbook.xlsx.writeBuffer();
      // Send the Excel file as a response
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=templateExcel.xlsx"
      );
      res.end(buffer);
    } catch (error) {
      console.error("Error while processing data:", error);
      res.status(500).json({ message: "Error while processing data" });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {getTemplateFileExcel};
