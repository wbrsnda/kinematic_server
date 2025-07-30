const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../../models/users/users");
const generateToken = require("../../utils/generateToken");
const router = express.Router();
const { compareFaceFeatures, SIMILARITY_THRESHOLD } = require('../../utils/faceUtils'); 

// 注册接口
router.post('/register', async (req, res) => {
  try {
    const { username, realname, password, gender, faceFeature, avatar } = req.body;

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ code: 400, message: '用户名已存在' });
    }

    // 如果是人脸注册，必须提供有效特征
    if (faceFeature && (!Array.isArray(faceFeature) || faceFeature.length === 0)) {
        return res.status(400).json({ code: 400, message: "人脸特征无效" });
    }

    // 创建新用户
    const newUser = new User({
      username,
      realname,
      password, // 密码会在保存时自动加密
      gender: gender || 'other', // 如果未提供，默认为 "other"
      faceFeature: faceFeature || [], // 如果未提供，默认为空数组
      avatar: avatar || '/uploads/default-avatar.png', // 如果未提供，使用默认头像路径
    });

    await newUser.save();

    // 返回响应
    res.status(200).json({
      code: 200,
      message: '注册成功',
      data: {
        userId: newUser._id,
        username: newUser.username,
        realname: newUser.realname,
        gender: newUser.gender,
        avatar: newUser.avatar, // 返回头像路径
      },
    });

      // 其余逻辑不变
  } catch (error) {
      // 错误处理
    console.error('注册失败:', error);
    res.status(500).json({ code: 500, message: '注册失败，请稍后重试' });
  }
});


// 方式一：通过用户名和密码登录
router.post("/login/password", async (req, res) => {
  try {
    const { username, password } = req.body;


    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ code: 400, message: "用户名或密码错误" });
    }


    const isPasswordValid = await bcrypt.compare(password, user.password);


    if (!isPasswordValid) {
      return res.status(400).json({ code: 400, message: "用户名或密码错误" });
    }

    // 生成 Token 并返回响应
    const token = generateToken(user._id);
    res.status(200).json({
      code: 200,
      message: "登录成功",
      data: {
        userId: user._id,
        username: user.username,
        realname: user.realname,
        gender: user.gender,
        avatar: user.avatar,
        token,
      },
    });
  } catch (error) {
    console.error("登录失败:", error);
    res.status(500).json({ code: 500, message: "登录失败，请稍后重试" });
  }
});
  
// 通过人脸特征登录（不需要用户名）
router.post("/login/face", async (req, res) => {
  try {
      const { faceFeature } = req.body;

      // 查询所有有效人脸特征用户（非空数组）
      const users = await User.find({
          faceFeature: { $exists: true, $ne: [], $not: { $size: 0 } }
      });

      if (users.length === 0) {
          return res.status(400).json({ code: 400, message: "无人脸注册用户" });
      }

      let bestMatchUser = null;
      let highestSimilarity = 0;

      for (const user of users) {
          try {
              const similarity = compareFaceFeatures(faceFeature, user.faceFeature);
              if (similarity > highestSimilarity) {
                  highestSimilarity = similarity;
                  bestMatchUser = user;
              }
          } catch (error) {
              console.error(`用户 ${user._id} 特征比对失败:`, error);
              continue; // 跳过无效特征
          }
      }

      if (!bestMatchUser || highestSimilarity < SIMILARITY_THRESHOLD) {
          return res.status(400).json({ code: 400, message: "人脸匹配失败" });
      }

      const token = generateToken(bestMatchUser._id);
      res.status(200).json({ 
        code: 200,
        message: "登录成功",
        data: {
            userId: bestMatchUser._id,
            username: bestMatchUser.username,
            realname: bestMatchUser.realname,
            gender: bestMatchUser.gender,
            avatar: bestMatchUser.avatar, // 返回头像路径
            token,
        }, });
  } catch (error) {
      // 错误处理
      console.error("登录失败:", error);
      res.status(500).json({ code: 500, message: "登录失败，请稍后重试" });
  }
});


module.exports = router;

