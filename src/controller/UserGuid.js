const path = require("path");
const { connect } = require("../config/db");
const ProcessorFile = require("../utils/DeleteFile");
const UserGuidInsert = async (req, res) => {
  const { description } = req.body;
  const fileName = req.file ? req.file.filename : null;
  if (!description || !fileName) {
    return res.status(400).json({ message: "أدخل المعلومات المطلوبة" });
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const insertUserGuidQuery = `
        INSERT INTO user_guide (description,file_name)
        VALUES (?,?)
      `;
      const [response] = await connection.execute(insertUserGuidQuery, [
        description.trim(),
        fileName,
      ]);
      if (response.affectedRows > 0) {
        return res.status(201).json({ message: "تم الاضافة بنجاح" });
      } else {
        return res.status(400).json({ message: "فشل في إضافة " });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error registering user guid:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};
const getDataUserGuid = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    const getDataUserGuidQuery = `
      SELECT* FROM user_guide
    `;
    const [rows] = await connection.execute(getDataUserGuidQuery);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No user guid found" });
    }
    res.status(200).json({ response: rows });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const deleteUserGuidById = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    // Start the transaction
    await connection.beginTransaction();
    // Query to get the main class and associated file data
    const getDataUserGuid = `
      SELECT *  
      FROM user_guide
      WHERE id = ?
    `;
    // Execute the query and fetch the data
    const [rows] = await connection.execute(getDataUserGuid, [req.params.id]);
    const data = rows[0];

    if (!data) {
      // If no data is found, rollback and return a 404
      await connection.rollback();
      return res.status(404).json({ message: "Item not found" });
    }
    // If a file is associated with the main class, attempt to delete it
    if (data.file_name) {
      try {
        const pathfile = path.join("src/upload_Data/", data.file_name);
        // Wait for the file to be processed
        await ProcessorFile(pathfile);
        console.log("The file was deleted successfully");
      } catch (fileError) {
        // On file processing error, rollback and return a 500 error
        console.error(fileError.message);
        await connection.rollback();
        return res.status(500).json({ message: fileError.message });
      }
    }
    const deleteMainClassQuery = "DELETE FROM user_guide WHERE id = ?";
    const [response] = await connection.execute(deleteMainClassQuery, [
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
const getDataUserGuidIsShowGuid = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    const getDataUserGuidQuery = `
        SELECT* FROM user_guide WHERE  is_show = 1
      `;
    const [rows] = await connection.execute(getDataUserGuidQuery);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No user guid found" });
    }
    res.status(200).json({ response: rows });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const editUserGuid = async (req, res) => {
  try {
    const { dataEdit, imageName, dataId } = req.body;
    const fileName = req.file ? req.file.filename : null;
    const trimmedEditData = dataEdit.trim();
    // If there's an existing image and a new file, delete the old image
    if (imageName && fileName) {
      const pathfile = path.join("src/upload_Data/", imageName);
      ProcessorFile(pathfile, res, () => {
        console.log("File deleted successfully");
      });
    }
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      let response;
      // Update description and file name if a new file is provided
      if (fileName) {
        const updateQuery = `UPDATE user_guide SET description = ?, file_name = ? WHERE id = ?`;
        [response] = await connection.execute(updateQuery, [
          trimmedEditData,
          fileName,
          dataId,
        ]);
      } else {
        // Update only the description if no new file is provided
        const updateQuery = `UPDATE user_guide SET description = ? WHERE id = ?`;
        [response] = await connection.execute(updateQuery, [
          trimmedEditData,
          dataId,
        ]);
      }
      // Check and respond based on the update result
      if (response.affectedRows > 0) {
        res.status(200).json({ message: "تم التحديث بنجاح" });
      } else {
        res.status(400).json({ message: "حدث خطأ في تحديث البيانات" });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error updating user guide:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const EditAccessTOfile = async (req, res) => {
  const { data } = req.body;
  if (!data || !Array.isArray(data) || data.length === 0) {
    return res
      .status(400)
      .json({
        message:
          "'accessIds' should be an array of objects with 'id' and 'show_guide'",
      });
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const updatePromises = data.map(async (item) => {
        if (!item.id || item.show_guide === undefined) {
          console.error(`Invalid data for item: ${JSON.stringify(item)}`);
          return null; // Skip invalid items
        }
        const updateQuery = `UPDATE user_guide SET is_show = ? WHERE id = ?`;
        const [response] = await connection.execute(updateQuery, [
          item.show_guide,
          item.id,
        ]);
        console.log(`Updated record  with ID: ${item.id}, Response:`, response);
        return response;
      });
      // Wait for all updates to finish
      const results = await Promise.all(updatePromises);
      // Check if at least one record was updated
      if (results.some((result) => result && result.affectedRows > 0)) {
        return res.status(200).json({ message: "تم التحديث بنجاح", results });
      } else {
        return res.status(400).json({ message: "لم يتم تحديث أي سجل" });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error updating user management:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  UserGuidInsert,
  getDataUserGuid,

  EditAccessTOfile,

  deleteUserGuidById,
  getDataUserGuidIsShowGuid,
  editUserGuid,
};
