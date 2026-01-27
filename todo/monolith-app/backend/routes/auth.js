/**
 * 用户认证路由
 * 
 * 处理用户注册和登录功能
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { docClient, tables } = require('../config/db');
const { generateToken } = require('../utils/jwt');

const router = express.Router();

/**
 * POST /auth/register
 * 用户注册接口
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({
        message: '用户名和密码不能为空'
      });
    }

    // 密码强度验证
    if (password.length < 6) {
      return res.status(400).json({
        message: '密码长度至少为6个字符'
      });
    }

    // 检查用户是否已存在
    const checkParams = {
      TableName: tables.USER_TABLE,
      Key: { username }
    };

    const existingUser = await docClient.get(checkParams).promise();
    
    if (existingUser.Item) {
      return res.status(400).json({
        message: '用户名已被使用，请选择其他用户名'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户记录
    const user = {
      username,
      password: hashedPassword,
      email: email || '',
      createdAt: new Date().toISOString()
    };

    const putParams = {
      TableName: tables.USER_TABLE,
      Item: user
    };

    await docClient.put(putParams).promise();

    // 生成JWT令牌
    const token = generateToken(username);

    res.status(201).json({
      message: '注册成功',
      token,
      username
    });

  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      message: '注册失败，请稍后重试',
      error: error.message
    });
  }
});

/**
 * POST /auth/login
 * 用户登录接口
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({
        message: '用户名和密码不能为空'
      });
    }

    // 查询用户
    const params = {
      TableName: tables.USER_TABLE,
      Key: { username }
    };

    const result = await docClient.get(params).promise();
    const user = result.Item;

    // 用户不存在
    if (!user) {
      return res.status(401).json({
        message: '用户名或密码错误'
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: '用户名或密码错误'
      });
    }

    // 生成JWT令牌
    const token = generateToken(username);

    res.json({
      message: '登录成功',
      token,
      username
    });

  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      message: '登录失败，请稍后重试',
      error: error.message
    });
  }
});

module.exports = router;

