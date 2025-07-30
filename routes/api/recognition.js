const express = require("express");
const User = require("../../models/users/users"); // 导入用户模型
const router = express.Router();
const axios = require("axios"); // 用于调用 Flask 接口
const { compareFaceFeatures, SIMILARITY_THRESHOLD } = require('../../utils/faceUtils'); 

// 识别人脸接口（支持批量查询）
router.post('/recognize/face', async (req, res) => {
  try {
      const { faceFeatures } = req.body;

      // 1. 检查请求参数格式
      if (!faceFeatures || typeof faceFeatures !== 'object') {
          return res.status(400).json({ code: 400, message: "请求参数格式错误" });
      }

      // 2. 查询所有用户
      const users = await User.find({ faceFeature: { $exists: true } });

      if (users.length === 0) {
          return res.status(400).json({ code: 400, message: "未找到已注册的人脸特征" });
      }

      const results = {};

      // 3. 遍历传入的每个人脸特征
      for (const [id, featureData] of Object.entries(faceFeatures)) {
          const { featureType, feature, needImage } = featureData;

          // 4. 初始化最佳匹配用户和最高相似度
          let bestMatchUser = null;
          let highestSimilarity = 0;

          // 5. 遍历所有用户，逐一比对人脸特征
          for (const user of users) {
              const similarity = compareFaceFeatures(feature, user.faceFeature, SIMILARITY_THRESHOLD);
              if (similarity > highestSimilarity) {
                  highestSimilarity = similarity;
                  bestMatchUser = user;
              }
          }

          // 6. 检查是否找到匹配的用户
          if (!bestMatchUser || highestSimilarity < SIMILARITY_THRESHOLD) {
              results[id] = { registered: false };
              continue;
          }

          // 7. 构造返回的用户信息
          const userInfo = {
              registered: true,
              userId: bestMatchUser._id,
              account: bestMatchUser.username,
              username: bestMatchUser.realname,
              gender: bestMatchUser.gender,
          };

          // 8. 如果需要返回头像图片
          if (needImage) {
              userInfo.image = bestMatchUser.avatar;
          }

          results[id] = userInfo;
      }

      // 9. 返回响应
      res.status(200).json({
          code: 200,
          message: "识别成功",
          data: results,
      });
  } catch (error) {
      console.error("识别失败:", error);
      res.status(500).json({ code: 500, message: "识别失败，请稍后重试" });
  }
});


// 2D动作识别接口
router.post("/recognize/motion", async (req, res) => {
  const { skeletonData } = req.body;

  // 检查请求参数
  if (!skeletonData || typeof skeletonData !== "object") {
    return res.status(400).json({
      code: 400,
      message: "请求参数错误：skeletonData 必须是一个对象",
    });
  }

  try {
    // 调用外部服务（例如 Flask 服务）进行2D动作识别
    //服务器上端口7000用于动作识别算法模块
    const response = await axios.post("http://localhost:7000/api/recognize/motion", {
      skeletonData,
    });

    // 返回外部服务的响应
    res.json(response.data);
  } catch (error) {
    console.error("调用2D动作识别接口失败：", error.message);
    res.status(500).json({
      code: 500,
      message: "2D动作识别失败",
      error: error.message,
    });
  }
});


// 手势识别接口
router.post("/recognize/gesture", async (req, res) => {
  const { gestureData } = req.body;

  // 检查请求参数
  if (!gestureData || !Array.isArray(gestureData)) {
    return res.status(400).json({
      code: 400,
      message: "请求参数错误：gestureData 必须是一个数组",
    });
  }

  try {
    // 调用 Flask 的手势识别接口
    const response = await axios.post("http://localhost:5000/api/recognize/gesture", {
      gestureData,
    });

    // 返回 Flask 接口的响应
    res.json(response.data);
  } catch (error) {
    console.error("调用手势识别接口失败：", error.message);
    res.status(500).json({
      code: 500,
      message: "手势识别失败",
      error: error.message,
    });
  }
});

// 3D姿态识别接口
router.post("/recognize/3d_pose", async (req, res) => {
  const { skeletonData, withAction = false, frameID } = req.body;

  // 检查请求参数
  if (!skeletonData || typeof skeletonData !== "object") {
    return res.status(400).json({
      code: 400,
      message: "请求参数错误：skeletonData 必须是一个对象",
    });
  }

  // 检查骨架数据是否有效
  for (const [key, data] of Object.entries(skeletonData)) {
    if (!data.skeletonType || !data.keypoints || data.is3D === undefined || !data.requireType) {
      return res.status(400).json({
        code: 400,
        message: `请求参数错误：骨架数据 ${key} 缺少必要字段`,
      });
    }

    // 检查 keypoints 是否为三维数组
    if (!Array.isArray(data.keypoints) || !data.keypoints.every(frame => Array.isArray(frame))) {
      return res.status(400).json({
        code: 400,
        message: `请求参数错误：骨架数据 ${key} 的 keypoints 必须是三维数组`,
      });
    }
  }

  try {
    // 调用 Flask 的3D姿态识别接口
    const response = await axios.post("http://localhost:5000/api/recognize/3d_pose", {
      skeletonData,
      withAction,
      frameID
    });

    // 返回 Flask 接口的响应
    res.json(response.data);
  } catch (error) {
    console.error("调用3D姿态识别接口失败：", error.message);
    res.status(500).json({
      code: 500,
      message: "3D姿态识别失败",
      error: error.message,
    });
  }
});

module.exports = router;
