/**
 * Todo业务逻辑路由
 * 
 * - getAllTodo: 获取所有待办事项
 * - getTodo: 获取单个待办事项
 * - addTodo: 添加新待办事项
 * - updateTodo: 更新待办事项
 * - completeTodo: 标记待办事项为已完成
 * - deleteTodo: 删除待办事项
 */

const express = require('express');
const { v1: uuidv1 } = require('uuid');
const { docClient, tables } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 所有Todo路由都需要认证
router.use(authenticateToken);

/**
 * GET /api/item
 * 获取当前用户的所有待办事项
 */
router.get('/item', async (req, res) => {
  try {
    const username = req.user.username;

    // 查询当前用户的所有待办事项
    const params = {
      TableName: tables.TODO_TABLE,
      KeyConditionExpression: "#username = :username",
      ExpressionAttributeNames: {
        "#username": "cognito-username"
      },
      ExpressionAttributeValues: {
        ":username": username
      }
    };

    const result = await docClient.query(params).promise();

    res.json({
      Items: result.Items || [],
      Count: result.Count || 0
    });

  } catch (error) {
    console.error('获取待办事项列表失败:', error);
    res.status(400).json({
      message: error.message
    });
  }
});

/**
 * GET /api/item/:id
 * 获取单个待办事项的详细信息
 */
router.get('/item/:id', async (req, res) => {
  try {
    const username = req.user.username;
    const { id } = req.params;

    // 验证ID格式
    if (!id || !/^[\w-]+$/.test(id)) {
      return res.status(400).json({
        message: 'Invalid request: 无效的待办事项ID'
      });
    }

    // 查询指定的待办事项
    const params = {
      TableName: tables.TODO_TABLE,
      Key: {
        "cognito-username": username,
        id: id
      }
    };

    const result = await docClient.get(params).promise();

    if (!result.Item) {
      return res.status(404).json({
        message: '未找到该待办事项'
      });
    }

    res.json(result);

  } catch (error) {
    console.error('获取待办事项失败:', error);
    res.status(400).json({
      message: error.message
    });
  }
});

/**
 * POST /api/item
 * 创建新的待办事项
 */
router.post('/item', async (req, res) => {
  try {
    const username = req.user.username;
    const { item, completed } = req.body;

    // 验证输入
    if (!item) {
      return res.status(400).json({
        message: 'Invalid request: 待办事项内容不能为空'
      });
    }

    // 生成唯一ID和时间戳
    const now = new Date().toISOString();
    const todoItem = {
      "cognito-username": username,
      id: uuidv1(),
      item: item,
      completed: completed || false,
      creation_date: now,
      lastupdate_date: now
    };

    // 保存到数据库
    const params = {
      TableName: tables.TODO_TABLE,
      Item: todoItem
    };

    await docClient.put(params).promise();

    res.json({
      message: '待办事项创建成功',
      item: todoItem
    });

  } catch (error) {
    console.error('创建待办事项失败:', error);
    res.status(400).json({
      message: error.message
    });
  }
});

/**
 * PUT /api/item/:id
 * 更新待办事项的内容和状态
 */
router.put('/item/:id', async (req, res) => {
  try {
    const username = req.user.username;
    const { id } = req.params;
    const { item, completed } = req.body;

    // 验证输入
    if (!id || !/^[\w-]+$/.test(id)) {
      return res.status(400).json({
        message: 'Invalid request: 无效的待办事项ID'
      });
    }

    if (item === undefined || completed === undefined) {
      return res.status(400).json({
        message: 'Invalid request: 缺少必需的字段'
      });
    }

    // 更新待办事项
    const params = {
      TableName: tables.TODO_TABLE,
      Key: {
        "cognito-username": username,
        id: id
      },
      UpdateExpression: "set completed = :c, lastupdate_date = :lud, #i = :i",
      ExpressionAttributeNames: {
        "#i": "item"
      },
      ExpressionAttributeValues: {
        ":c": completed,
        ":lud": new Date().toISOString(),
        ":i": item
      },
      ReturnValues: "ALL_NEW"
    };

    const result = await docClient.update(params).promise();

    res.json({
      message: '待办事项更新成功',
      Attributes: result.Attributes
    });

  } catch (error) {
    console.error('更新待办事项失败:', error);
    res.status(400).json({
      message: error.message
    });
  }
});

/**
 * POST /api/item/:id/done
 * 标记待办事项为已完成
 */
router.post('/item/:id/done', async (req, res) => {
  try {
    const username = req.user.username;
    const { id } = req.params;

    // 验证ID格式
    if (!id || !/^[\w-]+$/.test(id)) {
      return res.status(400).json({
        message: 'Invalid request: 无效的待办事项ID'
      });
    }

    // 更新完成状态
    const params = {
      TableName: tables.TODO_TABLE,
      Key: {
        "cognito-username": username,
        id: id
      },
      UpdateExpression: "set #field = :value",
      ExpressionAttributeNames: {
        "#field": "completed"
      },
      ExpressionAttributeValues: {
        ":value": true
      },
      ReturnValues: "ALL_NEW"
    };

    const result = await docClient.update(params).promise();

    res.json({
      message: '待办事项已标记为完成',
      Attributes: result.Attributes
    });

  } catch (error) {
    console.error('标记待办事项完成失败:', error);
    res.status(400).json({
      message: error.message
    });
  }
});

/**
 * DELETE /api/item/:id
 * 删除指定的待办事项
 */
router.delete('/item/:id', async (req, res) => {
  try {
    const username = req.user.username;
    const { id } = req.params;

    // 验证ID格式
    if (!id || !/^[\w-]+$/.test(id)) {
      return res.status(400).json({
        message: 'Invalid request: 无效的待办事项ID'
      });
    }

    // 删除待办事项
    const params = {
      TableName: tables.TODO_TABLE,
      Key: {
        "cognito-username": username,
        id: id
      }
    };

    await docClient.delete(params).promise();

    res.json({
      message: '待办事项删除成功'
    });

  } catch (error) {
    console.error('删除待办事项失败:', error);
    res.status(400).json({
      message: error.message
    });
  }
});

module.exports = router;

