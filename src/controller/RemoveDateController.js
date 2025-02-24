const { connect } = require("../config/db");
const cron = require("node-cron");
const { formatDate } = require("../utils/function");
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const RemoveRegister = async (req, res) => {
  const { day } = req.body; // Expecting a day value from the request body
  // Validate the 'day' value
  if (!day) {
    return res.status(400).json({ message: "يرجى إدخال قيمة اليوم" }); // Please enter a day value
  }
  if (isNaN(day)) {
    return res
      .status(400)
      .json({ message: "يرجى إدخال قيمة عددية صحيحة لليوم" }); // Please enter a valid numeric value for the day
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();

    try {
      // Insert the day into the remove_book table
      const registerQuery = "INSERT INTO remove_book (remove_date) VALUES (?)"; // Use VALUES not VALUE
      await connection.execute(registerQuery, [day]);
      res.status(201).json({ message: "تم الإضافة بنجاح" }); // Successfully added
    } catch (dbError) {
      console.error("Error executing query:", dbError);
      res.status(500).json({ message: "حدث خطأ أثناء إضافة البيانات" }); // An error occurred while adding data
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error connecting to the database:", error);
    res.status(500).json({ message: "خطأ في الخادم الداخلي" }); // Internal server error
  }
};
const getDataRemove = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const QueryData = "SELECT * from remove_book";
      const [response] = await connection.execute(QueryData);
      if (response.length > 0) {
        return res.status(200).json({ response });
      } else {
        return res.status(404).json({ message: "No roles found" });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching roles:", error);
    return res.status(500).json({ message: "An error occurred", error });
  }
};
const removeOldData = async () => {
  const pool = await connect();
  let connection;
  try {
    connection = await pool.getConnection();
    // const twoDaysAgo = moment()
    // .subtract(2, "days") // Use "days" instead of "day" for plural consistency
    // .format("YYYY-MM-DD HH:mm:ss");
    const oneYearAgo = moment()
  .subtract(1, "year") // Use "years" to subtract one year
  .format("YYYY-MM-DD HH:mm:ss");

    // Select records from booking_data_material that are older than one minute
    const selectOldDataQuery = `
      SELECT * FROM booking_data_material 
      WHERE created_at < ?
    `;
    const [oldData] = await connection.execute(selectOldDataQuery, [oneYearAgo]);
    // Process each old record
    for (const record of oldData) {
      const obsoleteMaterialId = record.obesolote_Material_id;
      // Fetch related files from the files table
      const queryFiles = `SELECT * FROM files WHERE insert_id = ?`;
      const [files] = await connection.execute(queryFiles, [obsoleteMaterialId]);
      // Check if there are related stagnant materials
      const getDataQuery = `SELECT * FROM stagnant_materials WHERE stagnant_id = ?`;
      const [materialData] = await connection.execute(getDataQuery, [obsoleteMaterialId]);
      // If no related stagnant materials, proceed to delete files
      if (materialData.length === 0) {
        for (const file of files) {
          const filePath = path.join("src/upload_Data/", file.file_name);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
          } else {
            console.log(`File not found: ${filePath}`);
          }
        }
        const deleteFileRecordsQuery = `DELETE FROM files WHERE insert_id = ?`;
        await connection.execute(deleteFileRecordsQuery, [obsoleteMaterialId]);
      }
      // Fetch and delete additional file checks from booking_file_check table
      const queryFileCheck = `SELECT * FROM booking_file_check WHERE id = ?`;
      const [filesCheck] = await connection.execute(queryFileCheck, [record.booking_file_check_id]);

      if (filesCheck.length > 0) {
        const rowDataCheck = filesCheck[0];
        const filePathCheck1 = rowDataCheck.file_check ? path.join("src/upload_Data/", rowDataCheck.file_check) : null;
        const filePathCheck2 = rowDataCheck.file_check_buy ? path.join("src/upload_Data/", rowDataCheck.file_check_buy) : null;

        // Delete file check files
        if (filePathCheck1) {
          if (fs.existsSync(filePathCheck1)) {
            fs.unlinkSync(filePathCheck1);
            console.log(`Deleted file: ${filePathCheck1}`);
          } else {
            console.log(`File not found: ${filePathCheck1}`);
          }
        }

        if (filePathCheck2) {
          if (fs.existsSync(filePathCheck2)) {
            fs.unlinkSync(filePathCheck2);
            console.log(`Deleted file: ${filePathCheck2}`);
          } else {
            console.log(`File not found: ${filePathCheck2}`);
          }
        } else {
          console.log(`file_check_buy is null or undefined: ${filePathCheck2}`);
        }

        const deleteFileCheckQuery = `DELETE FROM booking_file_check WHERE id = ?`;
        await connection.execute(deleteFileCheckQuery, [record.booking_file_check_id]);
      }
    }

    // Delete old records from booking_data_material table
    const deleteOldDataQuery = `
      DELETE FROM booking_data_material 
      WHERE created_at < ?
    `;
    const [result] = await connection.execute(deleteOldDataQuery, [oneYearAgo]);
    console.log(
      result.affectedRows > 0
        ? `Removed ${result.affectedRows} expired records from booking_data_material.`
        : `No expired records found to remove.`
    );
  } catch (error) {
    console.error("An error occurred while removing old data:", error.message);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
const removeOldDataLog = async () => {
  const pool = await connect();
  let connection;
  try {
    connection = await pool.getConnection();
    // Subtract one year from the current date
    const oneYearAgo = moment()
      .subtract(1, "year") // Use "years" to subtract one year
      // .subtract(1, "minute") // Use "years" to subtract one year

      .format("YYYY-MM-DD HH:mm:ss");
    // Select old data (optional, depending on your needs)
    const selectOldDataQuery = `
      SELECT * FROM log_information WHERE created_At < ?
    `;
    const [oldData] = await connection.execute(selectOldDataQuery, [oneYearAgo]);

    // Log the old data for reference (optional)
    if (oldData.length > 0) {
      console.log(`Found ${oldData.length} records older than one year.`);
    }

    // Delete old records from log_information table
    const deleteOldDataQuery = `
      DELETE FROM log_information 
      WHERE created_At < ?
    `;
    const [result] = await connection.execute(deleteOldDataQuery, [oneYearAgo]);

    console.log(
      result.affectedRows > 0
        ? `Removed ${result.affectedRows} expired records from log_information.`
        : `No expired records found to remove.`
    );
  } catch (error) {
    console.error("An error occurred while removing old data:", error.message);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
// Schedule the job to run every minute for testing
const handleRemove = async (rows) => {
  const pool = await connect();

  let connection;
  try {
    connection = await pool.getConnection();
    // Check if there are no rows
    if (rows.length === 0) {
      return res.status(404).json({ message: "لاتوجد بيانات حالية" }); // "No current data found"
    }

    // Access the first row and extract remove_date
    const { remove_date: date } = rows[0]; // Destructure to access remove_date
    if (!date) {
      console.error("remove_date is undefined or null.");
      return;
    }
    // Create a Date object from the date string
    const dateObj = formatDate(date);
    const removeDate = dateObj.split("-")[2]; // Extract the day from the date string
    console.log("Formatted Date:", dateObj);

    // Schedule the job to remove old data every X days based on removeDate
    cron.schedule(`0 0 * * *`, async () => {
      console.log("Running the job to remove old data...");
      await removeOldData(removeDate);
    });
  } catch (error) {
    console.error(
      "An error occurred while processing remove data:",
      error.message
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
const checkRemoveData = async (req, res) => {
  const pool = await connect();
  let connection;
  try {
    connection = await pool.getConnection();

    // Query to fetch data from the remove_book table
    const getDataRemoveQuery = "SELECT * FROM remove_book";
    const [rows] = await connection.execute(getDataRemoveQuery);

    // Check if records were found
    if (rows.length > 0) {
      await handleRemove(rows); // Pass the fetched rows to handleRemove
      console.log(`Fetched ${rows.length} records from remove_book.`);
    } else {
      console.log("No records found in remove_book.");
    }
  } catch (error) {
    console.error(
      "An error occurred while fetching remove_book data:",
      error.message
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
const deleteDateRemoveById = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const deleteGovernorateById = "DELETE FROM remove_book WHERE id=?";
      const [response] = await connection.execute(deleteGovernorateById, [
        req.params.id,
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
const EditRemoveDateName = async (req, res) => {
  const { dataEdit, dataId } = req.body;
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const trimmedEdit_data = dataEdit.trim();
      const updateQuery = `UPDATE remove_book SET remove_date=? WHERE id=?`;
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
module.exports = {
  RemoveRegister,
  getDataRemove,
  deleteDateRemoveById,
  removeOldData,
  handleRemove,
  checkRemoveData,
  removeOldDataLog,
  EditRemoveDateName
};
