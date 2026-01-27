/**
 * AWS Bookstore全栈单体应用 - 主服务器
 * 这是一个传统的Express.js单体应用，提供完整的前后端服务
 */

// 加载环境变量
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');

// 导入路由模块
const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const cartRoutes = require('./routes/cart');
const ordersRoutes = require('./routes/orders');
const bestSellersRoutes = require('./routes/bestsellers');
const recommendationsRoutes = require('./routes/recommendations');
const searchRoutes = require('./routes/search');

// 导入认证中间件
const { authMiddleware } = require('./middleware/auth');

const app = express();

// 中间件配置
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 托管前端静态文件（React构建后的文件）
const frontendBuildPath = path.join(__dirname, 'frontend', 'build');
app.use(express.static(frontendBuildPath));

// 认证路由 - 不需要JWT验证（注册和登录接口）
app.use('/api/auth', authRoutes);

// 注册API路由（所有API路由都以/api开头，以便与前端路由区分）
// 这些路由需要JWT认证（或开发模式）
app.use('/api/books', authMiddleware, booksRoutes);
app.use('/api/cart', authMiddleware, cartRoutes);
app.use('/api/orders', authMiddleware, ordersRoutes);
app.use('/api/bestsellers', authMiddleware, bestSellersRoutes);
app.use('/api/recommendations', authMiddleware, recommendationsRoutes);
app.use('/api/search', authMiddleware, searchRoutes);

// API根路径 - 返回API信息
app.get('/api', (req, res) => {
  res.json({
    message: 'AWS Bookstore API',
    version: '1.0.0',
    authMode: config.auth.devMode ? 'development (JWT optional)' : 'production (JWT required)',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        me: 'GET /api/auth/me'
      },
      books: '/api/books',
      cart: '/api/cart',
      orders: '/api/orders',
      bestsellers: '/api/bestsellers',
      recommendations: '/api/recommendations',
      search: '/api/search'
    }
  });
});

// 处理前端路由 - 所有非API请求都返回React应用的index.html
// 这样React Router可以接管前端路由
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: config.nodeEnv === 'development' ? err.stack : undefined
  });
});

// 启动服务器
const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 AWS Bookstore 应用正在运行`);
  console.log(`========================================`);
  console.log(`📍 访问地址: http://localhost:${PORT}`);
  console.log(`🌍 环境: ${config.nodeEnv}`);
  console.log(`🔐 认证模式: ${config.auth.devMode ? '开发模式 (JWT可选)' : '生产模式 (需要JWT)'}`);
  console.log(`========================================`);
  console.log(`📖 前端应用: http://localhost:${PORT}/`);
  console.log(`🔌 API文档: http://localhost:${PORT}/api`);
  console.log(`========================================`);
  console.log(`认证端点:`);
  console.log(`  POST   /api/auth/register      - 用户注册`);
  console.log(`  POST   /api/auth/login         - 用户登录`);
  console.log(`  POST   /api/auth/refresh       - 刷新token`);
  console.log(`  GET    /api/auth/me            - 获取当前用户信息`);
  console.log(`========================================`);
  console.log(`API端点:`);
  console.log(`  GET    /api/books              - 列出所有书籍`);
  console.log(`  GET    /api/books?category=X   - 按分类列出书籍`);
  console.log(`  GET    /api/books/:id          - 获取单本书信息`);
  console.log(`  GET    /api/cart               - 获取购物车`);
  console.log(`  POST   /api/cart               - 添加到购物车`);
  console.log(`  PUT    /api/cart               - 更新购物车`);
  console.log(`  DELETE /api/cart               - 从购物车删除`);
  console.log(`  GET    /api/cart/:bookId       - 获取购物车中的某本书`);
  console.log(`  GET    /api/orders             - 获取订单列表`);
  console.log(`  POST   /api/orders             - 创建订单(结账)`);
  console.log(`  GET    /api/bestsellers        - 获取畅销书榜单`);
  console.log(`  GET    /api/recommendations    - 获取推荐书籍`);
  console.log(`  GET    /api/recommendations/:bookId - 按书获取推荐`);
  console.log(`  GET    /api/search?q=keyword   - 搜索书籍`);
  console.log(`========================================`);
});

module.exports = app;

