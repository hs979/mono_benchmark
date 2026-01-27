/**
 * Todo应用-后端服务器
 * 
 * 这是一个传统的Node.js + Express单体应用
 */

// 加载环境变量配置
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const todoRoutes = require('./routes/todo');

// 创建Express应用实例
const app = express();
const PORT = process.env.PORT || 8080;

// 中间件配置
app.use(cors()); // 允许跨域请求
app.use(express.json()); // 解析JSON请求体
app.use(express.urlencoded({ extended: true })); // 解析URL编码的请求体

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 路由配置
app.use('/auth', authRoutes); // 用户认证相关路由
app.use('/api', todoRoutes); // Todo业务逻辑路由

// 根路径健康检查（仅用于验证服务运行状态）
app.get('/', (req, res) => {
  res.json({
    message: 'Todo应用后端服务正在运行',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404错误处理
app.use((req, res) => {
  res.status(404).json({ message: '请求的资源不存在' });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`Todo应用后端服务已启动`);
  console.log(`运行地址: http://localhost:${PORT}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

