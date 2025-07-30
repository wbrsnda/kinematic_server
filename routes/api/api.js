const express = require("express");
const User = require("../../models/users/users");
const Game = require("../../models/games/games"); 
const authenticateToken = require("../../utils/authenticateToken"); // JWT 认证中间件
const bcrypt = require("bcrypt")
const router = express.Router();

// 传入游戏数据
router.post("/games", async (req, res) => {
    try {
        const gamesData = req.body;

        // 验证请求体是否为数组
        if (!Array.isArray(gamesData)) {
            return res.status(400).json({ code: 400, message: "请求体必须是一个数组" });
        }

        // 插入数据到数据库
        const insertedGames = await Game.insertMany(gamesData);

        // 返回成功响应
        res.status(200).json({
            code: 200,
            message: "数据上传成功",
            data: insertedGames,
        });
    } catch (error) {
        console.error("上传游戏数据失败:", error);
        res.status(500).json({ code: 500, message: "上传游戏数据失败，请稍后重试" });
    }
});


// 获取所有用户按照得分的排名数据
router.get("/rankings", authenticateToken, async (req, res) => {
    try {
        // 从games集合中获取所有跳绳数据，并按score降序排序
        const gamesData = await Game.find({ exerciseType: "JumpRope" }).sort({ score: -1 });

        // 为每条数据添加rank字段，并获取用户名
        const rankedData = await Promise.all(gamesData.map(async (game, index) => {
            const user = await User.findById(game.userID);
            // 如果用户不存在，设置默认用户名为“游客”
            const username = user ? user.username : "游客";
            return {
                rank: index + 1,
                userId: game.userID.toString(),
                username: username,
                score: game.score
            };
        }));

        // 返回排名数据
        res.status(200).json({
            code: 200,
            message: "查询成功",
            data: rankedData,
        });
    } catch (error) {
        console.error("获取排名数据失败:", error);
        res.status(500).json({ code: 500, message: "获取排名数据失败，请稍后重试" });
    }
});

// 查询用户运动数据接口
router.get("/rankings_self", authenticateToken, async (req, res) => {
    const userId = req.user.userId; // 从 JWT Token 中获取用户 ID
  
    try {
      // 查询 games 表中该用户的所有运动数据
      const gamesData = await Game.find({ userID: userId });
  
      if (gamesData.length === 0) {
        return res.status(404).json({ code: 404, message: "未找到相关运动数据" });
      }
  
      // 格式化返回数据
      const formattedData = gamesData.map((game) => ({
        _id: game._id,
        userID: game.userID,
        exerciseType: game.exerciseType,
        score: game.score,
        calories: game.calories,
        ranks: game.ranks,
        groupId: game.groupId,
        evaluation: game.evaluation,
        recordTime: game.recordTime,
      }));
  
      res.json({
        code: 200,
        message: "查询成功",
        data: formattedData,
      });
    } catch (error) {
      console.error("查询失败:", error);
      res.status(500).json({ code: 500, message: "服务器内部错误" });
    }
  });
  

module.exports = router;