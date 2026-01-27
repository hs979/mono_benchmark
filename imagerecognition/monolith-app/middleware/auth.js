/**
 * 认证中间件模块
 * 负责JWT token的生成、验证和用户身份检查
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// JWT密钥（生产环境应该使用环境变量）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = '7d'; // Token有效期7天

/**
 * 生成JWT Token
 * @param {Object} user - 用户信息
 * @returns {string} JWT Token
 */
function generateToken(user) {
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * 验证JWT Token
 * @param {string} token - JWT Token
 * @returns {Object|null} 解码后的用户信息，失败返回null
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * 哈希密码
 * @param {string} password - 明文密码
 * @returns {Promise<string>} 哈希后的密码
 */
async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

/**
 * 比较密码
 * @param {string} password - 明文密码
 * @param {string} hashedPassword - 哈希后的密码
 * @returns {Promise<boolean>} 密码是否匹配
 */
async function comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
}

/**
 * 认证中间件 - 验证请求中的JWT Token
 * 使用方法：在需要认证的路由上添加此中间件
 */
function authMiddleware(req, res, next) {
    try {
        // 从请求头中获取token
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: '未提供认证令牌'
            });
        }

        const token = authHeader.substring(7); // 移除 "Bearer " 前缀
        
        // 验证token
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                error: '无效的认证令牌'
            });
        }

        // 将用户信息附加到请求对象上
        req.user = decoded;
        next();
        
    } catch (error) {
        console.error('认证中间件错误:', error);
        return res.status(500).json({
            success: false,
            error: '认证过程出错'
        });
    }
}

/**
 * 可选的认证中间件 - 如果有token就验证，没有也放行
 * 用于某些既可以匿名访问，也可以登录访问的路由
 */
function optionalAuthMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);
            
            if (decoded) {
                req.user = decoded;
            }
        }
        
        next();
        
    } catch (error) {
        console.error('可选认证中间件错误:', error);
        next();
    }
}

module.exports = {
    generateToken,
    verifyToken,
    hashPassword,
    comparePassword,
    authMiddleware,
    optionalAuthMiddleware
};

