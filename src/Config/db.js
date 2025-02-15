const mysql = require("mysql2/promise");
const { config } = require("dotenv");
const Logger = require("../middleware/Logger");
config();
const dbConfig = {
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  connectionLimit: Number(process.env.CONNECTIONLIMIT), // Convert to number
  waitForConnections: true,
  // connectionLimit: 10,
  // queueLimit: 0
};
// Create a connection pool
let pool;
async function connect() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}
// Function to get a connection from the pool
async function getConnection() {
  const pool = await connect();
  const connection = await pool.getConnection();
  return connection;
}
// Usage example
async function mainCoection() {
  let connection;
  try {
    const pool = await connect();
    console.log("Database connection pool created.");
    connection = await getConnection();
    console.log("Database connection obtained from pool.");
    // Perform database operations
    const [rows] = await connection.query("SELECT 1");
    console.log(rows);
  } catch (error) {
    Logger.error("Error connecting to the database:", error);
    console.log("Error connecting to the database:", error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
module.exports = { mainCoection, getConnection, connect };
// Uncomment the following line to run the example when this file is executed
// mainCoection().catch(console.error);
