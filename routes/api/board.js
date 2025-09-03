const express = require("express");
const router = express.Router();
const authenticateToken = require("../../utils/authenticateToken");
const SportStat = require("../../models/sportStatus/sportStatus");
const Leaderboard = require("../../models/leaderBoard/leaderBoard");
const User = require("../../models/users/users");

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

// 获取某运动类型排行榜
async function getLeaderboard(sportType, metricType) {
  return await Leaderboard.findOne(
    { sportType, metricType },
    { rankings: 1, updatedAt: 1 }
  );
}

// 获取用户在排行榜中的排名
async function getUserRank(userId, sportType, metricType) {
  const leaderboard = await getLeaderboard(sportType, metricType);
  if (!leaderboard) return null;

  return leaderboard.rankings.find(rank =>
    rank.userId.toString() === userId.toString()
  );
}

// 手动触发更新排行榜
router.post("/leaderboard/update/:sportType", authenticateToken, async (req, res) => {
  try {
    const { sportType } = req.params;
    if (!sportType) return res.status(400).json({ code: 400, message: "缺少运动类型" });

    await updateSportLeaderboards(sportType);

    res.status(200).json({ code: 200, message: "排行榜更新成功" });
  } catch (error) {
    console.error("更新排行榜失败:", error);
    res.status(500).json({ code: 500, message: "更新排行榜失败" });
  }
});

// 获取排行榜
router.get("/leaderboard/:sportType/:metricType", authenticateToken, async (req, res) => {
  try {
    const { sportType, metricType } = req.params;
    const leaderboard = await getLeaderboard(sportType, metricType);

    res.status(200).json({
      code: 200,
      message: "获取排行榜成功",
      data: leaderboard ? leaderboard.rankings : [],
      updatedAt: leaderboard?.updatedAt,
    });
  } catch (error) {
    console.error("获取排行榜失败:", error);
    res.status(500).json({ code: 500, message: "获取排行榜失败" });
  }
});

// 获取当前用户在排行榜中的排名
router.get("/leaderboard/:sportType/:metricType/me", authenticateToken, async (req, res) => {
  try {
    const { sportType, metricType } = req.params;
    const userId = req.user.userId;

    const userRank = await getUserRank(userId, sportType, metricType);

    if (!userRank) {
      return res.status(404).json({ code: 404, message: "未上榜" });
    }

    res.status(200).json({
      code: 200,
      message: "获取用户排行榜位置成功",
      data: userRank,
    });
  } catch (error) {
    console.error("获取用户排行榜位置失败:", error);
    res.status(500).json({ code: 500, message: "获取用户排行榜位置失败" });
  }
});


module.exports = router;
