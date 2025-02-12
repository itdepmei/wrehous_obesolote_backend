const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
dotenv.config();

const createToken = (id, user_type) => {
  return jwt.sign({ id, user_type }, process.env.SECRET_KEY, {
    expiresIn: "3d",
  });
};
module.exports = createToken;
