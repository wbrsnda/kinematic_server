const express = require("express");
const router = express.Router();
const authenticateToken = require("../../utils/authenticateToken"); // JWT 中间件
const SportRecord = require("../../models/sportRecod/sportRecord");
const SportStat = require("../../models/sportStatus/sportStatus");
const Leaderboard = require("../../models/leaderBoard/leaderBoard");
const User = require("../../models/users/users");

const mongoose = require("mongoose");

// 导入运动类型配置
const SPORT_TYPES = require("../../utils/sportTypes"); 
// 定义排行榜指标映射
const METRIC_MAP = {
  total_count: 'totalCount',
  total_duration: 'totalDuration',
  best_count: 'bestCount',
  total_calories: 'totalCalories',
};

// 更新单个排行榜
async function updateSingleLeaderboard(sportType, metricType) {
  const sortField = METRIC_MAP[metricType];
  if (!sortField) throw new Error(`未知排行榜指标: ${metricType}`);

  // 获取该运动类型的排名前100用户统计
  const topStats = await SportStat.find({ sportType })
    .sort({ [sortField]: -1 })
    .limit(100)
    .populate("userId");

  // 构建排名数据
  const rankings = topStats.map((stat, index) => ({
    userId: stat.userId._id,
    username: stat.userId.username,
    avatar: stat.userId.avatar,
    score: stat[sortField],
    rank: index + 1,
  }));

  // 保存排行榜
  await Leaderboard.findOneAndUpdate(
    { sportType, metricType },
    { rankings, updatedAt: new Date() },
    { upsert: true, new: true }
  );
}

// 更新某运动类型所有指标排行榜
async function updateSportLeaderboards(sportType) {
  const metrics = Object.keys(METRIC_MAP);
  for (const metric of metrics) {
    await updateSingleLeaderboard(sportType, metric);
  }
}

// // 更新排行榜函数
// async function updateSportLeaderboards(sportType) {
//   const stats = await SportStat.find({ sportType }).populate("userId").sort({ totalCount: -1 }).limit(10);

//   const rankings = stats.map((stat, index) => ({
//     userId: stat.userId._id,
//     username: stat.userId.username,
//     avatar: stat.userId.avatar,
//     score: stat.totalCount,
//     rank: index + 1,
//   }));

//   await Leaderboard.findOneAndUpdate(
//     { sportType, metricType: "total_count" },
//     { rankings, updatedAt: new Date() },
//     { upsert: true }
//   );
// }

// 添加运动记录接口
router.post("/add", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sportType, count, duration, startTime } = req.body;

    if (!sportType || count === undefined || !duration || !startTime) {
      return res.status(400).json({ code: 400, message: "缺少必要字段" });
    }

    if (!SPORT_TYPES[sportType]) {
      return res.status(400).json({ code: 400, message: "运动类型不合法" });
    }

    // 计算卡路里
    const calorieFactor = SPORT_TYPES[sportType].calorieFactor;
    const calories = Math.round(count * calorieFactor);

    // 添加记录
    const record = new SportRecord({
      userId,
      sportType,
      count,
      duration,
      calories,
      startTime,
      createdAt: new Date(),
    });
    await record.save();

    // 更新用户运动统计
    const stat = await SportStat.findOneAndUpdate(
      { userId, sportType },
      {
        $inc: {
          totalCount: count,
          totalDuration: duration,
          totalCalories: calories,
          workoutCount: 1,
        },
        $max: { bestCount: count },
        $set: { lastWorkout: new Date(), updatedAt: new Date() },
      },
      { upsert: true, new: true }
    );

    // 更新用户总统计
    await User.findByIdAndUpdate(userId, {
      $inc: { totalWorkouts: 1 },
      $set: { updatedAt: new Date() },
    });

    // 更新该运动类型的所有排行榜
    await updateSportLeaderboards(sportType);

    res.status(200).json({
      code: 200,
      message: "运动记录添加成功",
      data: {
        recordId: record._id,
        statId: stat._id,
        calories,
      },
    });
  } catch (error) {
    console.error("添加运动记录失败:", error);
    res.status(500).json({ code: 500, message: "添加运动记录失败，请稍后重试" });
  }
});

