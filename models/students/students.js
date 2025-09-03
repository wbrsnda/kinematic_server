const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const studentSchema = new Schema({
  studentId: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    trim: true,
  },
  realname: {
    type: String,
    trim: true,
  },
  grade: {
    type: String,
    trim: true,
  },
  userId: {
    type: Types.ObjectId, // 引用其他集合的用户ID
    ref: "User",          // 如果是引用User集合的话
  },
  createdAt: {
    type: Date,
    default: Date.now, // 默认当前时间
  },
});

module.exports = mongoose.model("Student", studentSchema);
