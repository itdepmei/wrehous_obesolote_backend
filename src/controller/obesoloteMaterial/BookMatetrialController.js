const { editQuantity } = require("../../utils/function");
const pusher = require("../../utils/pusherINfo");
const {
 
  getUserByIdQuery2,
  getDataUsersQuery,
} = require("../../query/userMangeController-db");
const { insertNotification } = require("../../utils/createNotifction");
const moment = require("moment");
const { getDataBookQuery } = require("../../query/bookedQuery");
const createLogEntry = require("../../utils/createLog");
const path = require("path");
const ProcessorFile = require("../../utils/DeleteFile");
const { connect, mainCoection } = require("../../Config/db");
const bookRegister = async (req, res) => {
  const {
    material_id,
    entities_id,
    entities_id_buy,
    Quantity,
    approveSendRequestUploadBook,
    approveSendRequest,
  } = req.body;
  // console.log( "dsfDS",req.body);

  const user_Auth = req.user._id;
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    const approveSendRequestUploadBookBoolean =
      approveSendRequestUploadBook === "true";
    const approveSendRequestBoolean = approveSendRequest === "true";
    // Check if a booking already exists for the given material and entity
    const [existingBookings] = await connection.execute(
      `SELECT * FROM booking_materials WHERE entity_Buy_id = ? AND material_id = ?`,
      [entities_id_buy, material_id]
    );
    if (existingBookings.length > 0) {
      return res.status(409).json({ message: "تم الحجز مسبقا" });
    }

    // Prepare the query for inserting a new booking
    const baseInsertQuery = `
    INSERT INTO booking_materials 
    (user_id, material_id, entity_id, entity_Buy_id, quantity`;

    const insertParams = [
      user_Auth,
      material_id,
      entities_id,
      entities_id_buy,
      Quantity,
    ];

    let insertBookingQuery;

    if (approveSendRequestBoolean && approveSendRequestUploadBookBoolean) {
      insertBookingQuery = `${baseInsertQuery}, approved_admin_send_request_book, approved_admin_to_upload_booked) 
    VALUES (?, ?, ?, ?, ?, ?, ?);`;
      insertParams.push(true, true);
    } else {
      insertBookingQuery = `${baseInsertQuery}, approved_admin_send_request_book, approved_admin_to_upload_booked) 
    VALUES (?, ?, ?, ?, ?, ?, ?);`;
      insertParams.push(false, false);
    }

    // Insert new booking
    const [insertResult] = await connection.execute(
      insertBookingQuery,
      insertParams
    );

    if (insertResult.affectedRows === 0) {
      return res.status(500).json({ message: "Failed to register booking" });
    }

    // Fetch user information for logging and event triggering
    const [userData] = await connection.execute(getDataUsersQuery, [
      entities_id_buy,
    ]);
    const [userAuthData] = await connection.execute(getUserByIdQuery2, [
      user_Auth,
    ]);
    // console.log(userData,userAuthData);

    if (userAuthData.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = userData[0];
    const userAuth = userAuthData[0];
    const message = `${userAuth.user_name} طلب الموافقة على طلب حجز مادة`;
    // Trigger notification and Pusher event based on approval status
    const notificationUrl =
      approveSendRequestBoolean && approveSendRequestUploadBookBoolean
        ? "Approval-reservations"
        : "approve-Admin-To-send-Request-Booking";
    const entityForNotification =
      approveSendRequestBoolean && approveSendRequestUploadBookBoolean
        ? entities_id
        : entities_id_buy;
    const eventData = {
      name: "send_request_book",
      message: `تم إرسال طلب حجز من قبل ${userAuth.user_name} من ${userAuth.Entities_name}`,
      entity_id: approveSendRequestBoolean ? entityForNotification : null,
      user_id: approveSendRequestBoolean ? null : user.user_id,
      category_id: 2,
    };
    // Insert notification
    await insertNotification(
      userAuth.user_id,
      "طلب حجز مادة",
      message,
      "info",
      notificationUrl,
      entityForNotification,
      null,
      2
    );
    // Trigger Pusher event
    await pusher.trigger("poll", "vote", eventData);
    return res.status(201).json({
      message: "تم الحجز بنجاح",
      dataId: insertResult.insertId,
      category_id: 2,
    });
  } catch (error) {
    console.error("Internal server error:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    connection.release();
  }
};
const UploadBookForEntityBuy = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  const file_name = req.file ? req.file.filename : null;
  const user_Auth = req.user._id;
  const { BookId } = req.body;

  try {
    if (!BookId) {
      return res.status(400).json({ message: "ID not provided" });
    }

    // Fetch booking record by ID
    const queryGetData = "SELECT * FROM booking_materials WHERE id = ?";
    const [getDataBooked] = await connection.execute(queryGetData, [BookId]);
    const dataBooked = getDataBooked[0];

    if (!dataBooked) {
      return res.status(404).json({ message: "Booking record not found" });
    }

    // If a file already exists, delete it
    if (dataBooked.file_name) {
      // console.log(dataBooked.file_name);
      const filePath = path.join("src/upload_Data/", dataBooked.file_name);
      await ProcessorFile(filePath);
    }

    // Update the file name in the database
    const updateQuery = `UPDATE booking_materials SET file_name = ? WHERE id = ?`;
    const [updateResponse] = await connection.execute(updateQuery, [
      file_name,
      BookId,
    ]);

    if (updateResponse.affectedRows === 0) {
      await connection.rollback();
      return res
        .status(500)
        .json({ message: "Error occurred while updating the booking record" });
    }

    // Fetch user details
    const [userAuthData] = await connection.execute(getUserByIdQuery2, [
      user_Auth,
    ]);
    const userAuth = userAuthData[0];

    if (!userAuth) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    // Log the action
    const text = `Official document uploaded by ${userAuth.user_name} from ${userAuth.Entities_name}`;
    await createLogEntry(
      connection,
      8,
      userAuth.user_id,
      userAuth.entity_id,
      text,
      1
    );
    // Send notification
    const notificationMessage = `${userAuth.user_name} from ${userAuth.Entities_name} has uploaded an official document`;
    await insertNotification(
      userAuth.user_id,
      "Document Uploaded",
      notificationMessage,
      "info",
      "BookObsoleteMaterial",
      dataBooked.entity_id,
      null,
      2
    );
    // Trigger Pusher event
    const eventData = {
      name: "send_official_document",
      message: `Official document uploaded by ${userAuth.user_name} from ${userAuth.Entities_name}`,
      entity_id: dataBooked.entity_id,
      category_id: 2,
    };
    pusher.trigger("poll", "vote", eventData);

    await connection.commit();
    res.status(200).json({ message: "Document uploaded successfully" });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const getDataBook = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const totalCountQuery = `
    SELECT COUNT(*) AS count 
    FROM booking_materials 
    WHERE booking_materials.entity_id = ? AND booking_materials.booked=true `;
    const [totalRows] = await connection.execute(totalCountQuery, [
      req.query.entity_id,
    ]);
    const totalItems = totalRows[0].count;
    const totalPages = Math.ceil(totalItems / limit);
    const getDataBookingMQuery = `
      SELECT 
        stagnant_materials.name_material,
        stagnant_materials.Quantity,
        users_management.user_name,
        users_management.phone_number,
        entities.Entities_name,
        ministries.ministries,
         ministries.id AS ministry_id,
        booking_materials.id AS book_id,
        booking_materials.quantity,
        booking_materials.entity_Buy_id,
        booking_materials.material_id,
        booking_materials.contacted,
        booking_materials.expiration_date,
        booking_materials.created_book_at,
        booking_materials.file_name
      FROM booking_materials 
     LEFT JOIN stagnant_materials ON booking_materials.material_id = stagnant_materials.stagnant_id 
     LEFT JOIN users_management ON booking_materials.user_id = users_management.id 
     LEFT JOIN ministries	 ON users_management.ministres_id  = ministries.id 
     LEFT JOIN entities ON booking_materials.entity_Buy_id = entities.id
     WHERE booking_materials.entity_id = ? AND booking_materials.booked=true AND booking_materials.approved_admin_send_request_book = true 
     ORDER BY booking_materials.id DESC
     LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await connection.execute(getDataBookingMQuery, [
      req.query.entity_id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No booking materials found" });
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
    console.log(error);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};
const getDataBookByEntityIdSendBooking = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const totalCountQuery = `
    SELECT COUNT(*) AS count 
    FROM booking_materials 
    WHERE booking_materials.entity_Buy_id = ? `;
    const [totalRows] = await connection.execute(totalCountQuery, [
      req.query.entity_id,
    ]);
    const totalItems = totalRows[0].count;
    const totalPages = Math.ceil(totalItems / limit);
    const getDataBookingMQuery = `
      SELECT 
        stagnant_materials.name_material,
        stagnant_materials.Quantity,
        users_management.user_name,
        users_management.phone_number,
        entities.Entities_name,
        ministries.ministries,
         ministries.id AS ministry_id,
        booking_materials.id AS book_id,
        booking_materials.*
      FROM booking_materials 
     LEFT JOIN stagnant_materials ON booking_materials.material_id = stagnant_materials.stagnant_id 
     LEFT JOIN users_management ON booking_materials.user_id = users_management.id 
     LEFT JOIN ministries	 ON users_management.ministres_id  = ministries.id 
     LEFT JOIN entities ON booking_materials.entity_Buy_id = entities.id
      WHERE booking_materials.entity_Buy_id = ? 
      ORDER BY booking_materials.id DESC
        LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await connection.execute(getDataBookingMQuery, [
      req.query.entity_id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No booking materials found" });
    }
    // console.log(rows);
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
    console.log(error);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};
const getDataBookByEntityId = async (req, res) => {
  // Validate the query parameters
  const { entities_id, stagnant_id } = req.query;
  if (!entities_id || !stagnant_id) {
    return res.status(400).json({ message: "Missing required parameters" });
  }
  let connection;
  try {
    const pool = await connect(); // Assuming 'connect' establishes a DB connection
    connection = await pool.getConnection();
    // Log the request query for debugging purposes
    // Correct the SQL query
    const getDataBookQuery = `
      SELECT 
        stagnant_materials.name_material,
        users_management.user_name,
        users_management.phone_number,
        entities.Entities_name,
        ministries.ministries,
         booking_materials.*,
        booking_materials.id AS book_id
      FROM booking_materials
      LEFT JOIN stagnant_materials ON booking_materials.material_id = stagnant_materials.stagnant_id
      LEFT JOIN users_management ON booking_materials.user_id = users_management.id
      LEFT JOIN ministries ON users_management.ministres_id = ministries.id
      LEFT JOIN entities ON booking_materials.entity_Buy_id = entities.id
      WHERE booking_materials.entity_Buy_id = ? 
        AND booking_materials.material_id = ? 
       `;
    // Execute the query with provided query parameters
    const [rows] = await connection.execute(getDataBookQuery, [
      entities_id,
      stagnant_id,
    ]);
    // Check if any records were found
    if (rows.length === 0) {
      return res.status(404).json({ message: "لم يتم الحجز" }); // "Not booked" in Arabic
    }
    // Send all found records, not just the first one
    res.status(200).json({ response: rows[0] });
  } catch (error) {
    console.error("Error fetching booking data:", error);
    res.status(500).json({
      message: "An error occurred while fetching booking data",
      error: error.message,
    });
  } finally {
    if (connection) connection.release(); // Ensure the connection is always released
  }
};
const getDataBookedFalse = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    const getDataBookingMQuery = `
      SELECT 
        stagnant_materials.name_material,
        stagnant_materials.Quantity,
        users_management.user_name,
        users_management.phone_number,
        entities.Entities_name,
        ministries.ministries,
         ministries.id AS ministry_id,
         booking_materials.*,
        booking_materials.id AS book_id
      FROM booking_materials 
     LEFT JOIN stagnant_materials ON booking_materials.material_id = stagnant_materials.stagnant_id 
     LEFT JOIN users_management ON booking_materials.user_id = users_management.id 
     LEFT JOIN ministries	 ON users_management.ministres_id  = ministries.id 
     LEFT JOIN entities ON booking_materials.entity_Buy_id = entities.id
      WHERE booking_materials.entity_id = ? AND  booking_materials.booked = false
      ORDER BY booking_materials.id ASC
    `;
    const [rows] = await connection.execute(getDataBookingMQuery, [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No booking materials found" });
    }
    res.status(200).json({ response: rows });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};
const deleteBookById = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: "Invalid ID parameter" });
  }
  try {
    console.log(`Deleting booking with ID: ${id}`);
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await editQuantity(connection, id, "+");
      // Delete the booking record
      const [bookedMaterialRows] = await connection.execute(getDataBookQuery, [
        id,
      ]);
      const bookedMaterial = bookedMaterialRows[0];
      if (!bookedMaterial) {
        await connection.rollback();
        return res.status(404).json({ message: "Booking not found" });
      }
      const message = `تم ألغاء الطلب `;
      await insertNotification(
        req.user._id,
        "ألغاء الطلب",
        message,
        "delete",
        `Product-Overview/${bookedMaterial.material_id}`,
        req.user.entity_id,
        null,
        2
      );
      // Trigger Pusher event
      const eventData = {
        name: "delete_request_material",
        message: `تم ألغاء حجز المادة `,
        user_id: bookedMaterial.user_id,
        category_id: 2,
      };
      pusher.trigger("poll", "vote", eventData);
      const deleteBookingQuery = "DELETE FROM booking_materials WHERE id = ?";
      const [response] = await connection.execute(deleteBookingQuery, [id]);
      // Commit transaction after successful operations
      await connection.commit();
      if (response.affectedRows > 0) {
        return res.status(200).json({ message: "تم الحذف بنجاح" });
      } else {
        return res.status(404).json({ message: "Booking not found" });
      }
    } catch (err) {
      // Rollback transaction in case of error
      await connection.rollback();
      console.error("Error executing queries:", err);
      res.status(500).json({ message: "Database query error" });
    } finally {
      connection.release(); // Always release the connection
    }
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const cancelRequest = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "Invalid or missing ID parameter" });
  }
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      // Check if there's a request_denied entry for the given booking ID
      const getDataMessageQuery =
        "SELECT * FROM request_denied WHERE book_id = ?";
      const [rows] = await connection.execute(getDataMessageQuery, [id]);
      // Fetch booking details
      const getDataQuery = "SELECT * FROM booking_materials WHERE id = ?";
      const [rowBooked] = await connection.execute(getDataQuery, [id]);
      const dataBooked = rowBooked[0];

      if (rows.length > 0) {
        // Delete from request_denied table if entry exists
        const deleteMessageQuery =
          "DELETE FROM request_denied WHERE book_id = ?";
        await connection.execute(deleteMessageQuery, [id]);
      }
      if (dataBooked && dataBooked?.file_name) {
        const filePath = path.join("src/upload_Data/", dataBooked?.file_name);
        await ProcessorFile(filePath);
      }
      // Delete booking if not booked
      const deleteBookingQuery =
        "DELETE FROM booking_materials WHERE id = ? AND booked = false";
      const [response] = await connection.execute(deleteBookingQuery, [id]);
      if (response.affectedRows > 0) {
        await connection.commit();
        return res.status(200).json({ message: "تم الحذف بنجاح" });
      } else {
        await connection.rollback();
        return res
          .status(404)
          .json({ message: "Booking not found or already booked" });
      }
    } catch (err) {
      await connection.rollback();
      console.error("Error executing queries:", err);
      return res
        .status(500)
        .json({ message: "Database query error", error: err.message });
    } finally {
      connection.release(); // Ensure connection is released in all cases
    }
  } catch (error) {
    console.error("Error deleting booking:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const bookEdit = async (req, res) => {
  try {
    const pool = await connect(); // Assuming this function returns a database pool
    const connection = await pool.getConnection(); // Get a connection from the pool
    try {
      // Start transaction
      await connection.beginTransaction();
      // Calculate the quantity difference
      const quantityDifference = Quantity - previousQuantity;
      // Calculate the new stagnant material quantity based on the difference
      const updatedQuantity = originalQuantity - quantityDifference;
      // Ensure updatedQuantity is not negative
      if (updatedQuantity < 0) {
        return res.status(400).json({ message: "Insufficient stock quantity" });
      }
      // Update the stagnant material's quantity
      await editQuantity(connection, id, "+");
      // Update the existing booking record in booking_materials
      // const updateBookingQuery = `
      //   UPDATE booking_materials
      //   SET user_id = ?,
      //       entity_id = ?,
      //       entity_Buy_id = ?,
      //       quantity = ?
      //   WHERE booking_id = ?
      // `;
      // const [response] = await connection.execute(updateBookingQuery, [
      //   user_id,
      //   entities_id,
      //   entities_id_buy,
      //   Quantity,
      //   booking_id, // Use the booking_id to identify which booking to edit
      // ]);
      // Commit transaction after successful operations
      await connection.commit();

      // Respond with success message
      res.status(200).json({ message: "تم تعديل الحجز بنجاح", response });
    } catch (err) {
      // Rollback the transaction in case of an error
      await connection.rollback();
      console.error("Error executing queries:", err);
      res.status(500).json({ message: "Database query error" });
    } finally {
      connection.release(); // Always release the connection
    }
  } catch (error) {
    console.error("Error editing Book:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const stagnantMaterialsEditBooked = async (req, res) => {
  const pool = await connect();
  let connection;
  try {
    connection = await pool.getConnection();
    const file1_name = req.files.file1 ? req.files.file1[0].filename : null; // First file
    const file2_name = req.files.file2 ? req.files.file2[0].filename : null; // Second file (optional) for entity buy material
    const { entity_id, entity_id_buy, material_id, BookId } = req.body;

    // Input validation
    if (!file1_name) {
      return res.status(400).json({ message: "يجب رفع الكتاب المناقلة" });
    }
    if (!material_id) {
      return res.status(400).json({ message: "Invalid material ID" });
    }
    // Begin transaction
    await connection.beginTransaction();
    const user = req?.user;
    if (!user) {
      await connection.rollback();
      return res.status(400).json({ message: "User information is missing" });
    }
    // Fetch material data
    const getDataQuery = `SELECT * FROM stagnant_materials WHERE stagnant_id = ?`;
    const [materialData] = await connection.execute(getDataQuery, [
      material_id,
    ]);
    if (!materialData.length) {
      await connection.rollback();
      return res.status(404).json({ message: "DataMaterial not found" });
    }
    const dataMaterial = materialData[0];
    // Fetch booking data
    const getBookById = `SELECT * FROM booking_materials WHERE id = ?`;
    const [bookings] = await connection.execute(getBookById, [BookId]);
    const booking = bookings[0];
    if (!booking) {
      await connection.rollback();
      return res.status(404).json({ message: "Booking not found" });
    }
    // Insert file for booking check
    const fileBuyEntity = booking.file_name ? booking.file_name : file2_name;
    const insertFileBooked = `
      INSERT INTO booking_file_check (file_check,file_check_buy, material_id)
      VALUES (?,?,?)
    `;
    const [insertFileResult] = await connection.execute(insertFileBooked, [
      file1_name,
      fileBuyEntity,
      BookId,
    ]);
    if (insertFileResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Failed to insert booking file" });
    }
    // Insert booking data
    const insertBookedDataQuery = `
      INSERT INTO booking_data_material (
        state_matrial_id, name_material, Quantity_buy, user_id, 
        mainClass_id, subClass_id, measuring_unit_id, typ_material, 
        description, puchase_date, entity_buy_id, entity_id, 
        obesolote_Material_id, state_booked_id, state_booked_buy,
        booking_file_check_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
    `;
    const [insertBookedDataResult] = await connection.execute(
      insertBookedDataQuery,
      [
        dataMaterial.state_matrial_id,
        dataMaterial.name_material,
        booking.quantity,
        dataMaterial.user_id,
        dataMaterial.mainClass_id,
        dataMaterial.subClass_id,
        dataMaterial.measuring_unit_id,
        dataMaterial.typ_material,
        dataMaterial.description,
        dataMaterial.puchase_date,
        entity_id_buy,
        entity_id,
        dataMaterial.stagnant_id,
        1,
        2,
        insertFileResult.insertId,
      ]
    );
    if (insertBookedDataResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Failed to insert booking data" });
    }
    // Fetch user info for logging
    const getUserInfoQuery = `SELECT * FROM users_management WHERE id = ?`;
    const [userInfoRows] = await connection.execute(getUserInfoQuery, [
      user._id,
    ]);
    const userInfo = userInfoRows[0];
    if (!userInfo) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found" });
    }
    // Fetch entity info for logging
    const getEntityInfoQuery = `SELECT * FROM entities WHERE id = ?`;
    const [entityInfoRows] = await connection.execute(getEntityInfoQuery, [
      booking.entity_Buy_id,
    ]);
    const entityInfo = entityInfoRows[0];

    // Insert log entry
    const logText = `تم شراء المادة ${dataMaterial.name_material} الخاصة بال ${dataMaterial.Entities_name} من قبل ${entityInfo.Entities_name}`;
    createLogEntry(
      connection,
      5,
      userInfo.id,
      userInfo.entities_id,
      logText,
      1
    );
    // Delete the booking
    const deleteBookingQuery = `DELETE FROM booking_materials WHERE id = ?`;
    const [deleteBookingResult] = await connection.execute(deleteBookingQuery, [
      BookId,
    ]);
    if (deleteBookingResult.affectedRows === 0) {
      throw new Error("Failed to delete the booking.");
    }
    // Handle deletion of booking if no other bookings exist for the material
    const getOtherBookingQuery = `
  SELECT * FROM booking_materials 
  WHERE material_id = ? AND id != ?
`;
    const [otherBookings] = await connection.execute(getOtherBookingQuery, [
      material_id,
      BookId,
    ]);
    if (!otherBookings.length && dataMaterial.Quantity === 0) {
      const deleteMaterialQuery = `DELETE FROM stagnant_materials WHERE stagnant_id = ?`;
      const [deleteResult] = await connection.execute(deleteMaterialQuery, [
        material_id,
      ]);

      if (deleteResult.affectedRows === 0) {
        console.log("Failed to delete stagnant material");
      } else {
        console.log("Stagnant material successfully deleted");
      }
    }
    // Commit transaction
    await connection.commit();
    return res.status(200).json({ message: "تم أكمال عملية الشراء" });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Transaction error:", err);
    return res.status(500).json({ message: "Failed to update material" });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
const getDataStagnantMaterialsBookedPa = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    const page = parseInt(req.query.page, 10) || 1; // Default to page 1
    const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 items per page
    const offset = (page - 1) * limit;
    // Total count query
    const [totalRows] = await connection.execute(
      "SELECT COUNT(*) AS count FROM booking_data_material WHERE entity_id = ?",
      [req.query.entities_id]
    );
    const totalItems = totalRows[0].count;
    const totalPages = Math.ceil(totalItems / limit);
    const getDataQuery = `
      SELECT 
       booking_data_material.name_material,
        booking_data_material.id,
        booking_data_material.puchase_date,
        booking_data_material.created_at,
        booking_data_material.Quantity_buy,
        sub_class_for_main_class.sub_class_name,
        main_class.main_Class_name,
        measuring_unit.measuring_unit,
        users_management.phone_number,
        users_management.user_name,
        ministries.ministries,
        entities_from.Entities_name AS entity_name_from,
        entities_buy.Entities_name AS entity_name_buy,
        state_martial.id AS status_id,
        state_martial.state_name
      FROM 
        booking_data_material
      LEFT JOIN 
        sub_class_for_main_class ON booking_data_material.subClass_id = sub_class_for_main_class.subClass_id
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
        state_martial ON booking_data_material.state_matrial_id = state_martial.id
      WHERE 
        booking_data_material.entity_id = ? 
        ORDER BY booking_data_material.id DESC
        LIMIT ${limit}  OFFSET ${offset};
    `;
    const [rows] = await connection.execute(getDataQuery, [
      req.query.entities_id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No data found" });
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
const getDataStagnantMaterialsBookedPByEntityBookedOrBuyTheMaterial = async (
  req,
  res
) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    // Get pagination parameters
    const page = parseInt(req.query.page, 10) || 1; // Default to page 1
    const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 items per page
    const offset = (page - 1) * limit;

    // Total count query
    const [totalRows] = await connection.execute(
      "SELECT COUNT(*) AS count FROM booking_data_material WHERE entity_buy_id = ?",
      [req.query.entities_id]
    );
    const totalItems = totalRows[0].count;
    const totalPages = Math.ceil(totalItems / limit);
    // Data query with pagination
    const getDataQuery = `
      SELECT 
          booking_data_material.name_material,
        booking_data_material.id,
        booking_data_material.puchase_date,
        booking_data_material.created_at,
        booking_data_material.Quantity_buy,
        sub_class_for_main_class.sub_class_name,
        main_class.main_Class_name,
        measuring_unit.measuring_unit,
        users_management.phone_number,
        users_management.user_name,
        ministries.ministries,
        entities_from.Entities_name AS entity_name_from,
        entities_buy.Entities_name AS entity_name_buy,
        state_martial.id AS status_id,
        state_martial.state_name
      FROM 
        booking_data_material
      LEFT JOIN 
        sub_class_for_main_class ON booking_data_material.subClass_id = sub_class_for_main_class.subClass_id
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
        state_martial ON booking_data_material.state_matrial_id = state_martial.id
      WHERE 
        booking_data_material.entity_buy_id = ? 
        ORDER BY booking_data_material.id DESC
      LIMIT ${limit} OFFSET ${offset};
    `;
    const [rows] = await connection.execute(getDataQuery, [
      req.query.entities_id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }
    // console.log("Total records fetched:", result.length);
    // Respond with data and pagination details
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
const ApproveBooked = async (req, res) => {
  let connection; // Acquire a connection from the pool
  const user_id = req.user._id; // Get the user ID from the request
  const { dataId } = req.body;
  console.log("🔹 Connecting to Database...");
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    console.log("🔹 Starting Transaction...");
mainCoection();

    await connection.beginTransaction(); // Start a transaction
    // Update booking status to approved (set `booked` to true)
    const getDataRemoveQuery = "SELECT * FROM remove_book";
    const [rows] = await connection.execute(getDataRemoveQuery);
    const dataDayNumber = rows[0] || 7;
    const expirationDate = moment()
      .add(dataDayNumber.remove_date, "days")
      .format("YYYY-MM-DD HH:mm:ss");
    const approveBookedQuery = `UPDATE booking_materials SET booked = ?,expiration_date=? WHERE id = ?`;
    const [approveResponse] = await connection.execute(approveBookedQuery, [
      true,
      expirationDate,
      dataId,
    ]);
    // Check if any row was affected (i.e., booking was found and updated)
    if (approveResponse.affectedRows > 0) {
      // Fetch the booked material details and its current quantity
      const [bookedMaterialRows] = await connection.execute(getDataBookQuery, [
        dataId,
      ]);
      if (bookedMaterialRows.length > 0) {
        const dataBook = bookedMaterialRows[0];
        const originalQuantity = dataBook.Quantity;
        const material_id = dataBook.stagnant_id;
        const bookedQuantity = dataBook.quantity;
        // Calculate the new quantity after booking approval
        const updatedQuantity = originalQuantity - bookedQuantity;
        // Update the stagnant material's quantity
        const updateQuery = `
          UPDATE stagnant_materials 
          SET Quantity = ?
          WHERE stagnant_id = ?`;
        await connection.execute(updateQuery, [updatedQuantity, material_id]);
        // Fetch the user data to create a log entry
        const [userDataBuy] = await connection.execute(getUserByIdQuery2, [
          dataBook.user_id,
        ]);
        const userInformationForEntityBuy = userDataBuy[0];
        const [userData] = await connection.execute(getUserByIdQuery2, [
          user_id,
        ]);
        if (userData.length > 0) {
          const user = userData[0];
          // Create log entry
          const logText = `تم الموافقة على الطلب من قبل ${user.user_name} التابع الى ${user.Entities_name} لل المستخدم ${userInformationForEntityBuy?.user_name} التابع الى ${userInformationForEntityBuy?.Entities_name}`;
          await createLogEntry(
            connection,
            2,
            user_id,
            user.entity_id,
            logText,
            1
          );
          // Update notification to mark as read
          // Trigger Pusher event
          const message = `تم الموافقة على رفع المادة `;
          await insertNotification(
            userInformationForEntityBuy.user_id,
            "تم الموافقة ",
            message,
            (type = "success"),
            (url = `Product-Overview/${material_id}`),
            userInformationForEntityBuy.entity_id,
            null,
            2
          );
          const eventData = {
            name: "approve_Book",
            message: logText,
            user_id: userInformationForEntityBuy.user_id,
            category_id: 2,
          };
          pusher.trigger("poll", "vote", eventData);
        }
      }
    }

    // Commit the transaction after successful execution
    await connection.commit();
    // Respond with success message
    res.status(200).json({ message: "تم الموافقة على الطلب", approveResponse });
  } catch (error) {
    // Roll back the transaction in case of an error
    if (connection) {
      try {
        console.log("🔹 Rolling back transaction...");
        await connection.rollback();
        console.log("✅ Transaction rolled back successfully!");
      } catch (rollbackError) {
        console.log("❌ Error during rollback:", rollbackError);
      }
    }
    res
      .status(500)
      .json({ message: "Database query error", error: error.message });
  } finally {
    connection.release(); // Always release the connection back to the pool
  }
};
const Contacted = async (req, res) => {
  try {
    const pool = await connect(); // Get a database connection pool
    const connection = await pool.getConnection(); // Acquire a connection from the pool
    const { dataId } = req.body;
    const userId = req.user._id; // Get the user ID from the request
    try {
      await connection.beginTransaction(); // Start a transaction
      // Retrieve booking material data
      const [bookedMaterialRows] = await connection.execute(getDataBookQuery, [
        dataId,
      ]);
      if (bookedMaterialRows.length === 0) {
        throw new Error("Booking material not found");
      }
      const bookingData = bookedMaterialRows[0];
      // Update booking status to approved and set `contacted` to true, with optional expiration date handling
      const approveBookedQuery = `
        UPDATE booking_materials 
        SET contacted = ?, expiration_date = ? 
        WHERE id = ?
      `;
      const expirationDate = null; // Set `expiration_date` to null or adjust as needed
      const [approveResponse] = await connection.execute(approveBookedQuery, [
        true, // Setting `contacted` to true
        expirationDate,
        dataId,
      ]);
      // Retrieve user information by ID for additional processing
      const [userBookingData] = await connection.execute(getUserByIdQuery2, [
        bookingData.user_id,
      ]);
      const userBookingInfo = userBookingData[0] || null;

      if (!userBookingInfo) {
        throw new Error("User data for the booking not found");
      }

      const [userData] = await connection.execute(getUserByIdQuery2, [userId]);
      const currentUser = userData[0] || null;

      if (!currentUser) {
        throw new Error("User information not found");
      }
      const message = `تم الموافقة على رفع المادة `;
      console.log(bookingData);

      await insertNotification(
        currentUser.user_id,
        "تم الموافقة ",
        message,
        (type = "success"),
        (url = `Product-Overview/${bookingData.material_id}`),
        userBookingInfo.entity_id,
        null,
        2
      );
      const eventData = {
        name: "approve_Book",
        message: `تم الوافقة على أرسال كتاب  من قبل ${currentUser.Entities_name}`,
        user_id: userBookingInfo.user_id,
        category_id: 2,
      };
      pusher.trigger("poll", "vote", eventData);
      await connection.commit(); // Commit the transaction
      // Respond with success message
      res.status(200).json({
        message: "تم التواصل بنجاح",
        approveResponse,
      });
    } catch (err) {
      // Roll back the transaction in case of an error
      await connection.rollback();
      console.error("Error during transaction:", err);
      res.status(500).json({
        message: "Database query error",
        error: err.message,
      });
    } finally {
      connection.release(); // Always release the connection back to the pool
    }
  } catch (error) {
    console.error("Error approving booking:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

const approvedAdminSendRequestBook = async (req, res) => {
  try {
    const pool = await connect(); // Get a database connection pool
    const connection = await pool.getConnection(); // Acquire a connection from the pool
    const user_id = req.user._id; // Get the user ID from the request
    const { dataId } = req.body; // Get the booking ID from parameters

    try {
      await connection.beginTransaction(); // Start a transaction

      // Fetch booked material details
      const [bookedMaterialRows] = await connection.execute(getDataBookQuery, [
        dataId,
      ]);
      const bookedMaterial = bookedMaterialRows[0];
      if (!bookedMaterial) {
        await connection.rollback();
        return res.status(404).json({ message: "Booking not found" });
      }

      // Update booking status to approved
      const approveBookedQuery = `
        UPDATE booking_materials 
        SET approved_admin_send_request_book = ?
        WHERE id = ?
      `;
      const [approveResponse] = await connection.execute(approveBookedQuery, [
        true,
        dataId,
      ]);
      if (approveResponse.affectedRows === 0) {
        await connection.rollback();
        return res
          .status(400)
          .json({ message: "Failed to update booking status" });
      }

      // Fetch user and entity data
      const [userDataForRolUser] = await connection.execute(getUserByIdQuery2, [
        bookedMaterial.user_id,
      ]);
      const userRoleUserData = userDataForRolUser[0];
      if (!userRoleUserData) {
        await connection.rollback();
        return res.status(404).json({ message: "User not found" });
      }

      const [userAuth] = await connection.execute(getUserByIdQuery2, [
        req.user._id,
      ]);
      const dataAuth = userAuth[0];
      if (!dataAuth) {
        await connection.rollback();
        return res.status(404).json({ message: "User not found" });
      }

      // Fetch data to send notification to entity
      const [userDataToSendEntity] = await connection.execute(
        getDataUsersQuery,
        [bookedMaterial.entity_id]
      );
      const dataToSendEntity = userDataToSendEntity[0];
      if (!dataToSendEntity) {
        await connection.rollback();
        return res.status(404).json({ message: "Entity not found" });
      }

      // Insert notification
      const message = `${userRoleUserData.user_name}`;
      await insertNotification(
        userRoleUserData.user_id,
        "طلب حجز مادة",
        message,
        "info",
        "Approval-reservations",
        bookedMaterial.entity_id,
        null,
        2
      );

      // Trigger Pusher event
      const eventData = {
        name: "send_request_book_to_admin",
        message: `تم إرسال طلب حجز من قبل ${userRoleUserData.user_name} من ${userRoleUserData.Entities_name}`,
        user_id: dataToSendEntity.user_id,
        category_id: 2,
      };
      // Trigger event using your Pusher client, e.g., pusher.trigger(...)
      // Trigger Pusher event for the entity
      pusher.trigger("poll", "vote", eventData);

      // Construct the message for the user notification
      const messageUser = `${userRoleUserData.user_name} تم الموافقة على أرسال طلب الحجز`;
      // Insert notification for the user
      await insertNotification(
        userRoleUserData.user_id,
        "الموافقة على رفع كتاب",
        messageUser,
        "info",
        `Product-Overview/${bookedMaterial.material_id}`,
        bookedMaterial.entity_Buy_id,
        null,
        2
      );
      // Construct the event data for the user
      const eventDataUser = {
        name: "approve_send_request_book",
        message: `تم الموافقة على أرسال طلب الحجز من ${dataAuth.user_name}`,
        user_id: bookedMaterial.user_id,
        category_id: 2,
      };
      // Trigger Pusher event for the user
      pusher.trigger("poll", "vote", eventDataUser);
      // Commit the transaction
      const text = `تم الموافقة على الطلب  أرسال الحجز ${dataAuth.user_name} التابع الى ${dataAuth.Entities_name}`;
      await createLogEntry(
        connection,
        10, // master_id
        user_id, // user_id
        req.user.entity_id, // entities_id
        text,
        1
      );
      await connection.commit();
      return res.status(200).json({ message: "تم الموافقة بنجاح" });
    } catch (error) {
      await connection.rollback();
      console.error("Error during booking approval:", error);
      return res.status(500).json({ message: "Internal server error" });
    } finally {
      connection.release(); // Ensure connection is released
    }
  } catch (err) {
    console.error("Database connection error:", err);
    return res
      .status(500)
      .json({ message: "Failed to connect to the database" });
  }
};
const approvedAdminToUploadBook = async (req, res) => {
  try {
    const pool = await connect(); // Get a database connection pool
    const connection = await pool.getConnection(); // Acquire a connection from the pool
    const user_id = req?.user?._id; // Safely access user ID4
    const { dataId } = req.body;
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }
    if (!dataId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }
    try {
      await connection.beginTransaction(); // Start a transaction
      const [bookedMaterialRows] = await connection.execute(getDataBookQuery, [
        dataId,
      ]);
      const bookedMaterial = bookedMaterialRows[0];
      if (!bookedMaterial) {
        await connection.rollback();
        return res.status(404).json({ message: "Booking not found" });
      }
      // Update booking status to approved with `approved_admin_upload_book` set to true
      const approveBookedQuery = `
        UPDATE booking_materials 
        SET approved_admin_to_upload_booked = ?
        WHERE id = ?
      `;
      const [approveResponse] = await connection.execute(approveBookedQuery, [
        true, // Setting `approved_admin_upload_book` to true
        dataId,
      ]);
      // check approveResponse
      if (approveResponse.affectedRows === 0) {
        throw new Error("No booking found with the provided ID");
      }
      // Check if any row was updated
      const [userInformation] = await connection.execute(getUserByIdQuery2, [
        bookedMaterial.user_id,
      ]);
      const DataInformation = userInformation[0];
      if (!DataInformation) {
        await connection.rollback();
        return res.status(404).json({ message: "User not found" });
      }
      const [userAuth] = await connection.execute(getUserByIdQuery2, [
        req.user._id,
      ]);
      const dataAuth = userAuth[0];
      if (!dataAuth) {
        await connection.rollback();
        return res.status(404).json({ message: "User not found" });
      }
      const message = `${DataInformation.user_name} تم الموافقة على رفع كتاب المادة`;
      await insertNotification(
        DataInformation.user_id,
        "الموافقة على رفع كتاب",
        message,
        "info",
        `Product-Overview/${bookedMaterial.material_id}`,
        bookedMaterial.entity_Buy_id,
        null,
        2
      );
      // Trigger Pusher event
      const eventData = {
        name: "approve_upload_book",
        message: `تم الموافقة على رفع الكتاب الرسمي لأكمال حجز المادة`,
        user_id: bookedMaterial.user_id,
        category_id: 2,
      };
      pusher.trigger("poll", "vote", eventData);
      const text = `تم الموافقة على رفع كتاب المادة  ${dataAuth.user_name} التابع الى ${dataAuth.Entities_name}`;
      await createLogEntry(
        connection,
        11, // master_id
        user_id, // user_id
        req.user.entity_id, // entities_id
        text,
        1
      );
      await connection.commit(); // Commit the transaction
      // Respond with success message
      res.status(200).json({
        message: "تم الموافق على رفع الكتاب", // "Successfully contacted" in Arabic
        approveResponse,
      });
    } catch (err) {
      await connection.rollback(); // Roll back the transaction in case of an error
      console.error("Error during transaction:", err);
      res.status(500).json({
        message: "Database query error",
        error: err.message,
      });
    } finally {
      connection.release(); // Always release the connection back to the pool
    }
  } catch (error) {
    console.error("Error approving booking:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
const getDataArchiveById = async (req, res) => {
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    console.log("Connection established");
    const getDataQueryById = `
      SELECT 
        booking_data_material.name_material,
        booking_data_material.id,
        booking_data_material.puchase_date,
        booking_data_material.created_at,
        booking_data_material.Quantity_buy,
        booking_data_material.typ_material,
        sub_class_for_main_class.sub_class_name,
        main_class.main_Class_name,
        measuring_unit.measuring_unit,
        users_management.phone_number,
        users_management.user_name,
        users_management.address_id,
        governorate.governorate_name, 
        ministry_from.ministries AS ministry_name_from,
        ministry_buy.ministries AS ministry_name_buy,
        entities_from.Entities_name AS entity_name_from,
        entities_buy.Entities_name AS entity_name_buy,
        state_martial.id AS status_id,
        state_martial.state_name,
        booking_file_check.*,
        booking_file_check.id AS file_check_id,
        GROUP_CONCAT(files.file_name SEPARATOR ',') AS image_files
      FROM 
        booking_data_material
      LEFT JOIN 
        sub_class_for_main_class ON booking_data_material.subClass_id = sub_class_for_main_class.subClass_id
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
        booking_file_check ON booking_data_material.booking_file_check_id = booking_file_check.id
      LEFT JOIN 
        ministries AS ministry_from ON entities_from.ministries_Id = ministry_from.id
      LEFT JOIN 
        ministries AS ministry_buy ON entities_buy.ministries_Id = ministry_buy.id
      LEFT JOIN 
        files ON booking_data_material.obesolote_Material_id = files.insert_id
      LEFT JOIN 
        state_martial ON booking_data_material.state_matrial_id = state_martial.id
      LEFT JOIN 
     governorate ON users_management.address_id = governorate.id
      WHERE 
        booking_data_material.id = ?
      GROUP BY 
        booking_data_material.name_material,
        booking_data_material.id,
        booking_data_material.puchase_date,
        booking_data_material.created_at,
        booking_data_material.Quantity_buy,
        booking_data_material.typ_material,
        sub_class_for_main_class.sub_class_name,
        main_class.main_Class_name,
        measuring_unit.measuring_unit,
        users_management.phone_number,
        users_management.user_name,
        ministry_from.ministries,
        ministry_buy.ministries,
        users_management.address_id,
        governorate.governorate_name, 
        entities_from.Entities_name,
        entities_buy.Entities_name,
        state_martial.id,
        state_martial.state_name,
        booking_file_check.id
    `;

    const [rows] = await connection.execute(getDataQueryById, [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }
    const data = rows[0];
    const { image_files, ...rest } = data;
    const result = {
      ...rest,
      images: image_files
        ? image_files.split(",").map((file_name) => ({ file_name }))
        : [],
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
module.exports = {
  bookRegister,
  getDataBookByEntityId,
  deleteBookById,
  getDataBook,
  bookEdit,
  stagnantMaterialsEditBooked,
  getDataStagnantMaterialsBookedPa,
  ApproveBooked,
  getDataBookedFalse,
  cancelRequest,
  getDataStagnantMaterialsBookedPByEntityBookedOrBuyTheMaterial,
  Contacted,
  getDataArchiveById,
  UploadBookForEntityBuy,
  getDataBookByEntityIdSendBooking,
  approvedAdminSendRequestBook,
  approvedAdminToUploadBook,
};
