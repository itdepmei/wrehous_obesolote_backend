const express = require("express");
const { connect } = require("../../Config/db");
const EntitiesRegister = async (req, res) => {

  try {
    const { ministriesCod, entities } = req.body;
    const Entities_name = entities.trim() || "";
    const ministries_Id = ministriesCod;
    if (!ministries_Id || !Entities_name) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const checkEmailQuery = "SELECT * FROM entities WHERE Entities_name = ?";
      const [existingUsers] = await connection.execute(checkEmailQuery, [
        Entities_name,
      ]);

      if (existingUsers.length > 0) {
        res.status(400).json({ message: "الجهة موجودة مسبقا" });
        return;
      }
      const insertQuery =
        "INSERT INTO entities (ministries_Id,Entities_name) VALUES (?,?)";
      const [response] = await connection.execute(insertQuery, [
        ministries_Id,
        Entities_name,
      ]);
      res.status(201).json({ message: "تم ألاضافة بنجاح", response });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const getDataEntities = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    const getDataEntitiesQuery = `
    SELECT 
      ministries.ministries,
      entities.id AS entities_id, 
      entities.Entities_name,
      entities.ministries_id
    FROM entities
    LEFT JOIN ministries ON entities.ministries_Id = ministries.id;
  `;
    const [rows] = await connection.execute(getDataEntitiesQuery);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No entities found" });
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
const getDataEntitiesById = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    const getDataEntitiesQuery = `
    SELECT 
      entities.id AS entities_id, 
      entities.Entities_name,
    WHERE entities.ministries_id = ?;
  `;
    const [rows] = await connection.execute(getDataEntitiesQuery, [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No entities found" });
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
const editEntities = async (req, res) => {
  const { dataEdit, selectMinistry ,dataId} = req.body;
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const trimmedEdit_data = dataEdit.trim();
      const updateQuery = `UPDATE entities SET Entities_name=?, ministries_id=?  WHERE id=?`;
      const [response] = await connection.execute(updateQuery, [
        trimmedEdit_data,
        selectMinistry,
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
const deleteEntitiesById = async (req, res) => {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    try {
      const DeleteMinistryItem = "DELETE FROM entities WHERE id=?";
      const [response] = await connection.execute(DeleteMinistryItem, [
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
    console.error("Error deleting material:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
module.exports = {
  EntitiesRegister,
  getDataEntities,
  editEntities,
  deleteEntitiesById,
  getDataEntitiesById
};
