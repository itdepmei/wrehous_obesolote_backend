const { connect } = require("../Config/db");
const getDataApplicationPermission = async (req, res) => {
  const pool = await connect();
  const connection = await pool.getConnection();
  try {
    const getDataStateNameQuery = "SELECT * FROM application_permission";
    const [rows] = await connection.execute(getDataStateNameQuery);
    if (rows.length === 0) {
      return res.status(404).json({ message: "لاتوجد بيانات حالية" });
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


module.exports = {
    getDataApplicationPermission
};
