/**
 * 认证中间件
 * 
 * 验证请求中的JWT令牌
 * 保护需要登录才能访问的API接口
 */

const { verifyToken } = require('../utils/jwt');

/**
 * JWT认证中间件
 * 从请求头中提取并验证JWT令牌
 */
function authenticateToken(req, res, next) {
  // 从Authorization头获取令牌
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader;

  // 如果没有令牌，返回401未授权
  if (!token) {
    return res.status(401).json({
      message: '未提供认证令牌，请先登录'
    });
  }

  // 验证令牌
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({
      message: '认证令牌无效或已过期，请重新登录'
    });
  }

  // 将用户信息附加到请求对象上，供后续路由使用
  req.user = {
    username: decoded.username
  };

  next();
}

module.exports = {
  authenticateToken
};

