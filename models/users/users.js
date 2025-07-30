const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 1,
    maxlength: 20,
  },
  realname: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 20,
  },
  password: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
    default: "other",
  },
  faceFeature: {
    type: [Number],
    default: [],
  },
  avatar: {
    type: String, // 修改为字符串类型
    default: "/uploads/default-avatar.png", // 默认头像路径
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 密码加密钩子
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // 只有密码被修改时才加密
  this.password = await bcrypt.hash(this.password, 10); // 加密密码
  next();
});

module.exports = mongoose.model("User", userSchema);