var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');


var app = express();
const mongoose = require('mongoose')

const bodyParser = require("body-parser");
require('dotenv').config(); // 加载 .env 文件中的环境变量

// 使用 body-parser 中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


const Users = require('./models/users/users')
const Games = require('./models/games/games')

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/test', require('./routes/test'))

app.use('/common', require('./routes/common'))
app.use("/auth", require("./routes/auth/auth"));
app.use('/users', require('./routes/users'));
app.use("/api", require("./routes/api/api"));
app.use("/api", require("./routes/api/recognition"));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

//mongo connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('数据库连接成功');
  })
  .catch((err) => {
    console.error('数据库连接失败：', err);
  });

const port = process.env.PORT || 8080;
// 启动服务器，监听所有网络接口
app.listen(port, '0.0.0.0', () => {
  console.log(`服务端正在端口${port}运行`);
});

  //初始化表测试  
async function initUsers() {
  const isExist = await Users.countDocuments();
  if (isExist == 0) {
    const users = new Users({
      
    });
    await users.save();
    console.log('用户表创建成功')
  }
}
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// initUsers();

module.exports = app;
