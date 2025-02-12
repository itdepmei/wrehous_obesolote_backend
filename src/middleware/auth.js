const jwt = require("jsonwebtoken");
const Auth = (req, res, next) => {
  const authorizationHeader = req.headers["authorization"]; // Get the authorization header
  // Check if the authorization header is present
  if (!authorizationHeader) {
    return res.status(401).json({
      message: "No token provided",
    });
  }
  // Check if the token starts with 'Bearer '
  const tokenParts = authorizationHeader.split(" ");
  if (tokenParts[0] !== "Bearer" || !tokenParts[1]) {
    return res.status(401).json({
      message: "Invalid token format",
    });
  }
  const token = tokenParts[1]; // Extract the actual token
  // console.log(token);
  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.ACCESSTOKEN);
    // console.log(decoded);
    req.user = decoded; // Attach decoded user information to the request object
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    return res.status(500).json({
      error: "Failed to authenticate token",
    });
  }
};

const verifyToken = (token) => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
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

module.exports = {Auth, verifyToken};
