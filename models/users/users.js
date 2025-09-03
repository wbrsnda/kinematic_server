const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: function() {
      return !this.isGuest; // 游客账号不需要用户名
    },
    unique: true,
    sparse: true, // 允许为null，但如果有值则必须唯一
    trim: true,
    minlength: 1,
    maxlength: 20,
  },
  realname: {
    type: String,
    trim: true,
    minlength: 1,
    maxlength: 20,
  },
  password: {
    type: String,
    required: function() {
      return !this.isGuest; // 游客账号不需要密码
    },
  },
  phoneNumber: {
    type: String,
    maxlength: 11,
    minlength: 11,
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
    type: String,
    default: "/uploads/default-avatar.png",
  },
  isGuest: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// 密码加密钩子（仅对非游客账号有效）
userSchema.pre("save", async function (next) {
  if (this.isGuest || !this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("User", userSchema);