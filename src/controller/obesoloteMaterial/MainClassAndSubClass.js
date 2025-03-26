const path = require("path");
const { connect } = require("../../config/db");
const ProcessorFile = require("../../utils/DeleteFile");

// Base class for common database operations
class DatabaseController {
  constructor() {
    this.connect = connect;
  }

  async getConnection() {
    const pool = await this.connect();
    return await pool.getConnection();
  }

  async executeQuery(connection, query, params = []) {
    try {
      return await connection.execute(query, params);
    } catch (error) {
      throw error;
    }
  }
}

// Main class controller extending base class
class MainClassController extends DatabaseController {
  async register(req, res) {
    const { mainClassName, typeFile } = req.body;
    const image = req.file ? req.file.filename : null;
    
    if (!mainClassName) {
      return res.status(400).json({ message: "أدخل المعلومات المطلوبة" });
    }

    let connection;
    try {
      connection = await this.getConnection();
      
      // Check for existing main class
      const [existingUsers] = await this.executeQuery(
        connection,
        "SELECT * FROM main_class WHERE main_class_name = ?",
        [mainClassName]
      );
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: "الصنف موجودة مسبقا" });
      }
      // Insert main class
      const [response] = await this.executeQuery(
        connection,
        "INSERT INTO main_class (main_class_name) VALUES (?)",
        [mainClassName.trim()]
      );
      if (response.affectedRows > 0) {
        if (image) {
          await this.executeQuery(
            connection,
            "INSERT INTO files (file_name, insert_id, type_file) VALUES (?, ?, ?)",
            [image, response.insertId, typeFile]
          );
        }
        return res.status(201).json({ message: "تم الاضافة بنجاح" });
      }
      return res.status(400).json({ message: "فشل في إضافة الصنف الرئيسي" });
    } catch (error) {
      console.error("Error registering mainClass:", error.message);
      return res.status(500).json({ message: "Internal server error" });
    } finally {
      if (connection) connection.release();
    }
  }
  async getData(req, res) {
    let connection;
    try {
      connection = await this.getConnection();
      const [rows] = await this.executeQuery(
        connection,
        `SELECT main_class.*, file2.*
         FROM main_class
         LEFT JOIN files AS file2 ON file2.insert_id = main_class.mainClass_id 
         AND file2.type_file = 'تصنيف رئيسي'`
      );
      if (rows.length === 0) {
        return res.status(404).json({ message: "No main_class found" });
      }
      return res.status(200).json({ response: rows });
    } catch (error) {
      return res.status(500).json({ message: "An error occurred", error: error.message });
    } finally {
      if (connection) connection.release();
    }
  }
  async getDataById(req, res) {
    let connection;
    try {
      connection = await this.getConnection();
      const [rows] = await this.executeQuery(
        connection,
        "SELECT * FROM main_class WHERE mainClass_id = ?",
        [req.params.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "No main_Class found" });
      }
      return res.status(200).json({ response: rows[0] });
    } catch (error) {
      return res.status(500).json({ message: "An error occurred", error: error.message });
    } finally {
      if (connection) connection.release();
    }
  }
  async deleteById(req, res) {
    let connection;
    try {
      connection = await this.getConnection();
      await connection.beginTransaction();

      const [rows] = await this.executeQuery(
        connection,
        `SELECT main_class.*, file2.*
         FROM main_class
         LEFT JOIN files AS file2 ON file2.insert_id = main_class.mainClass_id 
         AND file2.type_file = 'تصنيف رئيسي'
         WHERE main_class.mainClass_id = ?`,
        [req.params.id]
      );

      if (rows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: "Item not found" });
      }

      const data = rows[0];

      if (data.file_name) {
        try {
          const pathfile = path.join("src/upload_Data/", data.file_name);
          await ProcessorFile(pathfile);
          console.log("The file was deleted successfully");
        } catch (fileError) {
          await connection.rollback();
          return res.status(500).json({ message: fileError.message });
        }
      }

      await this.executeQuery(
        connection,
        "DELETE FROM files WHERE id = ?",
        [data.id]
      );

      await this.executeQuery(
        connection,
        "DELETE FROM sub_class_for_main_class WHERE mainClass_id = ?",
        [req.params.id]
      );

      const [response] = await this.executeQuery(
        connection,
        "DELETE FROM main_class WHERE mainClass_id = ?",
        [req.params.id]
      );

      if (response.affectedRows > 0) {
        await connection.commit();
        return res.status(200).json({ message: "تم الحذف بنجاح" });
      } else {
        await connection.rollback();
        return res.status(404).json({ message: "Item not found" });
      }
    } catch (error) {
      await connection.rollback();
      console.error("Error deleting main class:", error);
      return res.status(500).json({ message: "Internal server error" });
    } finally {
      if (connection) connection.release();
    }
  }
  async edit(req, res) {
    try {
      const { dataEdit, image_id, imageName, dataId } = req.body;
      const fileName = req.file ? req.file.filename : null;
      const trimmedEditData = dataEdit.trim();

      if (imageName && fileName) {
        const pathfile = path.join("src/upload_Data/", imageName);
        await ProcessorFile(pathfile);
      }

      let connection;
      try {
        connection = await this.getConnection();

        if (fileName) {
          await this.executeQuery(
            connection,
            "UPDATE files SET file_name = ? WHERE id = ?",
            [fileName, image_id]
          );
        }

        const [response] = await this.executeQuery(
          connection,
          "UPDATE main_class SET main_class_name = ? WHERE mainClass_id = ?",
          [trimmedEditData, dataId]
        );

        if (response.affectedRows > 0) {
          return res.status(200).json({ message: "تم التحديث بنجاح", response });
        } else {
          return res.status(400).json({ message: "حدث خطأ في تحديث البيانات", response });
        }
      } finally {
        if (connection) connection.release();
      }
    } catch (error) {
      console.error("Error updating main class:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

// Sub class controller extending base class
class SubClassController extends DatabaseController {
  async register(req, res) {
    console.log(req.body);
    
    const { subClassName, mainClass_id, entities_id } = req.body;
    
    // if (!subClassName || !mainClassId  || !entitiesId) {
    //   return res.status(400).json({
    //     message: "يرجى التحقق من إدخال جميع البيانات المطلوبة بشكل صحيح.",
    //   });
    // }

    let connection;
    try {
      connection = await this.getConnection();
      
      const [existingSubClass] = await this.executeQuery(
        connection,
        "SELECT * FROM sub_class_for_main_class WHERE sub_class_name = ? AND mainClass_id = ?",
        [subClassName, mainClass_id]
      );

      if (existingSubClass.length > 0) {
        return res.status(400).json({ message: "الصنف الفرعي موجود مسبقا" });
      }

      const [response] = await this.executeQuery(
        connection,
        "INSERT INTO sub_class_for_main_class (sub_class_name, entities_id, mainClass_id) VALUES (?, ?, ?)",
        [subClassName.trim(), entities_id, mainClass_id]
      );

      if (response.affectedRows > 0) {
        return res.status(201).json({ message: "تم الاضافة بنجاح", response });
      }
      
      return res.status(400).json({ message: "فشل في إضافة الصنف الفرعي" });
    } catch (error) {
      console.error("Error registering subClass:", error);
      return res.status(500).json({ message: "Internal server error" });
    } finally {
      if (connection) connection.release();
    }
  }

  async getData(req, res) {
    let connection;
    try {
      connection = await this.getConnection();
      const [rows] = await this.executeQuery(
        connection,
        `SELECT sub_class_for_main_class.*, main_class.main_class_name
         FROM sub_class_for_main_class
         JOIN main_class ON sub_class_for_main_class.mainClass_id = main_class.mainClass_id`
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "No sub_class found" });
      }
      return res.status(200).json({ response: rows });
    } catch (error) {
      return res.status(500).json({ message: "An error occurred", error: error.message });
    } finally {
      if (connection) connection.release();
    }
  }

  async getDataById(req, res) {
    let connection;
    try {
      connection = await this.getConnection();
      const [rows] = await this.executeQuery(
        connection,
        "SELECT * FROM sub_class_for_main_class WHERE subClass_id = ?",
        [req.params.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "No sub_class found" });
      }
      return res.status(200).json({ response: rows[0] });
    } catch (error) {
      return res.status(500).json({ message: "An error occurred", error: error.message });
    } finally {
      if (connection) connection.release();
    }
  }

  async deleteById(req, res) {
    let connection;
    try {
      connection = await this.getConnection();
      
      const [response] = await this.executeQuery(
        connection,
        "DELETE FROM sub_class_for_main_class WHERE subClass_id = ?",
        [req.params.id]
      );

      if (response.affectedRows > 0) {
        return res.status(200).json({ message: "تم الحذف بنجاح" });
      } else {
        return res.status(404).json({ message: "Item not found" });
      }
    } catch (error) {
      console.error("Error deleting subClass:", error);
      return res.status(500).json({ message: "Internal server error" });
    } finally {
      if (connection) connection.release();
    }
  }

  async edit(req, res) {
    try {
      const { dataEdit, selectMainClassId, dataId } = req.body;
      
      let connection;
      try {
        connection = await this.getConnection();

        const [response] = await this.executeQuery(
          connection,
          "UPDATE sub_class_for_main_class SET sub_class_name = ?, mainClass_id = ? WHERE subClass_id = ?",
          [dataEdit.trim(), selectMainClassId, dataId]
        );

        if (response.affectedRows > 0) {
          return res.status(200).json({ message: "تم التحديث بنجاح", response });
        } else {
          return res.status(400).json({ message: "حدث خطأ في تحديث البيانات", response });
        }
      } finally {
        if (connection) connection.release();
      }
    } catch (error) {
      console.error("Error updating subClass:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async getSubClassByMainClass(req, res) {
    const { mainClassId } = req.params;
    let connection;
    try {
      connection = await this.getConnection();
      const [rows] = await this.executeQuery(
        connection,
        `SELECT sub_class_for_main_class.*, main_class.main_class_name
         FROM sub_class_for_main_class
         JOIN main_class ON sub_class_for_main_class.mainClass_id = main_class.mainClass_id
         WHERE sub_class_for_main_class.mainClass_id = ?`,
        [mainClassId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "No sub classes found for this main class" });
      }
      return res.status(200).json({ response: rows });
    } catch (error) {
      return res.status(500).json({ message: "An error occurred", error: error.message });
    } finally {
      if (connection) connection.release();
    }
  }
}

// Create instances of controllers
const mainClassController = new MainClassController();
const subClassController = new SubClassController();

// Export controller methods
module.exports = {
  MainClassRegister: (req, res) => mainClassController.register(req, res),
  getDataMainClass: (req, res) => mainClassController.getData(req, res),
  getDataMainClassById: (req, res) => mainClassController.getDataById(req, res),
  deleteByIdMainClass: (req, res) => mainClassController.deleteById(req, res),
  editMainClass: (req, res) => mainClassController.edit(req, res),
  subClassRegister: (req, res) => subClassController.register(req, res),
  getDataSubClass: (req, res) => subClassController.getData(req, res),
  getDataSubClassById: (req, res) => subClassController.getDataById(req, res),
  deleteByIdSubClass: (req, res) => subClassController.deleteById(req, res),
  editSubClass: (req, res) => subClassController.edit(req, res),
  getSubClassByMainClass: (req, res) => subClassController.getSubClassByMainClass(req, res)
};
