const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const sportRecordSchema = new Schema({
  recordId: {
    type: Types.ObjectId, // 可以手动指定，也可以省略使用默认 _id
    default: () => new Types.ObjectId()
  },
  userId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
  sportType: {
    type: String,
    enum: ['rope_skipping', 'jumping_jacks', 'push_ups', 'sit_ups', 'squats'],
    required: true,
  },
  count: {
    type: Number,
    default: 0,
  },
  duration: {
    type: Number,
    required: true, // 秒
  },
  calories: {
    type: Number,
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("SportRecord", sportRecordSchema);
