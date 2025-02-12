const {connect} = require("../../Config/db");
const insertInventory = async (data) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const insertQuery = `
      INSERT INTO inventory (
        quantity_incoming_outgoing, expiry_date, purchase_date, user_id,
        entity_id, ministry_id, warehouse_id, price, document_number,
        document_date, beneficiary, document_type, material_id, 
        production_date, state_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [insertResult] = await connection.execute(insertQuery, data);
    if (insertResult.affectedRows === 0) {
      throw new Error("Failed to insert into inventory.");
    }
    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const updateStoreBalance = async (quantity, material_id, document_type) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    let updateQuery;
    let updateValues;
    if (document_type === "مستند صادر") {
      updateQuery = `
        UPDATE store_data 
        SET balance = balance - ? 
        WHERE id = ? AND balance >= ?
      `;
      updateValues = [quantity, material_id, quantity];
    } else {
      updateQuery = `
        UPDATE store_data 
        SET balance = balance + ? 
        WHERE id = ?
      `;
      updateValues = [quantity, material_id];
    }
    const [updateResult] = await connection.execute(updateQuery, updateValues);
    if (updateResult.affectedRows === 0) {
      throw new Error("Balance update failed.");
    }
    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const updateOutgoingBalance = async (connection, quantity, material_id) => {
  const [updateResult] = await connection.execute(
    `UPDATE store_data SET balance = balance - ? WHERE id = ? AND balance >= ?`,
    [quantity, material_id, quantity]
  );
  return updateResult.affectedRows > 0;
};

const updateIncomingBalance = async (connection, quantity, material_id) => {
  const [updateResult] = await connection.execute(
    `UPDATE store_data SET balance = balance + ? WHERE id = ?`,
    [quantity, material_id]
  );
  return updateResult.affectedRows > 0;
};
async function updateMaterialBalance(
  connection,
  material_id,
  typeOption,
  quantity_incoming_outgoing,
  originQuantity
) {
  let quantity;
  let updateQuery;
  let updateValue;

  if (typeOption === "outgoing") {
    if (quantity_incoming_outgoing > originQuantity) {
      quantity = quantity_incoming_outgoing - originQuantity;
      updateQuery = "UPDATE store_data SET balance = balance - ? WHERE id = ?";
      updateValue = quantity;
    } else if (quantity_incoming_outgoing < originQuantity) {
      quantity = originQuantity - quantity_incoming_outgoing;
      updateQuery = "UPDATE store_data SET balance = balance + ? WHERE id = ?";
      updateValue = quantity;
    } else {
      return; // No change in quantity, exit function
    }
  } else {
    // Incoming case
    if (quantity_incoming_outgoing > originQuantity) {
      quantity = quantity_incoming_outgoing - originQuantity;
      updateQuery = "UPDATE store_data SET balance = balance + ? WHERE id = ?";
      updateValue = quantity;
    } else if (quantity_incoming_outgoing < originQuantity) {
      quantity = originQuantity - quantity_incoming_outgoing;
      updateQuery = "UPDATE store_data SET balance = balance - ? WHERE id = ?";
      updateValue = quantity;
    } else {
      return; // No change in quantity, exit function
    }
  }

  try {
    const [rows] = await connection.execute(updateQuery, [
      updateValue,
      material_id,
    ]);
    return rows;
  } catch (error) {
    console.error("Database update error:", error);
    throw error;
  }
}
module.exports = {
  updateIncomingBalance,
  updateOutgoingBalance,
  insertInventory,
  updateStoreBalance,
  updateMaterialBalance
};
