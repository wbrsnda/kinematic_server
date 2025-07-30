const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const FormData = require('form-data');

/* router test */
router.get('/', function(req, res, next) {
    // res.send('test');
    res.json({
        aaa: 'bbb',
        bbb: 'ccc'
    });
});


/**
 * POST /test/face
 * 测试发送图片到后端人脸识别服务
 */
router.post('/face', async function (req, res) {
    try {
        const imagePath = path.join(__dirname, '../public/pyy.jpg');
        const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });
        const data = { image: 'data:image/png;base64,' + imageBase64 };

        const response = await axios.post(process.env.REC_URL, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        res.json({
            message: '请求成功',
            data: response.data
        });

    } catch (err) {
        console.error('发送请求失败：', err.message);

        if (err.response) {
            // Flask 后端返回了错误响应，例如 400
            res.status(err.response.status).json({
                error: '后端返回错误',
                detail: err.response.data
            });
        } else if (err.request) {
            // 请求已发出但无响应
            res.status(500).json({
                error: '无响应',
                detail: 'face_service 无响应或网络错误'
            });
        } else {
            // 其他错误
            res.status(500).json({
                error: '未知错误',
                detail: err.message
            });
        }
    }
});


module.exports = router;