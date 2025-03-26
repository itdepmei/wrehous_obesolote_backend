const mysql = require("mysql2/promise");
const { config } = require("dotenv");
const Redis = require("ioredis");
const Logger = require("../middleware/Logger");
config(); // Load environment variables
// Validate required environment variables
const requiredEnv = ["HOST", "USER", "DATABASE", "CONNECTIONLIMIT", "REDIS_HOST", "REDIS_PORT"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
// Database configuration
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

let pool; // Singleton pool instance
const redis = new Redis({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT }); // Redis instance

async function connect() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    logger.info("✅ MySQL connection pool created.");
  }
  return pool;
}

async function getConnection() {
  try {
    const pool = await connect();
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    logger.error("❌ Error getting database connection:", error);
    throw new Error("Database connection failed");
  }
}
async function connect() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}
/**
 * Execute a query with caching
 * @param {string} query - The SQL query to execute
 * @param {Array} params - The parameters for the SQL query
 * @param {number} cacheTTL - Time to live for cache in seconds
 */
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
/**
 * Main test function
 */
async function mainConnection() {
  try {
    const pool = await connect();
    Logger.info("✅ Database connection pool initialized.");
    
    const result = await executeQuery("SELECT NOW() AS current_time");
    Logger.info("✅ Database test query executed:", result);
  } catch (error) {
    Logger.error("❌ Error connecting to the database:", error);
  }
}

module.exports = { mainConnection, getConnection, executeQuery ,connect };

// Uncomment the following line to run the test when this file is executed
// mainConnection().catch(console.error);
