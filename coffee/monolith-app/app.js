
/**
 * presso 单体应用主入口
 * 这是一个咖啡订单管理系统的传统单体架构实现
 */

const express = require('express');
const cors = require('cors');
const { EventEmitter } = require('events');
const app = express();

// 引入各个服务模块
const database = require('./services/database');
const validatorService = require('./services/validator');
const orderManagerService = require('./services/orderManager');
const orderProcessorService = require('./services/orderProcessor');
const configService = require('./services/config');
const publisherService = require('./services/publisher');
const countingService = require('./services/counting');
const orderJourneyService = require('./services/orderJourney');
const metricsService = require('./services/metrics');
const authService = require('./services/authService');

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 创建全局事件总线
global.eventBus = new EventEmitter();
global.eventBus.setMaxListeners(50);

// 初始化数据库（异步）
// 注意：数据库初始化是异步的，但服务器会在初始化完成前启动
// 早期请求可能会失败，直到初始化完成
database.initialize().catch(err => {
  console.error('数据库初始化失败:', err);
  console.error('请确保已正确配置AWS凭证和DynamoDB表');
});

// 注册事件监听器
publisherService.registerListeners(global.eventBus);
orderManagerService.registerListeners(global.eventBus);
orderProcessorService.registerListeners(global.eventBus);
orderJourneyService.registerListeners(global.eventBus);
metricsService.registerListeners(global.eventBus);

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== Authentication API ====================

// 用户注册
app.post('/register', (req, res) => {
  authService.register(req, res);
});

// 用户登录
app.post('/login', (req, res) => {
  authService.login(req, res);
});

// 获取当前用户信息（需要认证）
app.get('/me', authService.authenticateToken, (req, res) => {
  authService.getCurrentUser(req, res);
});

// ==================== Validator Service API ====================

// 生成QR码（需要管理员权限）
app.get('/qr-code', authService.authenticateToken, authService.requireAdmin, (req, res) => {
  validatorService.getQRCode(req, res);
});

// 验证QR码并创建订单（需要管理员权限）
app.post('/qr-code', authService.authenticateToken, authService.requireAdmin, (req, res) => {
  validatorService.verifyQRCode(req, res);
});

// ==================== Order Manager API ====================

// 获取订单列表（需要管理员权限）
app.get('/orders', authService.authenticateToken, authService.requireAdmin, (req, res) => {
  orderManagerService.getOrders(req, res);
});

// 获取当前用户的订单（需要认证）
app.get('/myOrders', authService.authenticateToken, (req, res) => {
  orderManagerService.getMyOrders(req, res);
});

// 获取单个订单详情（需要管理员权限）
app.get('/orders/:id', authService.authenticateToken, authService.requireAdmin, (req, res) => {
  orderManagerService.getOrderById(req, res);
});

// 更新订单（需要管理员权限）
app.put('/orders/:id', authService.authenticateToken, authService.requireAdmin, (req, res) => {
  orderManagerService.updateOrder(req, res);
});

// ==================== Config Service API ====================

// 获取配置
app.get('/config', (req, res) => {
  configService.getConfig(req, res);
});

// 更新配置（需要管理员权限）
app.put('/config', authService.authenticateToken, authService.requireAdmin, (req, res) => {
  configService.updateConfig(req, res);
});

// 扫描所有配置
app.get('/config/all', (req, res) => {
  configService.scanConfig(req, res);
});

// ==================== Order Journey API ====================

// 获取订单旅程
app.get('/order-journey/:orderId', (req, res) => {
  try {
    const orderId = req.params.orderId;
    const events = orderJourneyService.getOrderJourney(orderId);
    res.status(200).json({
      orderId: orderId,
      eventCount: events.length,
      events: events
    });
  } catch (error) {
    console.error('获取订单旅程错误:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// 获取订单旅程HTML
app.get('/order-journey/:orderId/html', (req, res) => {
  try {
    const orderId = req.params.orderId;
    const html = orderJourneyService.generateOrderJourneyHTML(orderId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error('生成订单旅程HTML错误:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// 获取订单统计
app.get('/order-journey/stats', (req, res) => {
  try {
    const stats = orderJourneyService.getOrderStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('获取订单统计错误:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// ==================== Metrics Service API ====================

// 获取所有指标
app.get('/metrics', (req, res) => {
  try {
    const metrics = metricsService.getAllMetrics();
    res.status(200).json(metrics);
  } catch (error) {
    console.error('获取指标错误:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// 获取订单指标
app.get('/metrics/orders', (req, res) => {
  try {
    const metrics = metricsService.getOrderMetrics();
    res.status(200).json(metrics);
  } catch (error) {
    console.error('获取订单指标错误:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// 获取饮品指标
app.get('/metrics/drinks', (req, res) => {
  try {
    const metrics = metricsService.getDrinkMetrics();
    res.status(200).json(metrics);
  } catch (error) {
    console.error('获取饮品指标错误:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// 获取修饰符指标
app.get('/metrics/modifiers', (req, res) => {
  try {
    const metrics = metricsService.getModifierMetrics();
    res.status(200).json(metrics);
  } catch (error) {
    console.error('获取修饰符指标错误:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// 生成指标报告
app.get('/metrics/report', (req, res) => {
  try {
    const report = metricsService.generateMetricsReport();
    res.status(200).json(report);
  } catch (error) {
    console.error('生成指标报告错误:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// 重置指标
app.post('/metrics/reset', (req, res) => {
  try {
    metricsService.resetMetrics();
    res.status(200).json({ message: '指标已重置' });
  } catch (error) {
    console.error('重置指标错误:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// ==================== 错误处理 ====================

// 404处理
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== 服务器启动 ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 应用已启动');
  console.log('='.repeat(60));
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`⏰ 启动时间: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  console.log('\n可用的API端点:');
  console.log('  [Authentication Service]');
  console.log('    POST /register                   - 用户注册');
  console.log('    POST /login                      - 用户登录');
  console.log('    GET  /me                         - 获取当前用户信息 [需要认证]');
  console.log('\n  [Validator Service]');
  console.log('    GET  /qr-code                    - 生成QR码 [需要管理员]');
  console.log('    POST /qr-code                    - 验证QR码并创建订单');
  console.log('\n  [Order Manager Service]');
  console.log('    GET  /orders                     - 获取订单列表');
  console.log('    GET  /myOrders                   - 获取我的订单 [需要认证]');
  console.log('    GET  /orders/:id                 - 获取订单详情');
  console.log('    PUT  /orders/:id                 - 更新订单');
  console.log('\n  [Config Service]');
  console.log('    GET  /config                     - 获取配置');
  console.log('    PUT  /config                     - 更新配置');
  console.log('    GET  /config/all                 - 获取所有配置');
  console.log('\n  [Order Journey Service]');
  console.log('    GET  /order-journey/:orderId     - 获取订单旅程');
  console.log('    GET  /order-journey/:orderId/html - 获取订单旅程HTML');
  console.log('    GET  /order-journey/stats        - 获取订单统计');
  console.log('\n  [Metrics Service]');
  console.log('    GET  /metrics                    - 获取所有指标');
  console.log('    GET  /metrics/orders             - 获取订单指标');
  console.log('    GET  /metrics/drinks             - 获取饮品指标');
  console.log('    GET  /metrics/modifiers          - 获取修饰符指标');
  console.log('    GET  /metrics/report             - 生成指标报告');
  console.log('    POST /metrics/reset              - 重置指标');
  console.log('='.repeat(60));
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在优雅关闭...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n收到 SIGINT 信号，正在优雅关闭...');
  process.exit(0);
});

module.exports = app;

