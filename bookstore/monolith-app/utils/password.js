/**
 * 密码加密工具函数
 * 使用bcrypt进行密码哈希和验证
 */

const bcrypt = require('bcryptjs');

/**
 * 加密密码
 * @param {string} password - 明文密码
 * @returns {Promise<string>} 加密后的密码哈希
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * 验证密码
 * @param {string} password - 明文密码
 * @param {string} hashedPassword - 存储的密码哈希
 * @returns {Promise<boolean>} 密码是否匹配
 */
async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

module.exports = {
  hashPassword,
  verifyPassword
};

