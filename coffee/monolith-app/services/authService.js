
/**
 * 用户认证服务
 * 负责用户注册、登录和JWT token管理
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const database = require('./database');

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * 生成JWT token
 */
function generateToken(userId, username, role = 'user') {
  return jwt.sign(
    {
      userId: userId,
      username: username,
      role: role,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * 验证JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * 用户注册
 */
async function register(req, res) {
  try {
    const { username, password, role } = req.body;
    
    // 验证输入
    if (!username || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '用户名和密码不能为空'
      });
    }
    
    if (username.length < 3) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '用户名长度至少为3个字符'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '密码长度至少为6个字符'
      });
    }
    
    // 检查用户是否已存在
    const existingUser = await database.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: '用户名已存在'
      });
    }
    
    // 加密密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 创建用户
    const user = await database.createUser({
      username: username,
      passwordHash: passwordHash,
      role: role || 'user'
    });
    
    // 生成token
    const token = generateToken(user.userId, user.username, user.role);
    
    console.log(`[AuthService] 用户注册成功: ${username}`);
    
    res.status(201).json({
      message: '注册成功',
      token: token,
      user: {
        userId: user.userId,
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('[AuthService] 注册错误:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '注册失败，请稍后重试'
    });
  }
}

/**
 * 用户登录
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;
    
    // 验证输入
    if (!username || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '用户名和密码不能为空'
      });
    }
    
    // 查找用户
    const user = await database.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '用户名或密码错误'
      });
    }
    
    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '用户名或密码错误'
      });
    }
    
    // 生成token
    const token = generateToken(user.userId, user.username, user.role);
    
    console.log(`[AuthService] 用户登录成功: ${username}`);
    
    res.status(200).json({
      message: '登录成功',
      token: token,
      user: {
        userId: user.userId,
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('[AuthService] 登录错误:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '登录失败，请稍后重试'
    });
  }
}

/**
 * 验证JWT token中间件
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: '缺少认证token'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Token无效或已过期'
    });
  }

  // 将解码的用户信息附加到请求对象
  req.user = {
    userId: decoded.userId,
    username: decoded.username,
    role: decoded.role
  };

  next();
}

/**
 * 检查是否为管理员中间件
 */
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      error: 'Forbidden',
      message: '需要管理员权限'
    });
  }
}

/**
 * 获取用户ID（从JWT token）
 */
function getUserId(req) {
  return req.user ? req.user.userId : null;
}

/**
 * 获取用户名（从JWT token）
 */
function getUsername(req) {
  return req.user ? req.user.username : null;
}

/**
 * 检查是否为管理员（从JWT token）
 */
function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

/**
 * 获取当前用户信息
 */
function getCurrentUser(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '未登录'
      });
    }
    
    res.status(200).json({
      user: {
        userId: req.user.userId,
        username: req.user.username,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('[AuthService] 获取用户信息错误:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '获取用户信息失败'
    });
  }
}

module.exports = {
  register,
  login,
  authenticateToken,
  requireAdmin,
  getUserId,
  getUsername,
  isAdmin,
  getCurrentUser,
  generateToken,
  verifyToken,
  JWT_SECRET
};

