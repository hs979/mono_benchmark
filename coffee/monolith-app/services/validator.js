
/**
 * 验证器服务
 * 负责生成和验证QR码，创建新订单
 */

const { customAlphabet } = require('nanoid');
const database = require('./database');
const authService = require('./authService');

const TIME_INTERVAL = 5 * 60 * 1000; // 5分钟
const CODE_LENGTH = 10;

// 创建自定义的nanoid生成器
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 21);

/**
 * 检查用户是否为管理员
 */
function isAdmin(req) {
  // 使用authService的管理员检查
  return authService.isAdmin(req);
}

/**
 * 获取当前用户ID
 */
function getUserId(req) {
  // 使用authService获取用户ID
  const userId = authService.getUserId(req);
  if (userId) {
    return userId;
  }
  
  // 兼容性处理：如果没有认证信息，从查询参数获取（用于测试）
  if (req.query.userId) {
    return req.query.userId;
  }
  
  // 默认用户ID
  return 'user-' + Math.random().toString(36).substr(2, 9);
}

/**
 * 生成QR码
 * GET /qr-code?eventId=ABC
 */
async function getQRCode(req, res) {
  try {
    console.log('[Validator] 生成QR码请求');
    
    // 检查是否为管理员
    if (!isAdmin(req)) {
      console.log('[Validator] 非管理员用户，访问被拒绝');
      return res.status(403).json({ error: 'Forbidden', message: '需要管理员权限' });
    }
    
    // 检查eventId参数
    if (!req.query.eventId) {
      return res.status(400).json({ error: 'Bad Request', message: '缺少eventId参数' });
    }
    
    const eventId = req.query.eventId;
    
    // 加载配置
    const configKey = `config-${eventId}`;
    const eventConfig = await database.getItem('config', { PK: configKey });
    
    if (!eventConfig) {
      console.log('[Validator] 未找到事件配置');
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: '未找到匹配的事件ID' 
      });
    }
    
    console.log('[Validator] 配置加载成功:', eventConfig);
    const availableTokens = eventConfig.drinksPerBarcode;
    
    // 生成或加载时间桶
    const CURRENT_TIME_BUCKET_ID = parseInt(Date.now() / TIME_INTERVAL);
    const bucketPK = `${eventId}-${CURRENT_TIME_BUCKET_ID}`;
    
    console.log('[Validator] 时间桶ID:', bucketPK);
    
    let bucket = await database.getItem('validator', { PK: bucketPK });
    
    if (!bucket) {
      // 创建新的时间桶
      bucket = {
        PK: bucketPK,
        last_id: CURRENT_TIME_BUCKET_ID,
        last_code: customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', CODE_LENGTH)(),
        start_ts: TIME_INTERVAL * CURRENT_TIME_BUCKET_ID,
        start_full: new Date(TIME_INTERVAL * CURRENT_TIME_BUCKET_ID).toString(),
        end_ts: (TIME_INTERVAL * CURRENT_TIME_BUCKET_ID) + (TIME_INTERVAL - 1),
        end_full: new Date((TIME_INTERVAL * CURRENT_TIME_BUCKET_ID) + (TIME_INTERVAL - 1)).toString(),
        availableTokens: parseInt(availableTokens),
        eventId: eventId
      };
      
      console.log('[Validator] 创建新的时间桶:', bucket);
      database.putItem('validator', bucket);
    } else {
      console.log('[Validator] 加载已有时间桶:', bucket);
    }
    
    // 返回QR码信息
    res.status(200).json({
      bucket: bucket,
      qrCode: bucket.last_code,
      message: 'QR码生成成功'
    });
    
  } catch (error) {
    console.error('[Validator] 生成QR码错误:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}

/**
 * 验证QR码并创建订单
 * POST /qr-code?eventId=ABC&token=xxx
 */
async function verifyQRCode(req, res) {
  try {
    console.log('[Validator] 验证QR码请求');
    
    // 检查参数
    if (!req.query || !req.query.eventId) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: '缺少eventId参数' 
      });
    }
    
    if (!req.query.token) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: '缺少token参数' 
      });
    }
    
    const eventId = req.query.eventId;
    const token = req.query.token;
    const userId = getUserId(req);
    
    console.log(`[Validator] 验证参数 - eventId: ${eventId}, token: ${token}, userId: ${userId}`);
    
    // 加载时间桶
    const CURRENT_TIME_BUCKET_ID = parseInt(Date.now() / TIME_INTERVAL);
    const bucketPK = `${eventId}-${CURRENT_TIME_BUCKET_ID}`;
    
    const bucket = await database.getItem('validator', { PK: bucketPK });
    
    if (!bucket) {
      console.log('[Validator] 未找到有效的时间桶');
      return res.status(400).json({ 
        error: 'Invalid Code', 
        message: '无效的验证码' 
      });
    }
    
    console.log('[Validator] 时间桶加载成功:', bucket);
    
    // 验证token
    if (token !== bucket.last_code) {
      console.log(`[Validator] Token不匹配: ${token} !== ${bucket.last_code}`);
      return res.status(400).json({ 
        error: 'Invalid Code', 
        message: '无效的验证码' 
      });
    }
    
    // 检查可用tokens
    if (bucket.availableTokens < 1) {
      console.log('[Validator] 没有剩余的tokens');
      return res.status(200).json({ 
        error: 'No Tokens', 
        message: '没有剩余的验证码' 
      });
    }
    
    // 减少token计数
    bucket.availableTokens--;
    await database.updateItem('validator', { PK: bucketPK }, { availableTokens: bucket.availableTokens });
    
    // 生成新订单ID
    const orderId = nanoid();
    
    console.log(`[Validator] 新订单创建 - orderId: ${orderId}`);
    
    // 发布事件到事件总线
    const eventDetail = {
      orderId,
      userId,
      eventId,
      Message: '通过QR码验证创建新订单',
      bucket
    };
    
    console.log('[Validator] 发布 Validator.NewOrder 事件');
    global.eventBus.emit('Validator.NewOrder', {
      'detail-type': 'Validator.NewOrder',
      source: 'presso',
      detail: eventDetail,
      time: new Date().toISOString()
    });
    
    // 返回成功响应
    res.status(200).json({
      orderId,
      message: '订单创建成功',
      availableTokens: bucket.availableTokens
    });
    
  } catch (error) {
    console.error('[Validator] 验证QR码错误:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}

module.exports = {
  getQRCode,
  verifyQRCode
};

