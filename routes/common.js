const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 设置文件上传路径
const uploadPath = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname); // 获取文件扩展名
    cb(null, uniqueSuffix + ext); // 生成文件名
  },
});

const upload = multer({ storage: storage });

// 文件上传路由
router.post('/file_upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 400,
        message: '没有文件上传',
      });
    }

    // 返回文件路径
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      code: 200,
      message: '文件上传成功',
      url: fileUrl,
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '文件上传失败',
      error: error.message,
    });
  }
});

module.exports = router;