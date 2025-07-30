const express = require("express");
const User = require("../models/users/users");
const authenticateToken = require("../utils/authenticateToken"); // JWT 认证中间件
const bcrypt = require("bcrypt")
const router = express.Router();

// 获取用户信息的响应格式
const getUserInfoResponse = (user) => ({
  userId: user._id,
  username: user.username,
  realname: user.realname,
  gender: user.gender,
  faceFeature: user.faceFeature,
  avatar: user.avatar,
});

// 字段验证函数
const validateField = (field, value, options) => {
  if (value === undefined) return true; // 如果未传入字段，跳过验证

  if (options?.type === "array" && !Array.isArray(value)) {
    throw new Error(`${field} 数据不合法`);
  }

  if (options?.enum && !options.enum.includes(value)) {
    throw new Error(`${field} 不合法`);
  }

  if (options?.requiredFields && typeof value === "object") {
    for (const key of options.requiredFields) {
      if (value[key] === undefined) {
        throw new Error(`${field} 数据不完整`);
      }
    }
  }

  return true;
};

// 修改用户信息接口（支持部分更新）
router.put("/update", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId; // 从 JWT Token 中获取用户 ID
    const { username, realname, gender, faceFeature, avatar } = req.body;

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ code: 404, message: "用户不存在" });
    }

    // 部分更新逻辑
    if (username !== undefined) {
      const existingUser = await User.findOne({ username });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({ code: 400, message: "用户名已存在" });
      }
      user.username = username;
    }

    if (realname !== undefined) user.realname = realname;

    // 字段验证
    try {
      validateField("gender", gender, { enum: ["male", "female", "other"] });
      validateField("faceFeature", faceFeature, { type: "array" });
      validateField("avatar", avatar, { requiredFields: ["h", "w", "data"] });
    } catch (error) {
      return res.status(400).json({ code: 400, message: error.message });
    }

    if (gender !== undefined) user.gender = gender;
    if (faceFeature !== undefined) user.faceFeature = faceFeature;
    if (avatar !== undefined) user.avatar = avatar;

    // 保存更新后的用户信息
    await user.save();

    // 返回响应
    res.status(200).json({
      code: 200,
      message: "用户信息更新成功",
      data: getUserInfoResponse(user),
    });
  } catch (error) {
    console.error("修改用户信息失败:", error);
    res.status(500).json({ code: 500, message: "修改用户信息失败，请稍后重试" });
  }
});

// 修改用户密码接口
router.put("/update-password", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId; // 从 JWT Token 中获取用户 ID
    const { oldPassword, newPassword } = req.body;

    // 检查是否提供了旧密码和新密码
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ code: 400, message: "旧密码和新密码不能为空" });
    }

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ code: 404, message: "用户不存在" });
    }

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ code: 400, message: "旧密码不正确" });
    }

    // 检查新密码是否与旧密码相同
    if (oldPassword === newPassword) {
      return res.status(400).json({ code: 400, message: "新密码不能与旧密码相同" });
    }

    // 直接赋值新密码，pre("save") 钩子会自动加密
    user.password = newPassword;
    await user.save();

    // 返回响应
    res.status(200).json({
      code: 200,
      message: "密码修改成功",
    });
  } catch (error) {
    console.error("修改密码失败:", error);
    res.status(500).json({ code: 500, message: "修改密码失败，请稍后重试" });
  }
});


module.exports = router;