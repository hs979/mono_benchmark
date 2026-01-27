/**
 * JWT工具函数
 * 用于生成和验证JSON Web Tokens
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * 生成访问令牌(Access Token)
 * @param {Object} payload - 要编码到token中的数据
 * @param {string} payload.userId - 用户ID
 * @param {string} payload.email - 用户邮箱
 * @returns {string} JWT token
 */
function generateAccessToken(payload) {
  return jwt.sign(
    payload,
    config.jwt.secret,
    { 
      expiresIn: config.jwt.accessTokenExpiry,
      issuer: 'bookstore-api'
    }
  );
}

/**
 * 生成刷新令牌(Refresh Token)
 * @param {Object} payload - 要编码到token中的数据
 * @param {string} payload.userId - 用户ID
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(payload) {
  return jwt.sign(
    payload,
    config.jwt.refreshSecret,
    { 
      expiresIn: config.jwt.refreshTokenExpiry,
      issuer: 'bookstore-api'
    }
  );
}

/**
 * 验证访问令牌
 * @param {string} token - JWT token
 * @returns {Object|null} 解码后的payload，失败返回null
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret, {
      issuer: 'bookstore-api'
    });
  } catch (error) {
    console.error('Access token verification failed:', error.message);
    return null;
  }
}

/**
 * 验证刷新令牌
 * @param {string} token - JWT refresh token
 * @returns {Object|null} 解码后的payload，失败返回null
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, config.jwt.refreshSecret, {
      issuer: 'bookstore-api'
    });
  } catch (error) {
    console.error('Refresh token verification failed:', error.message);
    return null;
  }
}

/**
 * 从请求头中提取Bearer token
 * @param {string} authHeader - Authorization请求头
 * @returns {string|null} token字符串，失败返回null
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader
};

