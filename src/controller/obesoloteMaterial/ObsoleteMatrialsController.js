const path = require("path");
const { connect } = require("../../Config/db");
const {
  getDataQuery,
  deleteItem,
  getAllDataQuery,
  getDataByStagnantIdQuery,
} = require("../../query/ObsoleteMatrialsControllerQuery");
const ProcessorFile = require("../../utils/DeleteFile");
const {
  getInformation,
  getUserByIdQuery2,
  getUserByIdQuery,
} = require("../../query/userMangeController-db");
const { formatDate } = require("../../utils/function");
const pusher = require("../../utils/pusherINfo");
const {insertNotification} = require("../../utils/createNotifction");
const logger = require("../../middleware/Logger");
const createLogEntry = require("../../utils/createLog");
const stagnantMaterialsRegister = async (req, res) => {
  const {
    nameMartials,
    status_martials,
    measuring_unit,
    ministry_id,
    Entities_id,
    // price_material,
    Quantity,
    sub_class,
    main_class,
    user_id,
    typMartials,
    description,
    purchaseDate,
  } = req.body;
  const trimmedFields = {
    trimmedNameMartials: nameMartials?.trim() || "",
    trimmedStatusMartials: status_martials?.trim() || "",
    trimmedMeasuringUnit: measuring_unit?.trim() || "",
    trimmedMinistryId: ministry_id?.trim() || "",
    trimmedEntitiesId: Entities_id?.trim() || "",
    trimmedSubClass: sub_class?.trim(),
    trimmedMainClass: main_class?.trim(),
    trimmedTypMartials: typMartials?.trim() || "",
    trimmedDescription: description?.trim() || "",
    trimQuantity: Quantity?.trim(),
  };
  const {
    trimmedNameMartials,
    trimmedStatusMartials,
    trimmedMeasuringUnit,
    trimmedMinistryId,
    trimmedEntitiesId,
    trimmedSubClass,
    trimmedMainClass,
    trimmedTypMartials,
    trimmedDescription,
    trimQuantity,
  } = trimmedFields;
  const Date = formatDate(purchaseDate);
  // Check for required fields after trimming
  if (
    !trimmedNameMartials ||
    !trimmedStatusMartials ||
    !trimmedMeasuringUnit ||
    !trimmedMinistryId ||
    !trimmedEntitiesId ||
    !measuring_unit ||
    !trimmedSubClass ||
    !trimmedMainClass ||
    !trimQuantity
  ) {
    return res.status(400).json({ message: "أدخل البيانات المطلوبة" });
  }
  if (trimQuantity < 0 || !Number.isFinite(Number(trimQuantity))) {
    // The value is either empty or contains invalid characters
    return res.status(400).json({ message: "يجب إدخال رقم صحيح " });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "يجب اختيار على الاقل صورة واحدة" });
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    const user_Auth = req.user._id;
    try {
      const insertQuery = `
  INSERT INTO stagnant_materials 
    (state_matrial_id, name_material, Entities_id, ministry_id, Quantity, user_id, mainClass_id, subClass_id, measuring_unit_id, typ_material, description, puchase_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ${sub_class === null ? "NULL" : "?"}, ?, ?, ?, ?)
`;
      const [response] = await connection.execute(insertQuery, [
        trimmedStatusMartials,
        trimmedNameMartials,
        trimmedEntitiesId,
        trimmedMinistryId,
        // price_material,
        trimQuantity,
        user_id,
        trimmedMainClass,
        trimmedSubClass || null,
        trimmedMeasuringUnit,
        trimmedTypMartials,
        trimmedDescription,
        Date,
      ]);
      if (response.affectedRows > 0) {
        const insertId = response.insertId;
        if (req.files && req.files.length > 0) {
          const insertFileQuery = `
            INSERT INTO files (file_name, insert_id, type_file) 
            VALUES (?, ?, ?)`;
          const fileInsertPromises = req.files.map((file) =>
            connection.query(insertFileQuery, [
              file.filename,
              insertId,
              "مادة راكدة",
            ])
          );
          await Promise.all(fileInsertPromises);
        }
        const [userInformation] = await connection.execute(getInformation, [
          user_id,
        ]);
        const data = userInformation[0];
        const logInfo = `تم إدراج هذا المنتج ${trimmedNameMartials} من قبل المستخدم ${data.user_name}، والكمية التي تم إدراجها هي ${Quantity}`;
        // const insertLogQuery = `
        //   INSERT INTO log_information (master_id, text, stagnant_id)
        //   VALUES (?, ?, ?)`;
        // await connection.execute(insertLogQuery, [1, logInfo, insertId]);
        createLogEntry(connection, 1, user_id, Entities_id, logInfo);
        const getDataUsersQuery = `
        SELECT 
          um.id AS user_id, um.*, 
          r.id AS role_id, r.*
        FROM users_management um
        LEFT JOIN roles r ON um.group_id = r.id
        WHERE um.entities_id = ? AND r.id = '2'
      `;
        // Execute the query with the entity ID
        console.log(Entities_id);

        const [userData] = await connection.execute(getDataUsersQuery, [
          Entities_id,
        ]);
        const [userAuthData] = await connection.execute(getUserByIdQuery2, [
          user_Auth,
        ]);
        if (userData.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }
        const user = userData[0];
        const userAuth = userAuthData[0];
        await insertNotification(
          userAuth.user_id,
          "طلب موافقة",
          (message = `بأنتظار الموافقة على الطلب`),
          (type = "info"),
          (url = "Obsolete-Material-Approve-Admin"),
          user.entities_id,
          response.insertId,
          2
        );
        // Trigger Pusher event
        const eventData = {
          name: "send_request_material",
          message: `تم أدراج مادة من خلال ${userAuth.user_name} التابع ${userAuth.Entities_name}  بأنتظار الموافقة على الطلب`,
          user_id: user.user_id,
          category_id:2
          // entities_id: entities_id,
        };
        pusher.trigger("poll", "vote", eventData);
        return res.status(201).json({ message: "تم أضافة المادة بنجاح" });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error registering material:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const getDataStagnantMaterials = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    const [rows] = await connection.execute(getDataQuery, [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }
    res.status(200).json({ response: rows });
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
const getPaginatedData = async (req, res, queryConditions, queryParams) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();

    // Pagination parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    // Total count query
    const totalCountQuery = `
      SELECT COUNT(*) AS count 
      FROM stagnant_materials 
      ${queryConditions}`;
    const [totalRows] = await connection.execute(totalCountQuery, queryParams);
    const totalItems = totalRows[0].count;
    const totalPages = Math.ceil(totalItems / limit);
    // Data query with pagination
    const dataQuery = `
      SELECT 
          stagnant_materials.*,
          sub_class_for_main_class.*,
          main_class.*,
          measuring_unit.measuring_unit,
          users_management.phone_number,
          users_management.user_name,
          entities.Entities_name,
          ministries.ministries,
          state_martial.id AS status_id,
          state_martial.state_name,
          GROUP_CONCAT(CONCAT(files.file_name, '|', files.id, '|', files.insert_id, '|', files.type_file) SEPARATOR ',') AS image_files,
          COUNT(files.file_name) AS image_count
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
          files ON stagnant_materials.stagnant_id = files.insert_id  
      LEFT JOIN
          state_martial ON stagnant_materials.state_matrial_id = state_martial.id  
      ${queryConditions}
      GROUP BY 
          stagnant_materials.stagnant_id
      ORDER BY 
          stagnant_materials.stagnant_id DESC
      LIMIT ${limit} OFFSET ${offset};`;

    const [rows] = await connection.execute(dataQuery, queryParams);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }
    // Format image data
    const result = rows.map((item) => {
      const { image_files, ...rest } = item;
      const images = image_files
        ? image_files.split(",").map((file) => {
            const [file_name, id, insert_id, type_file] = file.split("|");
            return { file_name, id, insert_id, type_file };
          })
        : [];
      return {
        ...rest,
        images,
      };
    });

    res.status(200).json({
      response: result,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
      },
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
// Specific function handlers
const getDataStagnantMaterialsPa = (req, res) => {
  const queryConditions = "WHERE stagnant_materials.Entities_id = ?";
  const queryParams = [req.query.entities_id];
  getPaginatedData(req, res, queryConditions, queryParams);
};
const getDataStagnantMaterialsByUserId = (req, res) => {
  const user_id = req.user._id;
  const queryConditions = "WHERE stagnant_materials.user_id = ?";
  const queryParams = [user_id];
  getPaginatedData(req, res, queryConditions, queryParams);
};
const getDataStagnantMaterialsApproveAdmin = (req, res) => {
  const queryConditions = `
    WHERE stagnant_materials.Entities_id = ? 
    AND stagnant_materials.approved_admin = ? 
    AND stagnant_materials.approve_super_user_root = ?`;
  const queryParams = [req.query.entities_id, false, false];
  getPaginatedData(req, res, queryConditions, queryParams);
};
const getDataStagnantMaterialsApproveSuperAdminRoot = (req, res) => {
  const queryConditions = `
    WHERE stagnant_materials.approved_admin = ? 
    AND stagnant_materials.approve_super_user_root = ?`;
  const queryParams = [true, false];
  getPaginatedData(req, res, queryConditions, queryParams);
};
const getDataStagnantMaterialsSearch = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    const page = parseInt(req.query.page, 10) || 1; // Default to page 1
    const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 items per page
    const offset = (page - 1) * limit;
    let searchConditions = [];
    let queryParams = [];
    if (req.query.mainClass) {
      searchConditions.push("sm.mainClass_id = ?");
      queryParams.push(req.query.mainClass);
    }
    if (req.query.sub_class || req.query.sub_class.length > 0) {
      searchConditions.push("sm.subClass_id = ?");
      queryParams.push(req.query.sub_class);
    }
    if (req.query.Entities_id) {
      searchConditions.push("sm.Entities_id = ?");
      queryParams.push(req.query.Entities_id);
    }
    if (req.query.ministry_id) {
      searchConditions.push("sm.ministry_id = ?");
      queryParams.push(req.query.ministry_id);
    }
    const whereClause = searchConditions.length
      ? `WHERE ${searchConditions.join(" AND ")}`
      : "";
    const [totalRows] = await connection.execute(
      `SELECT COUNT(*) AS count FROM stagnant_materials sm ${whereClause}`,
      queryParams
    );
    const totalItems = totalRows[0].count;
    const totalPages = Math.ceil(totalItems / limit);
    console.log(searchConditions, queryParams);
    // Data query
    const getDataQuerySearchh = `
      SELECT 
        sm.*, sc.*, mc.*, um.*, mu.*, e.*, m.*
      FROM 
        stagnant_materials sm
     LEFT JOIN
        sub_class_for_main_class sc ON sm.subClass_id = sc.subClass_id
     LEFT JOIN
        main_class mc ON sm.mainClass_id = mc.mainClass_id
     LEFT JOIN
        users_management um ON sm.user_id = um.id
     LEFT JOIN
        measuring_unit mu ON sm.measuring_unit_id = mu.unit_id
     LEFT JOIN
        ministries m ON sm.ministry_id = m.id
     LEFT JOIN 
        entities e ON sm.Entities_id = e.id
      ${whereClause}
       LIMIT ${limit} OFFSET ${offset};
    `;
    const [rows] = await connection.execute(getDataQuerySearchh, queryParams);
    // console.log(rows);
    if (rows.length === 0) {
      return res.status(404).json({ message: "لا توجد بيانات" });
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
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    if (connection) connection.release();
    console.log("Connection released");
  }
};
const getAllDataStagnantMaterials = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    console.log("Connection established");
    const [rows] = await connection.execute(getAllDataQuery);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }
    res.status(200).json({ response: rows });
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
const stagnantMaterialsEdit = async (req, res) => {
  const {
    status_martials,
    nameMartials,
    measuring_unit,
    ministry_id,
    Entities_id,
    price_material,
    Quantity,
    sub_class,
    main_class,
    removeFile = [],
    description,
    typMartials,
    id,
  } = req.body;

  const nameMaterial = (nameMartials || "").trim() || null;
  const statusMaterial = (status_martials || "").trim() || null;
  const measuringUnit = (measuring_unit || "").trim() || null;
  const ministryId = (ministry_id || "").trim() || null;
  const entitiesId = (Entities_id || "").trim() || null;
  const priceMaterial = (price_material || "").trim() || null;
  const quantity = (Quantity || "").trim() || null;
  const subClass = (sub_class || "").trim() || null;
  const mainClass = (main_class || "").trim() || null;
  const descriptionText = (description || "").trim() || null;
  const user = req.user;
  const fileNames = req.files ? req.files.map((file) => file.filename) : [];
  const filesToRemove = Array.isArray(removeFile)
    ? removeFile
    : JSON.parse(removeFile || "[]");

  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Fetch existing data
      await connection.execute(getDataByStagnantIdQuery, [id]);

      // Update stagnant material
      const updateQuery = `
        UPDATE stagnant_materials 
        SET
          state_matrial_id = ?,
          name_material = ?,
          Entities_id = ?,
          ministry_id = ?,
          price_material = ?,
          Quantity = ?,
          mainClass_id = ?,
          subClass_id = ?,
          measuring_unit_id = ?,
          description = ?,
          typ_material=?
        WHERE stagnant_id = ?
      `;
      const [updateResult] = await connection.execute(updateQuery, [
        statusMaterial,
        nameMaterial,
        entitiesId,
        ministryId,
        priceMaterial,
        quantity,
        mainClass,
        subClass,
        measuringUnit,
        descriptionText,
        typMartials,
        id,
      ]);
      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        return res
          .status(404)
          .json({ message: "Material not found or update failed" });
      }

      // Log the update
      const [userInfoRows] = await connection.execute(getInformation, [
        user._id,
      ]);
      const dataUser = userInfoRows[0];
      const text = `تم تعديل المنتج من قبل ${dataUser.user_name}`;
      const insertLogQuery =
        "INSERT INTO log_information (master_id, user_id, entities_id, text) VALUES (?, ?, ?, ?)";
      await connection.execute(insertLogQuery, [
        3,
        dataUser.id,
        dataUser.entities_id,
        text,
      ]);
      // Handle file deletions
      if (filesToRemove.length > 0) {
        const fileDeletePromises = filesToRemove.map(async (file) => {
          await connection.execute("DELETE FROM files WHERE id = ?", [file.id]);
          const filePath = path.join("src/upload_Data/", file.file_name);
          console.log(`Deleting file: ${filePath}`);
          try {
            ProcessorFile(filePath);
            console.log(`File deleted: ${filePath}`);
          } catch (err) {
            console.error(`Error deleting file: ${filePath}`, err);
          }
        });
        await Promise.all(fileDeletePromises);
      }
      // Handle file uploads
      if (fileNames.length > 0) {
        const insertFileQuery = `
          INSERT INTO files (file_name, insert_id, type_file) 
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE file_name = VALUES(file_name)
        `;
        const fileUpdatePromises = fileNames.map((fileName) =>
          connection.execute(insertFileQuery, [fileName, id, "مادة راكدة"])
        );
        await Promise.all(fileUpdatePromises);
      }
      await connection.commit();
      return res
        .status(200)
        .json({ message: `تم تعديل المنتج أو المادة بنجاح ` });
    } catch (err) {
      await connection.rollback();
      console.error("Transaction error:", err);
      return res.status(500).json({ message: "Failed to update material" });
    } finally {
      connection.release(); // Ensure connection is released
    }
  } catch (error) {
    console.error("Connection error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
const getDataStagnantMaterialAllByMainClassId = async (req, res) => {
  let connection;
  try {
    // Establish database connection
    const pool = await connect();
    connection = await pool.getConnection();

    // SQL query to fetch data with joins and conditions
    const getDataByMainClassIdQuery = `
      SELECT 
        stagnant_materials.*,
        sub_class_for_main_class.sub_class_name,
        main_class.main_Class_name,
        measuring_unit.measuring_unit,
        users_management.phone_number,
        users_management.user_name,
        governorate.governorate_name, 
        governorate.id AS address_id,
        entities.Entities_name,
        ministries.ministries,
        state_martial.id AS status_id,
        state_martial.state_name,
        GROUP_CONCAT(files.file_name) AS image_files,
        COUNT(files.file_name) AS image_count
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
        files ON stagnant_materials.stagnant_id = files.insert_id   
      LEFT JOIN
        state_martial ON stagnant_materials.state_matrial_id = state_martial.id  
      LEFT JOIN 
        governorate ON users_management.address_id = governorate.id
      WHERE 
        stagnant_materials.mainClass_id = ?
        ${
          req.query.Entities_id ? "AND stagnant_materials.Entities_id != ?" : ""
        }
        AND approve_super_user_root = true
        AND approved_admin = true
      GROUP BY 
        stagnant_materials.stagnant_id
    `;

    // Build query parameters dynamically
    const queryParams = [req.query.mainClassId];
    if (req.query.Entities_id) {
      queryParams.push(req.query.Entities_id);
    }

    // Execute the query
    const [rows] = await connection.execute(
      getDataByMainClassIdQuery,
      queryParams
    );

    // Handle case where no data is found
    if (rows.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }

    // Process rows to format images as an array
    const result = rows.map((item) => {
      const { image_files, ...rest } = item;
      return {
        ...rest,
        images: image_files
          ? image_files.split(",").map((file_name) => ({ file_name }))
          : [], // Default to an empty array if no images
      };
    });

    // Send the formatted response
    res.status(200).json({ response: result });
  } catch (error) {
    console.error("An error occurred: ", error.message);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    // Release the connection
    if (connection) connection.release();
    console.log("Connection released");
  }
};

const getDataStagnantMaterialAllByAndStagnantId = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    console.log("Connection established");
    const [rows] = await connection.execute(getDataByStagnantIdQuery, [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }
    const data = rows[0];
    const { image_files, ...rest } = data;
    const result = {
      ...rest,
      images: image_files
        ? image_files.split(",").map((file_name) => ({
            file_name,
          }))
        : [], // If no images, return an empty array
    };
    res.status(200).json({ response: result });
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
const getDataStagnantMaterialAllByMainClassIdCurrentMonth = async (
  req,
  res
) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    console.log("Connection established");
    // Modify the query to filter by the current month and order by insertion date
    const getDataByCurrentMonthQuery = `
    SELECT 
      stagnant_materials.*,
      sub_class_for_main_class.sub_class_name,
      main_class.main_Class_name,
      measuring_unit.measuring_unit,
      users_management.phone_number,
      users_management.user_name,
      governorate.governorate_name, 
  governorate.id AS address_id,
      entities.Entities_name,
      ministries.ministries,
       GROUP_CONCAT(files.file_name) AS image_files,
        COUNT(files.file_name) AS image_count
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
      files ON stagnant_materials.stagnant_id = files.insert_id
    LEFT JOIN 
  governorate ON users_management.address_id = governorate.id  
    WHERE
      MONTH(stagnant_materials.created_at) = MONTH(CURRENT_DATE()) 
      AND YEAR(stagnant_materials.created_at) = YEAR(CURRENT_DATE())
GROUP BY stagnant_materials.stagnant_id
    ORDER BY 
      stagnant_materials.created_at DESC
  `;
    const [rows] = await connection.execute(getDataByCurrentMonthQuery);
    const result = rows.map((item) => {
      // Remove image_files from the object and add images array
      const { image_files, ...rest } = item;
      return {
        ...rest,
        images: image_files
          ? image_files.split(",").map((file_name) => ({
              file_name,
            }))
          : [], // If no images, return an empty array
      };
    });
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No data found for the current month" });
    }
    res.status(200).json({ response: result }); // Return the last inserted data
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

const deleteById = async (req, res) => {
  const connection = await connect();
  let conn;
  try {
    const user = req.user;
    conn = await connection.getConnection();
    const [rows] = await conn.execute(getDataByStagnantIdQuery, [
      req.params.id,
    ]);
    const data = rows[0];
    if (!data) {
      return res.status(404).json({ message: "Item not found" });
    }
    await conn.beginTransaction();
    // Fetch user information
    const [userInfoRows] = await conn.execute(getInformation, [user._id]);
    const userInfo = userInfoRows[0];
    const text = `تم حذف المنتج من قبل المستخدم ${userInfo?.user_name}`;
    createLogEntry(connection, 2, user._id, data.Entities_id, text);
    if (insertLogResult.affectedRows === 0) {
      throw new Error("Failed to insert log.");
    }
    // Fetch associated files
    const queryFiles = "SELECT * FROM files WHERE insert_id = ?";
    const [files] = await conn.execute(queryFiles, [req.params.id]);
    // Process each file
    for (const item of files) {
      const filePath = path.join("src/upload_Data/", item.file_name);
      await ProcessorFile(filePath);
    }
    // Delete the item
    const [deleteResult] = await conn.execute(deleteItem, [req.params.id]);
    if (deleteResult.affectedRows === 0) {
      throw new Error("Failed to delete the item.");
    }
    // Commit the transaction
    await conn.commit();
    return res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    // Roll back the transaction in case of an error
    if (conn) await conn.rollback();
    console.error("Error deleting item:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    // Release the connection
    if (conn) conn.release();
  }
};

const ApproveAdminMaterial = async (req, res) => {
  try {
    const pool = await connect();
    const { dataId } = req.body;
    const connection = await pool.getConnection();
    const user_id = req.user._id;
    try {
      await connection.beginTransaction();
      // Update booking status to approved (set `approved_admin` to true)
      const approveAdminQuery = `UPDATE stagnant_materials SET approved_admin = ? WHERE stagnant_id = ?`;
      const [approveResponse] = await connection.execute(approveAdminQuery, [
        true,
        dataId,
      ]);
      // Check if the update was successful
      if (approveResponse.affectedRows > 0) {
        // Fetch user authorization data
        const [userDataAuth] = await connection.execute(getUserByIdQuery, [
          user_id,
        ]);
        // Fetch user data with the "technical support" role
        const getDataUsersQuery = `
          SELECT um.id AS user_id, um.*, r.id AS role_id, r.*
          FROM users_management um
          LEFT JOIN roles r ON um.group_id = r.id
          WHERE r.id = '4'
        `;
        const [userData] = await connection.execute(getDataUsersQuery);
        if (userDataAuth.length > 0 && userData.length > 0) {
          const userAuth = userDataAuth[0];
          const user = userData[0];
          // Create log entry
          const logText = `تم الموافقة على الطلب الرفع ${userAuth.user_name} التابع الى ${userAuth.Entities_name}`;
          const insertLogQuery = `
            INSERT INTO log_information (master_id, user_id, entities_id, text)
            VALUES (?, ?, ?, ?)
          `;
          await connection.execute(insertLogQuery, [
            7,
            user_id,
            userAuth.entity_id,
            logText,
          ]);
          // Trigger Pusher event
          const message = `${userAuth?.user_name} من ${userAuth?.Entities_name} طلب موافقة رفع مادة`;
          await insertNotification(
            userAuth.user_id,
            "طلب موافقة المادة",
            message,
            (type = "info"),
            (url = "Obsolete-Material-Approve-Super-Admin"),
            user.entities_id,
            null,
            2
          );
          const eventData = {
            name: "approve_Admin_request",
            message: `تم أرسال طلب رفع مادة من قبل ${userAuth.user_name} التابع الى  ${userAuth.Entities_name}`,
            user_id: user.user_id,
            category_id:2
          };
          pusher.trigger("poll", "vote", eventData);
        }
      }
      await connection.commit();
      res
        .status(200)
        .json({ message: "تم الموافقة على الطلب", approveResponse });
    } catch (err) {
      await connection.rollback();
      console.error("Error during transaction:", err);
      res
        .status(500)
        .json({ message: "Database query error", error: err.message });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error approving booking:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
const ApproveSuperAdminMaterial = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    const { dataId } = req.body;
    const user_id = req.user._id;
    try {
      await connection.beginTransaction();
      // Update booking status to approved (set `approved_admin` to true)
      const approveAdminQuery = `UPDATE stagnant_materials SET approve_super_user_root = ? WHERE stagnant_id = ?`;
      const [approveResponse] = await connection.execute(approveAdminQuery, [
        true,
        dataId,
      ]);
      // Check if the update was successful
      if (approveResponse.affectedRows > 0) {
        // Fetch user authorization data
        const [userDataAuth] = await connection.execute(getUserByIdQuery, [
          user_id,
        ]);
        // Fetch user data with the "technical support" role
        const getDataMaterial = `
        SELECT 
            stagnant_materials.*,
            entities.Entities_name
        FROM 
            stagnant_materials 
        LEFT JOIN 
            entities ON stagnant_materials.Entities_id = entities.id
        WHERE 
            stagnant_materials.stagnant_id = ?;
    `;
        const [rowMaterial] = await connection.execute(getDataMaterial, [
          dataId,
        ]);
        const dataMaterial = rowMaterial[0];
        const getDataUsersQuery = `
          SELECT um.id AS user_id, um.*, r.id AS role_id, r.*,
          E.Entities_name
          FROM users_management um
          LEFT JOIN roles r ON um.group_id = r.id
          LEFT JOIN  entities E ON um.entities_id = E.id
          WHERE r.id = '4'
        `;
        const [userData] = await connection.execute(getDataUsersQuery);
        if (userDataAuth.length > 0 && userData.length > 0) {
          const userAuth = userDataAuth[0];

          // Create log entry
          const logText = `تم الموافقة على رفع المادة الخاصة ب ${dataMaterial.Entities_name} بواسطة ${userAuth.Entities_name} المستخدم ${userAuth.user_name}`;
          const insertLogQuery = `
            INSERT INTO log_information (master_id, user_id, entities_id, text)
            VALUES (?, ?, ?, ?)
          `;
          await connection.execute(insertLogQuery, [
            9,
            user_id,
            userAuth.entity_id,
            logText,
          ]);
          // Trigger Pusher event
          const message = `تم الموافقة على الرافع`;
          await insertNotification(
            userAuth.user_id,
            "موافقة رفع",
            message,
            (type = "success"),
            (url = `Material-Overview/${dataId}`),
            dataMaterial.Entities_id,
            null,
            2
          );
          const eventData = {
            name: "approve_super_Admin_request",
            message: `تم رفع المنتج بنجاح`,
            user_id: dataMaterial.user_id,
            category_id:2
          };
          pusher.trigger("poll", "vote", eventData);
        }
      }
      await connection.commit();
      res
        .status(200)
        .json({ message: "تم الموافقة على الطلب", approveResponse });
    } catch (err) {
      await connection.rollback();
      console.error("Error during transaction:", err);
      res
        .status(500)
        .json({ message: "Database query error", error: err.message });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error approving booking:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
const stagnantMaterialsRegisterAsForLoop = async (req, res) => {
  const { data } = req.body;
  logger.info("Starting stagnant materials registration process.");

  if (!req.files || req.files.length === 0) {
    logger.warn("No files provided for the request.");
    return res
      .status(400)
      .json({ message: "على الاقل صورة واحدة مطلوبة لكل حقل " });
  }
  const pool = await connect();
  const connection = await pool.getConnection();
  const user_Auth = req.user._id;
  const existingMaterials = []; // Array to store messages about existing materials
  try {
    await connection.beginTransaction(); // Start transaction
    const materials = JSON.parse(data); // Assuming 'data' contains an array of materials
    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      logger.error("Invalid or empty materials data.");
      return res.status(400).json({ message: "Invalid data" });
    }

    for (const [index, material] of materials.entries()) {
      const {
        nameMartials,
        status_martials,
        measuring_unit,
        ministry_id,
        entity_id,
        Quantity,
        sub_class,
        main_class,
        user_id,
        typMartials,
        description,
        purchaseDate,
      } = material;
      const trimmedFields = {
        trimmedNameMartials: nameMartials?.trim() || "",
        trimmedStatusMartials: status_martials?.trim() || "",
        trimmedMeasuringUnit: measuring_unit?.trim() || "",
        trimmedSubClass: sub_class?.trim(),
        trimmedMainClass: main_class?.trim(),
        trimmedTypMartials: typMartials?.trim() || "",
        trimmedDescription: description?.trim() || "",
        trimQuantity: Quantity?.trim(),
      };
      const {
        trimmedNameMartials,
        trimmedStatusMartials,
        trimmedMeasuringUnit,
        trimmedSubClass,
        trimmedMainClass,
        trimmedTypMartials,
        trimmedDescription,
        trimQuantity,
      } = trimmedFields;

      if (
        !trimmedNameMartials ||
        !trimmedStatusMartials ||
        !trimmedMeasuringUnit ||
        !trimQuantity ||
        !trimmedSubClass ||
        !trimmedMainClass
      ) {
        logger.error("Missing required fields.", { material });
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Fetch existing data from the database
      const [rowsMainClass] = await connection.execute(
        `SELECT * FROM main_class`
      );
      const [rowsSubClass] = await connection.execute(
        `SELECT * FROM sub_class_for_main_class`
      );
      const [rowsMeasuringUnit] = await connection.execute(
        `SELECT * FROM measuring_unit`
      );
      const [rowsStateMaterial] = await connection.execute(
        `SELECT * FROM state_martial`
      );

      logger.info("Fetched reference data for validation.");

      const mainClassMatch = rowsMainClass.find(
        (mc) => mc.main_Class_name === trimmedMainClass
      );
      const subClassMatch = rowsSubClass.find(
        (sc) => sc.sub_class_name === trimmedSubClass
      );
      const unitMatch = rowsMeasuringUnit.find(
        (um) => um.measuring_unit === trimmedMeasuringUnit
      );
      const stateMaterialMatch = rowsStateMaterial.find(
        (um) => um.state_name === trimmedStatusMartials
      );

      if (!mainClassMatch || !subClassMatch || !unitMatch) {
        logger.error("Invalid main class, sub class, or unit.", {
          trimmedMainClass,
          trimmedSubClass,
          trimmedMeasuringUnit,
        });
        return res
          .status(400)
          .json({ message: "Invalid main class, sub class, or unit" });
      }

      const getDataMaterialObsolete = `
        SELECT * 
        FROM stagnant_materials 
        WHERE subClass_id = ? AND mainClass_id = ? AND Entities_id = ? AND name_material = ?
      `;
      const [rowMaterial] = await connection.execute(getDataMaterialObsolete, [
        subClassMatch.subClass_id,
        mainClassMatch.mainClass_id,
        entity_id,
        trimmedNameMartials,
      ]);

      if (rowMaterial.length > 0) {
        logger.info("Material already exists in the system.", {
          nameMartials: trimmedNameMartials,
        });
        existingMaterials.push(
          `المادة ${trimmedNameMartials} موجودة بالفعل في النظام. يرجى التحقق من البيانات المدخلة`
        );
        continue; // Skip this material and move to the next one
      }

      if (trimQuantity < 0 || !Number.isFinite(Number(trimQuantity))) {
        logger.error("Invalid quantity value.", { Quantity });
        return res.status(400).json({ message: "Invalid quantity value" });
      }

      const Date = formatDate(purchaseDate);
      const insertQuery = `
        INSERT INTO stagnant_materials 
          (state_matrial_id, name_material, Entities_id, ministry_id, Quantity, user_id, mainClass_id, subClass_id , measuring_unit_id, typ_material, description, puchase_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const [response] = await connection.execute(insertQuery, [
        stateMaterialMatch.id,
        trimmedNameMartials,
        entity_id,
        ministry_id,
        trimQuantity,
        user_id,
        mainClassMatch.mainClass_id,
        subClassMatch.subClass_id,
        unitMatch.unit_id,
        trimmedTypMartials,
        trimmedDescription,
        Date,
      ]);

      if (response.affectedRows > 0) {
        const insertId = response.insertId;

        // Handle file association
        if (req.files[index]) {
          const insertFileQuery = `
            INSERT INTO files (file_name, insert_id, type_file) 
            VALUES (?, ?, ?)
          `;
          await connection.execute(insertFileQuery, [
            req.files[index].filename,
            insertId,
            "مادة راكدة",
          ]);
        }

        // Fetch user information for logging
        const [userInformation] = await connection.execute(getInformation, [
          user_id,
        ]);
        const data = userInformation[0];
        const logInfo = `تم إدراج هذا المنتج ${trimmedNameMartials} من قبل المستخدم ${data.user_name}، والكمية التي تم إدراجها هي ${Quantity}`;
        // Insert log entry
        createLogEntry(connection, 1, user_id, entity_id, logInfo);
        // Fetch users for notification
        const getDataUsersQuery = `
          SELECT 
            um.id AS user_id, um.*, 
            r.id AS role_id, r.*
          FROM users_management um
          LEFT JOIN roles r ON um.group_id = r.id
          WHERE um.entities_id = ? AND r.id = '2'
        `;
        const [userData] = await connection.execute(getDataUsersQuery, [
          entity_id,
        ]);
        // Fetch authenticated user details
        const [userAuthData] = await connection.execute(getUserByIdQuery2, [
          user_Auth,
        ]);
        const user = userData[0];
        const userAuth = userAuthData[0];
        // Insert notification
        await insertNotification(
          userAuth.user_id,
          "طلب موافقة",
          "بأنتظار الموافقة على الطلب",
          "info",
          "Obsolete-Material-Approve-Admin",
          user.entities_id,
          response.insertId,
          2
        );

        // Trigger Pusher event
        const eventData = {
          name: "send_request_material",
          message: `تم إدراج مادة من خلال ${userAuth.user_name} التابع ${userAuth.Entities_name} بأنتظار الموافقة على الطلب`,
          user_id: user.user_id,
          category_id:2
        };
        pusher.trigger("poll", "vote", eventData);
      }
    }
    await connection.commit();
    logger.info("Transaction committed successfully.");
    res.status(201).json({
      message: "Materials added successfully",
      existingMaterials, // Send messages about existing materials
    });
  } catch (error) {
    logger.error("Error occurred during materials registration.", { error });
    await connection.rollback();
    res.status(500).json({ message: "حدث خطء بالخادم" });
  } finally {
    connection.release();
    logger.info("Database connection released.");
  }
};
module.exports = {
  stagnantMaterialsRegister,
  getDataStagnantMaterials,
  stagnantMaterialsEdit,
  deleteById,
  getAllDataStagnantMaterials,
  getDataStagnantMaterialAllByMainClassId,
  getDataStagnantMaterialAllByAndStagnantId,
  getDataStagnantMaterialsPa,
  getDataStagnantMaterialsSearch,
  getDataStagnantMaterialAllByMainClassIdCurrentMonth,
  getDataStagnantMaterialsApproveAdmin,
  getDataStagnantMaterialsApproveSuperAdminRoot,
  ApproveAdminMaterial,
  ApproveSuperAdminMaterial,
  getDataStagnantMaterialsByUserId,
  stagnantMaterialsRegisterAsForLoop,
};
