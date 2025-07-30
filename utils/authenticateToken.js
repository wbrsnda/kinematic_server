const jwt = require("jsonwebtoken");

const  JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // 获取 Token

  if (!token) {
    return res.status(401).json({ code: 401, message: "未提供 Token" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ code: 403, message: "Token 无效或已过期" });
    }
    req.user = user; // 将用户信息添加到请求对象中
    next();
  });
};

module.exports = authenticateToken;