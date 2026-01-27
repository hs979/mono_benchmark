/**
 * 购物车相关路由
 * 处理购物车的增删改查操作
 */

const express = require('express');
const router = express.Router();
const { docClient } = require('../utils/dynamodb');
const { dynamodb } = require('../config');
const authMiddleware = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * GET /cart
 * 列出当前用户购物车中的所有商品
 */
router.get('/', async (req, res, next) => {
  try {
    const params = {
      TableName: dynamodb.cartTable,
      KeyConditionExpression: 'customerId = :customerId',
      ExpressionAttributeValues: {
        ':customerId': req.customerId
      }
    };

    const data = await docClient.query(params).promise();
    res.json(data.Items);
  } catch (error) {
    console.error('Error in GET /cart:', error);
    next(error);
  }
});

/**
 * GET /cart/:bookId
 * 获取购物车中特定书籍的信息
 * 路径参数: bookId - 书籍ID
 */
router.get('/:bookId', async (req, res, next) => {
  try {
    const params = {
      TableName: dynamodb.cartTable,
      Key: {
        customerId: req.customerId,
        bookId: req.params.bookId
      }
    };

    const data = await docClient.get(params).promise();
    
    if (data.Item) {
      res.json(data.Item);
    } else {
      res.status(404).json({ error: 'Item not found in cart' });
    }
  } catch (error) {
    console.error('Error in GET /cart/:bookId:', error);
    next(error);
  }
});

/**
 * POST /cart
 * 添加书籍到购物车
 * 请求体: { bookId, quantity, price }
 */
router.post('/', async (req, res, next) => {
  try {
    const { bookId, quantity, price } = req.body;

    if (!bookId || !quantity || !price) {
      return res.status(400).json({ 
        error: 'Missing required fields: bookId, quantity, price' 
      });
    }

    const params = {
      TableName: dynamodb.cartTable,
      Item: {
        customerId: req.customerId,
        bookId: bookId,
        quantity: quantity,
        price: price
      }
    };

    await docClient.put(params).promise();
    res.json({ message: 'Item added to cart successfully' });
  } catch (error) {
    console.error('Error in POST /cart:', error);
    next(error);
  }
});

/**
 * PUT /cart
 * 更新购物车中书籍的数量
 * 请求体: { bookId, quantity }
 */
router.put('/', async (req, res, next) => {
  try {
    const { bookId, quantity } = req.body;

    if (!bookId || !quantity) {
      return res.status(400).json({ 
        error: 'Missing required fields: bookId, quantity' 
      });
    }

    const params = {
      TableName: dynamodb.cartTable,
      Key: {
        customerId: req.customerId,
        bookId: bookId
      },
      UpdateExpression: 'SET quantity = :quantity',
      ExpressionAttributeValues: {
        ':quantity': quantity
      },
      ReturnValues: 'ALL_NEW'
    };

    await docClient.update(params).promise();
    res.json({ message: 'Cart updated successfully' });
  } catch (error) {
    console.error('Error in PUT /cart:', error);
    next(error);
  }
});

/**
 * DELETE /cart
 * 从购物车中删除书籍
 * 请求体: { bookId }
 */
router.delete('/', async (req, res, next) => {
  try {
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ 
        error: 'Missing required field: bookId' 
      });
    }

    const params = {
      TableName: dynamodb.cartTable,
      Key: {
        customerId: req.customerId,
        bookId: bookId
      }
    };

    await docClient.delete(params).promise();
    res.json({ message: 'Item removed from cart successfully' });
  } catch (error) {
    console.error('Error in DELETE /cart:', error);
    next(error);
  }
});

module.exports = router;

