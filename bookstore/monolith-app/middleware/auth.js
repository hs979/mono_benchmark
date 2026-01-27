/**
 * 认证中间件
 * 支持JWT认证和开发模式
 */

const config = require('../config');
const { verifyAccessToken, extractTokenFromHeader } = require('../utils/jwt');

/**
 * JWT认证中间件
 * 验证Bearer token并提取用户信息
 * 
 * 支持两种模式：
 * 1. 生产模式（AUTH_DEV_MODE=false）：必须提供有效的JWT token
 * 2. 开发模式（AUTH_DEV_MODE=true）：允许使用x-customer-id请求头跳过验证
 */
function authMiddleware(req, res, next) {
  // 开发模式：允许使用x-customer-id请求头
  if (config.auth.devMode) {
    const customerId = req.headers['x-customer-id'];
    if (customerId) {
      req.customerId = customerId;
      req.isDevMode = true;
      return next();
    }
  }

  // 获取Authorization请求头
  const authHeader = req.headers.authorization;
  
  // 提取token
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    // 如果是开发模式且没有提供token，使用默认用户ID
    if (config.auth.devMode) {
      req.customerId = 'default-customer-id';
      req.isDevMode = true;
      return next();
    }
    
    // 生产模式必须提供token
    return res.status(401).json({ 
      error: 'Authentication required. Please provide a valid Bearer token.' 
    });
  }

  // 验证token
  const payload = verifyAccessToken(token);
  
  if (!payload) {
    return res.status(401).json({ 
      error: 'Invalid or expired token' 
    });
  }

  // 将用户信息添加到请求对象
  req.customerId = payload.userId;
  req.userEmail = payload.email;
  req.isDevMode = false;

  next();
}

/**
 * 可选认证中间件
 * 如果提供了token则验证，否则继续执行（用于公开接口）
 */
function optionalAuthMiddleware(req, res, next) {
  // 开发模式
  if (config.auth.devMode) {
    const customerId = req.headers['x-customer-id'];
    if (customerId) {
      req.customerId = customerId;
      req.isDevMode = true;
    }
  }

  // 获取Authorization请求头
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);
  
  if (token) {
    // 验证token
    const payload = verifyAccessToken(token);
    
    if (payload) {
      req.customerId = payload.userId;
      req.userEmail = payload.email;
      req.isDevMode = false;
    }
  }

  // 无论是否有token都继续执行
  next();
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware
};

