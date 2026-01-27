/**
 * JWT工具模块
 * 
 * 提供JWT令牌的生成和验证功能
 * 用于用户身份认证
 */

const jwt = require('jsonwebtoken');

// 从环境变量获取JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';

// JWT令牌有效期（24小时）
const JWT_EXPIRES_IN = '24h';

/**
 * 生成JWT令牌
 * @param {string} username - 用户名
 * @returns {string} JWT令牌
 */
function generateToken(username) {
  return jwt.sign(
    { username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * 验证JWT令牌
 * @param {string} token - JWT令牌
 * @returns {object|null} 解码后的令牌数据，验证失败返回null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('JWT验证失败:', error.message);
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken
};

