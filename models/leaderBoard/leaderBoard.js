const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const rankingSchema = new Schema({
  userId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
  username: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
    trim: true,
  },
  score: {
    type: Number,
    required: true,
  },
  rank: {
    type: Number,
    required: true,
  },
}, { _id: false }); // 嵌套文档不需要单独 _id

const leaderboardSchema = new Schema({
  leaderboardId: {
    type: Types.ObjectId,
    default: () => new Types.ObjectId(),
  },
  sportType: {
    type: String,
    enum: ['rope_skipping', 'jumping_jacks', 'push_ups', 'sit_ups', 'squats'],
    required: true,
  },
  metricType: {
    type: String,
    enum: ['total_count', 'total_duration', 'best_count', 'total_calories'],
    required: true,
  },
  rankings: {
    type: [rankingSchema],
    default: [],
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Leaderboard", leaderboardSchema);
