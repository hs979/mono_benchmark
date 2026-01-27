/**
 * 认证路由模块
 * 处理用户注册、登录等认证相关的API
 */

const express = require('express');
const router = express.Router();
const database = require('../database');  // 使用新的数据库入口
const { generateToken, hashPassword, comparePassword, authMiddleware } = require('../middleware/auth');

/**
 * POST /api/auth/register - 用户注册
 * Body: { username, email, password }
 */
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 验证输入
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: '请提供用户名、邮箱和密码'
            });
        }

        // 验证用户名长度
        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({
                success: false,
                error: '用户名长度必须在3-30个字符之间'
            });
        }

        // 验证密码长度
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: '密码长度至少6个字符'
            });
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: '邮箱格式不正确'
            });
        }

        // 哈希密码
        const hashedPassword = await hashPassword(password);

        // 创建用户
        const user = await database.createUser({
            username,
            email,
            password: hashedPassword
        });

        // 生成Token
        const token = generateToken(user);

        console.log(`新用户注册成功: ${username}`);

        res.status(201).json({
            success: true,
            message: '注册成功',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                },
                token
            }
        });

    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({
            success: false,
            error: error.message || '注册失败'
        });
    }
});

/**
 * POST /api/auth/login - 用户登录
 * Body: { username, password }
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 验证输入
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: '请提供用户名和密码'
            });
        }

        // 查找用户
        const user = await database.findUserByUsername(username);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: '用户名或密码错误'
            });
        }

        // 验证密码
        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: '用户名或密码错误'
            });
        }

        // 生成Token
        const token = generateToken(user);

        console.log(`用户登录成功: ${username}`);

        res.json({
            success: true,
            message: '登录成功',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                },
                token
            }
        });

    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({
            success: false,
            error: error.message || '登录失败'
        });
    }
});

/**
 * GET /api/auth/me - 获取当前登录用户信息
 * 需要认证
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await database.findUserById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }

        res.json({
            success: true,
            data: {
                user
            }
        });

    } catch (error) {
        console.error('获取用户信息失败:', error);
        res.status(500).json({
            success: false,
            error: error.message || '获取用户信息失败'
        });
    }
});

/**
 * POST /api/auth/logout - 用户登出
 * 需要认证（客户端需要删除token）
 */
router.post('/logout', authMiddleware, (req, res) => {
    // JWT是无状态的，登出主要是客户端删除token
    // 服务端只是记录日志
    console.log(`用户登出: ${req.user.username}`);
    
    res.json({
        success: true,
        message: '登出成功'
    });
});

module.exports = router;

