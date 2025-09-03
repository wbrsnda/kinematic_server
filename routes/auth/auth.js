const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../../models/users/users");
const generateToken = require("../../utils/generateToken");
const router = express.Router();
const { compareFaceFeatures, SIMILARITY_THRESHOLD } = require('../../utils/faceUtils'); 


// 注册接口（移动端专用，必须通过人脸识别）
router.post('/register', async (req, res) => {
  try {
    const { faceFeature, username, realname, password, phoneNumber, gender, avatar } = req.body;

    // 检查是否提供了人脸特征
    if (!faceFeature || !Array.isArray(faceFeature) || faceFeature.length === 0) {
      return res.status(400).json({ code: 400, message: "必须提供有效的人脸特征" });
    }

    // 检查用户名是否已存在（仅检查非游客账号）
    if (username) {
      const existingUser = await User.findOne({ 
        username, 
        isGuest: false 
      });
      if (existingUser) {
        return res.status(400).json({ code: 400, message: '用户名已存在' });
      }
    }

    // 通过人脸特征查找匹配的用户（优先查找游客账号）
    const users = await User.find({
      faceFeature: { $exists: true, $ne: [], $not: { $size: 0 } }
    });

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
        continue;
      }
    }

    let user;

    // 如果找到了匹配的游客账号
    if (bestMatchUser && highestSimilarity >= SIMILARITY_THRESHOLD && bestMatchUser.isGuest) {
      // 更新游客账号为正式账号
      bestMatchUser.username = username || bestMatchUser.username;
      bestMatchUser.password = password || bestMatchUser.password;
      bestMatchUser.realname = realname || bestMatchUser.realname;
      bestMatchUser.phoneNumber = phoneNumber || bestMatchUser.phoneNumber;
      bestMatchUser.gender = gender || bestMatchUser.gender;
      bestMatchUser.avatar = avatar || bestMatchUser.avatar;
      bestMatchUser.isGuest = false;
      bestMatchUser.updatedAt = new Date();
      
      await bestMatchUser.save();
      user = bestMatchUser;
    } else {
      // 如果没有找到匹配的游客账号，创建新用户
      user = new User({
        username,
        realname,
        password,
        phoneNumber,
        gender: gender || 'other',
        faceFeature,
        avatar: avatar || '/uploads/default-avatar.png',
        isGuest: false
      });
      
      await user.save();
    }

    // 生成JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      code: 200,
      message: user.isGuest ? "注册成功" : "注册成功，已升级游客账号",
      data: {
        token,
        userInfo: {
          userId: user._id,
          username: user.username,
          realname: user.realname,
          phoneNumber: user.phoneNumber,
          gender: user.gender,
          avatar: user.avatar,
          isGuest: false
        }
      }
    });
    
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ code: 500, message: '注册失败，请稍后重试' });
  }
});


// 方式一：通过用户名和密码登录
router.post("/login/password", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username, isGuest: false });
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
        phoneNumber: user.phoneNumber,
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
  
// 通过人脸特征登录（大屏端专用）
router.post("/login/face/clientside", async (req, res) => {
  try {
    const { faceFeature } = req.body;

    if (!faceFeature || !Array.isArray(faceFeature)) {
      return res.status(400).json({ code: 400, message: "人脸特征数据格式错误" });
    }

    // 查询所有人脸特征用户（包括正式用户和游客）
    const users = await User.find({
      faceFeature: { $exists: true, $ne: [], $not: { $size: 0 } }
    });

    let bestMatchUser = null;
    let highestSimilarity = 0;

    // 在所有用户中查找最佳匹配
    for (const user of users) {
      try {
        const similarity = compareFaceFeatures(faceFeature, user.faceFeature);
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestMatchUser = user;
        }
      } catch (error) {
        console.error(`用户 ${user._id} 特征比对失败:`, error);
        continue;
      }
    }

    // 如果找到匹配的用户
    if (bestMatchUser && highestSimilarity >= SIMILARITY_THRESHOLD) {
      const token = generateToken(bestMatchUser._id);
      return res.status(200).json({ 
        code: 200,
        message: "登录成功",
        data: {
          userId: bestMatchUser._id,
          username: bestMatchUser.username,
          realname: bestMatchUser.realname,
          phoneNumber: bestMatchUser.phoneNumber,
          gender: bestMatchUser.gender,
          avatar: bestMatchUser.avatar,
          isGuest: bestMatchUser.isGuest,
          token,
        },
      });
    }

    // 如果没有找到匹配的用户，创建游客账号
    // 生成一个临时的用户名（不会与正式用户冲突）
    // 生成一个临时的用户名（限制20字符以内）
    const tempUsername = `g${Date.now().toString(36).slice(-5)}${Math.random().toString(36).substr(2, 3)}`;
    
    const newGuestUser = new User({
      username: tempUsername,
      faceFeature: faceFeature,
      isGuest: true,
    });
    
    await newGuestUser.save();
    
    const token = generateToken(newGuestUser._id);
    
    res.status(200).json({
      code: 200,
      message: "已创建游客账号",
      data: {
        token,
        userInfo: {
          userId: newGuestUser._id,
          username: newGuestUser.username,
          isGuest: true,
        }
      }
    });
    
  } catch (error) {
    console.error("人脸登录失败:", error);
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
            phoneNumber: bestMatchUser.phoneNumber,
            gender: bestMatchUser.gender,
            avatar: bestMatchUser.avatar, // 返回头像路径
            isGuest: bestMatchUser.isGuest,
            token,
        }, });
  } catch (error) {
      // 错误处理
      console.error("登录失败:", error);
      res.status(500).json({ code: 500, message: "登录失败，请稍后重试" });
  }
});


module.exports = router;

