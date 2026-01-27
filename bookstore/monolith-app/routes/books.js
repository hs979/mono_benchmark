/**
 * 书籍相关路由
 * 处理书籍的查询操作
 */

const express = require('express');
const router = express.Router();
const { dynamodb, docClient } = require('../utils/dynamodb');
const { dynamodb: dynamodbConfig } = require('../config');
const authMiddleware = require('../middleware/auth');

const booksTable = dynamodbConfig.booksTable;

/**
 * GET /books
 * 列出所有书籍或按分类列出书籍
 * 查询参数: category (可选)
 */
router.get('/', async (req, res, next) => {
  try {
    const category = req.query.category;

    if (category) {
      // 按分类查询
      const params = {
        TableName: booksTable,
        IndexName: 'category-index',
        KeyConditionExpression: 'category = :category',
        ExpressionAttributeValues: {
          ':category': category
        }
      };

      const data = await docClient.query(params).promise();
      res.json(data.Items);
    } else {
      // 列出所有书籍
      const params = {
        TableName: booksTable
      };

      const data = await docClient.scan(params).promise();
      res.json(data.Items);
    }
  } catch (error) {
    console.error('Error in GET /books:', error);
    next(error);
  }
});

/**
 * GET /books/:id
 * 获取单本书的详细信息
 * 路径参数: id - 书籍ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const params = {
      TableName: booksTable,
      Key: {
        id: req.params.id
      }
    };

    const data = await docClient.get(params).promise();
    
    if (data.Item) {
      res.json(data.Item);
    } else {
      res.status(404).json({ error: 'Book not found' });
    }
  } catch (error) {
    console.error('Error in GET /books/:id:', error);
    next(error);
  }
});

module.exports = router;

