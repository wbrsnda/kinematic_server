const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const sportStatSchema = new Schema({
  statId: {
    type: Types.ObjectId, // 可以手动指定，也可以使用默认 _id
    default: () => new Types.ObjectId(),
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
  totalCount: {
    type: Number,
    default: 0,
  },
  totalDuration: {
    type: Number,
    default: 0, // 总时长（秒）
  },
  totalCalories: {
    type: Number,
    default: 0,
  },
  bestCount: {
    type: Number,
    default: 0, // 单次最佳个数
  },
  workoutCount: {
    type: Number,
    default: 0, // 锻炼次数
  },
  lastWorkout: {
    type: Date, // 最后一次锻炼时间
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("SportStat", sportStatSchema);
