/**
 * 认证相关路由
 * 处理用户注册、登录、token刷新等操作
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { docClient, dynamoDb } = require('../utils/dynamodb');
const config = require('../config');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { hashPassword, verifyPassword } = require('../utils/password');
const { authMiddleware } = require('../middleware/auth');

/**
 * POST /auth/register
 * 用户注册
 * 请求体: { email, password, name }
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // 验证必填字段
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // 验证密码强度（至少6个字符）
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // 检查用户是否已存在
    const checkParams = {
      TableName: config.dynamodb.usersTable,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email
      }
    };

    const existingUser = await docClient.query(checkParams).promise();
    
    if (existingUser.Items && existingUser.Items.length > 0) {
      return res.status(409).json({ 
        error: 'User with this email already exists' 
      });
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建新用户
    const userId = uuidv4();
    const params = {
      TableName: config.dynamodb.usersTable,
      Item: {
        userId: userId,
        email: email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    };

    await docClient.put(params).promise();

    // 生成tokens
    const accessToken = generateAccessToken({ userId, email });
    const refreshToken = generateRefreshToken({ userId });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        userId,
        email,
        name: params.Item.name
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Error in POST /auth/register:', error);
    next(error);
  }
});

/**
 * POST /auth/login
 * 用户登录
 * 请求体: { email, password }
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 验证必填字段
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // 查找用户
    const params = {
      TableName: config.dynamodb.usersTable,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email
      }
    };

    const result = await docClient.query(params).promise();

    if (!result.Items || result.Items.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    const user = result.Items[0];

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // 生成tokens
    const accessToken = generateAccessToken({ 
      userId: user.userId, 
      email: user.email 
    });
    const refreshToken = generateRefreshToken({ 
      userId: user.userId 
    });

    res.json({
      message: 'Login successful',
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Error in POST /auth/login:', error);
    next(error);
  }
});

/**
 * POST /auth/refresh
 * 刷新访问令牌
 * 请求体: { refreshToken }
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Refresh token is required' 
      });
    }

    // 验证refresh token
    const payload = verifyRefreshToken(refreshToken);
    
    if (!payload) {
      return res.status(401).json({ 
        error: 'Invalid or expired refresh token' 
      });
    }

    // 查找用户
    const params = {
      TableName: config.dynamodb.usersTable,
      Key: {
        userId: payload.userId
      }
    };

    const result = await docClient.get(params).promise();

    if (!result.Item) {
      return res.status(401).json({ 
        error: 'User not found' 
      });
    }

    const user = result.Item;

    // 生成新的access token
    const accessToken = generateAccessToken({ 
      userId: user.userId, 
      email: user.email 
    });

    res.json({
      accessToken
    });
  } catch (error) {
    console.error('Error in POST /auth/refresh:', error);
    next(error);
  }
});

/**
 * GET /auth/me
 * 获取当前登录用户信息
 * 需要JWT认证
 */
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    // customerId已经在认证中间件中设置（从JWT解析出的userId）
    const userId = req.customerId;

    if (!userId || userId === 'default-customer-id') {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    const params = {
      TableName: config.dynamodb.usersTable,
      Key: {
        userId: userId
      }
    };

    const result = await docClient.get(params).promise();

    if (!result.Item) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    const user = result.Item;

    // 不返回密码
    delete user.password;

    res.json({
      user: user
    });
  } catch (error) {
    console.error('Error in GET /auth/me:', error);
    next(error);
  }
});

module.exports = router;

