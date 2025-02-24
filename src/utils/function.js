const moment = require("moment");
const { connect } = require("../config/db");
const formatDate = (Data) => {
  const date = new Date(Data);
  return moment(date).format("YYYY-MM-DD ");
};
// async function handleEvent(userId, response) {
//   try {
//     const eventHandle = new Event({
//       userId: userId,
//       productId: response._id,
//       projectId: response.projectId,
//       departmentId: response.departmentID,
//       actions: "edit",
//     });

//     const saveData = await eventHandle.save();

//     if (saveData) {
//       const finDataUser = await User.findById(userId);
//       const eventData = {
//         message: `The user ${finDataUser.name} has to request modification`,
//         departmentId: response.departmentID,
//       };

//       pusher.trigger("poll", "vote", eventData);

//       return {
//         status: 200,
//         message: "Product send request successfully",
//         response,
//       };
//     }
//   } catch (error) {
//     return {
//       status: 500,
//       message: "An error occurred while processing the request",
//       error: error.message,
//     };
//   }
// }

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const editQuantity = async (connection, id, relation = "+") => {
  try {
    // Query to get booking and associated material data
    const getDataBookQuery = `
      SELECT 
        stagnant_materials.stagnant_id AS material_id,
        stagnant_materials.name_material,
        stagnant_materials.Quantity,
        booking_materials.quantity AS booked_quantity
      FROM booking_materials
      JOIN stagnant_materials ON booking_materials.material_id = stagnant_materials.stagnant_id
      WHERE booking_materials.id = ?
    `;
    const [rows] = await connection.execute(getDataBookQuery, [id]);

    if (rows.length === 0) {
      throw new Error("Booking not found");
    }

    const data = rows[0];
    const { material_id, Quantity, booked_quantity } = data;

    // Calculate the new quantity based on the relation
    let totalQuantity;
    if (relation === "+") {
      totalQuantity = Quantity + booked_quantity;
    } else if (relation === "-") {
      totalQuantity = Quantity - booked_quantity;
    } else {
      throw new Error("Invalid relation operator");
    }

    // Ensure totalQuantity is not negative
    if (totalQuantity < 0) {
      throw new Error("Insufficient stock quantity");
    }

    // Update the stagnant material's quantity
    const updateQuery = `
      UPDATE stagnant_materials 
      SET Quantity = ?
      WHERE stagnant_id = ?
    `;
    await connection.execute(updateQuery, [totalQuantity, material_id]);
  } catch (error) {
    console.error("Error editing quantity:", error);
    throw error; // Rethrow error to be handled by the caller
  }
};



const formatDateNew = (date) => {
  const options = { year: "numeric", month: "2-digit", day: "2-digit" };
  return new Date(date).toLocaleDateString("ar-EG", options);
};

const formatDateArabic = (date) => {
  if (!date) return null; // Handle null values
  return new Date(date).toLocaleDateString("ar-EG");
};
const formatDateE = (date) => {
  if (!date) return null; // Handle null values
  return new Date(date).toISOString().slice(0, 19).replace("T", " ");
};
module.exports = {
  formatDate,
  editQuantity,
  formatDateNew,
  formatDateE,
  formatDateArabic,
};
