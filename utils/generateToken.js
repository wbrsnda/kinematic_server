const jwt = require("jsonwebtoken");
const  JWT_SECRET = process.env.JWT_SECRET;

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "3h", // Token 有效期
  });
};

module.exports = generateToken;