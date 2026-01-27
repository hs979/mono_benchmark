/*! 
 * JWT认证示例 - 如果需要真正的JWT token认证，可以参考此实现
 * 注意：这不是当前应用使用的认证方式，仅供参考
 */

const jwt = require('jsonwebtoken');

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

/**
 * 生成JWT token
 */
function generateToken(userId, role = 'user') {
  return jwt.sign(
    {
      userId: userId,
      role: role,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * 验证JWT token中间件
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: '缺少认证token' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden', message: 'Token无效或已过期' });
    }

    // 将解码的用户信息附加到请求对象
    req.user = {
      userId: decoded.userId,
      role: decoded.role
    };

    next();
  });
}

/**
 * 检查是否为管理员中间件
 */
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden', message: '需要管理员权限' });
  }
}

/**
 * 获取用户ID（从JWT token）
 */
function getUserId(req) {
  return req.user ? req.user.userId : null;
}

/**
 * 检查是否为管理员（从JWT token）
 */
function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

// 使用示例：
// 
// // 登录端点（生成token）
// app.post('/login', (req, res) => {
//   const { username, password } = req.body;
//   
//   // 验证用户名密码...
//   
//   const token = generateToken(userId, role);
//   res.json({ token });
// });
//
// // 需要认证的端点
// app.get('/qr-code', authenticateToken, requireAdmin, (req, res) => {
//   // 此时 req.user 包含已验证的用户信息
// });

module.exports = {
  generateToken,
  authenticateToken,
  requireAdmin,
  getUserId,
  isAdmin,
  JWT_SECRET
};



