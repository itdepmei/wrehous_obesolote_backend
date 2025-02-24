const jwt = require("jsonwebtoken");
const { connect } = require("../config/db");
const { getUserData, verifyRefreshToken } = require("../model/userModel");
const generateToken = require("../utils/genrateToken");
const refreshTokenHandler = async (req, res) => {
  const { refreshToken } = req.body;
  console.log(req.body,"sdf");
  
  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token is required" });
  }
  let connection;
  try {
    const pool = await connect();
    connection = await pool.getConnection();
    const payload =jwt.verify(refreshToken, process.env.REFRESHTOKEN);
    if (!payload) {
      res.clearCookie("authorization", { path: "/" });
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }
    const user = await getUserData(connection, payload._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const newAccessToken = generateToken(user, process.env.ACCESSTOKEN, "15m");
    if (!newAccessToken) {
      return res
        .status(500)
        .json({ message: "Failed to generate access token" });
    }
    console.log("fljhdfiusdhfkjgdfhkgj");
    
    return res.status(200).json({
      accessToken: `Bearer ${newAccessToken}`,
      message: "Access token refreshed successfully",
    });
  } catch (error) {
    console.error("Error during token refresh:", error);
    return res.status(500).json({
      message: "An unexpected error occurred while refreshing the token",
    });
  } finally {
    if (connection) connection.release();
  }
};



const Auth = (req, res, next) => {
  const authorizationHeader = req.headers["authorization"];
  if (!authorizationHeader) {
    return res.status(401).json({
      message: "No token provided",
    });
  }
  const tokenParts = authorizationHeader.split(" ");
  if (tokenParts[0] !== "Bearer" || !tokenParts[1]) {
    return res.status(401).json({
      message: "Invalid token format",
    });
  }
  const token = tokenParts[1];
  try {
    const decoded = jwt.verify(token, process.env.ACCESSTOKEN);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Access token has expired",
        expired: true,
      });
    }
    return res.status(401).json({
      message: "Invalid token",
      error: err.message,
    });
  }
};
const verifyToken = (token, KEY) => {
  try {
    const payload = jwt.verify(token, KEY);
    return payload;
  } catch (tokenError) {
    try {
      const payload = jwt.decode(token);
      return payload;
    } catch (decodeError) {
      throw new Error("Invalid token format");
    }
  }
};
module.exports = { Auth, refreshTokenHandler, verifyToken };