// 获取用户所有运动类型统计
router.get("/stats/all", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await SportStat.find({ userId });

    // 格式化响应，增加运动名称和单位
    const data = stats.map(stat => ({
      sportType: stat.sportType,
      sportName: SPORT_TYPES[stat.sportType]?.name || stat.sportType,
      unit: SPORT_TYPES[stat.sportType]?.unit || "",
      totalCount: stat.totalCount,
      totalDuration: stat.totalDuration,
      totalCalories: stat.totalCalories,
      bestCount: stat.bestCount,
      workoutCount: stat.workoutCount,
      lastWorkout: stat.lastWorkout,
    }));

    res.status(200).json({ code: 200, message: "获取成功", data });
  } catch (error) {
    console.error("获取用户运动统计失败:", error);
    res.status(500).json({ code: 500, message: "获取用户运动统计失败" });
  }
});

// 获取用户特定运动类型的记录
router.get("/records/:sportType", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sportType } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    if (!SPORT_TYPES[sportType]) {
      return res.status(400).json({ code: 400, message: "运动类型不合法" });
    }

    const records = await SportRecord.find({ userId, sportType })
      .sort({ startTime: -1 })
      .limit(limit);

    // 格式化响应
    const data = records.map(r => ({
      recordId: r._id,
      count: r.count,
      duration: r.duration,
      calories: r.calories,
      startTime: r.startTime,
      createdAt: r.createdAt,
    //   unit: SPORT_TYPES[r.sportType].unit,
    }));

    res.status(200).json({ code: 200, message: "获取成功", data });
  } catch (error) {
    console.error("获取用户运动记录失败:", error);
    res.status(500).json({ code: 500, message: "获取用户运动记录失败" });
  }
});

router.get("/summary/:sportType", authenticateToken, async (req, res) => {
  try {
    const { sportType } = req.params;
    const queryUserId = req.query.userId;
    const userId = queryUserId || req.user.userId;

    if (!SPORT_TYPES[sportType]) {
      return res.status(400).json({ code: 400, message: "运动类型不合法" });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ code: 400, message: "userId 不合法" });
    }

    // 把 userId 构造为 ObjectId 实例（注意使用 new）
    const objectUserId = new mongoose.Types.ObjectId(userId);

    // 1) 从 SportStat 获取累计值（若存在）
    const stat = await SportStat.findOne({ userId: objectUserId }).lean();
    const totalCount = stat?.totalCount || 0;
    const totalDuration = stat?.totalDuration || 0;
    const totalCalories = stat?.totalCalories || 0;
    const lastUpdated = stat?.updatedAt || null;

    // 2) 计算“今日”范围（按中国大陆时间 Asia/Shanghai，UTC+8）
    const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000; // +8 小时
    const now = new Date();
    const chinaNow = new Date(now.getTime() + CHINA_OFFSET_MS);
    const year = chinaNow.getUTCFullYear();
    const month = chinaNow.getUTCMonth(); // 0-11
    const date = chinaNow.getUTCDate();

    // 中国当天 00:00:00 对应的 UTC 时间（ms）
    const chinaMidnightUtcMs = Date.UTC(year, month, date, 0, 0, 0) - CHINA_OFFSET_MS;
    const startOfToday = new Date(chinaMidnightUtcMs);
    const endOfToday = new Date(chinaMidnightUtcMs + 24 * 60 * 60 * 1000);

    // 3) 聚合 SportRecord 计算今日的 count / duration / calories
    const agg = await SportRecord.aggregate([
      {
        $match: {
          userId: objectUserId,      // <-- 使用已构造的 ObjectId 实例
          sportType,
          startTime: { $gte: startOfToday, $lt: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          todayCount: { $sum: "$count" },
          todayDuration: { $sum: "$duration" },
          todayCalories: { $sum: "$calories" },
        },
      },
    ]);

    const todayAgg = agg[0] || { todayCount: 0, todayDuration: 0, todayCalories: 0 };

    // 4) 返回结果
    res.status(200).json({
      code: 200,
      message: "获取成功",
      data: {
        userId,
        sportType,
        sportName: SPORT_TYPES[sportType]?.name || sportType,
        unit: SPORT_TYPES[sportType]?.unit || "",
        totalCount,
        totalDuration,
        totalCalories,
        lastUpdated,
        todayCount: todayAgg.todayCount || 0,
        todayDuration: todayAgg.todayDuration || 0,
        todayCalories: todayAgg.todayCalories || 0,
        todayRange: {
          start: startOfToday,
          end: endOfToday,
        },
      },
    });
  } catch (error) {
    console.error("获取汇总数据失败:", error);
    res.status(500).json({ code: 500, message: "获取汇总数据失败" });
  }
});

module.exports = router;
