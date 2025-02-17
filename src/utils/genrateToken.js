 
 const jwt = require("jsonwebtoken");
 const generateToken = (user, secretKey, expiresIn = null) => {
  const payload = {
    _id: user.id,
    entity_id: user.entities_id,
  };
  const options = expiresIn ? { expiresIn } : {}; // Include expiresIn only if it's provided
  return jwt.sign(payload, secretKey, options);
};
  module.exports=generateToken