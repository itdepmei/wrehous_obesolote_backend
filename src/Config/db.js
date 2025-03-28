const mysql = require("mysql2/promise");
const { config } = require("dotenv");
const Redis = require("ioredis");
const logger = require("../middleware/Logger");
config();
const requiredEnv = ["HOST", "USER", "DATABASE", "CONNECTIONLIMIT", "REDIS_HOST", "REDIS_PORT"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
const dbConfig = {
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  waitForConnections: true,
  connectionLimit: Number(process.env.CONNECTIONLIMIT) || 10,
  queueLimit: 0,
  acquireTimeout: 10000,
  multipleStatements: false,
};
// Create a connection pool
let pool; // Singleton pool instance
const redis = new Redis({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT }); // Redis instance

async function connect() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    logger.info("✅ MySQL connection pool created.");
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
async function mainConnection() {
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
    logger.error("Error connecting to the database:", error);
    console.log("Error connecting to the database:", error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
async function executeQuery(query, params = [], cacheTTL = 60) {
  const cacheKey = `query:${query}:${JSON.stringify(params)}`;

  // Check for cached result
  const cachedResult = await redis.get(cacheKey);
  if (cachedResult) {
    Logger.info("✅ Returning cached result for query:", cacheKey);
    return JSON.parse(cachedResult); // Parse and return cached result
  }

  let connection;
  try {
    connection = await getConnection();
    const [results] = await connection.execute(query, params);
    // Cache the result
    await redis.set(cacheKey, JSON.stringify(results), 'EX', cacheTTL);
    Logger.info("✅ Cached result for query:", cacheKey);
    return results;
  } catch (error) {
    Logger.error(`❌ Database query error: ${error.message}`, { query, params });
    throw error;
  } finally {
    if (connection) connection.release();
  }
}
async function mainConnection() {
  try {
    const pool = await connect();
    logger.info("✅ Database connection pool initialized.");
    
    const result = await executeQuery("SELECT NOW() AS current_time");
    logger.info("✅ Database test query executed:"+ result);
  } catch (error) {
    logger.error("❌ Error connecting to the database:"+ error);
  }
}

module.exports = { mainConnection, getConnection, connect ,executeQuery };
// Uncomment the following line to run the example when this file is executed
// mainCoection().catch(console.error);