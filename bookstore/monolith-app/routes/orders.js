/**
 * 订单相关路由
 * 处理订单的查询和创建(结账)操作
 */

const express = require('express');
const router = express.Router();
const { docClient } = require('../utils/dynamodb');
const { dynamodb } = require('../config');
const authMiddleware = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { updateBestSellers } = require('../utils/bestsellers');

/**
 * GET /orders
 * 列出当前用户的所有订单
 */
router.get('/', async (req, res, next) => {
  try {
    const params = {
      TableName: dynamodb.ordersTable,
      KeyConditionExpression: 'customerId = :customerId',
      ExpressionAttributeValues: {
        ':customerId': req.customerId
      }
    };

    const data = await docClient.query(params).promise();
    res.json(data.Items);
  } catch (error) {
    console.error('Error in GET /orders:', error);
    next(error);
  }
});

/**
 * POST /orders
 * 创建新订单(结账流程)
 * 请求体: { books: [{ bookId, price, quantity }, ...] }
 * 
 * 该操作会:
 * 1. 创建新订单记录
 * 2. 清空购物车中已结账的商品
 */
router.post('/', async (req, res, next) => {
  try {
    const { books } = req.body;

    if (!books || !Array.isArray(books) || books.length === 0) {
      return res.status(400).json({ 
        error: 'Missing or invalid books array' 
      });
    }

    // 生成订单ID
    const orderId = uuidv4();

    // 1. 创建订单
    const orderParams = {
      TableName: dynamodb.ordersTable,
      Item: {
        customerId: req.customerId,
        orderId: orderId,
        orderDate: Date.now(),
        books: books
      }
    };

    await docClient.put(orderParams).promise();

    // 2. 从购物车中删除已结账的商品
    const deletePromises = books.map(book => {
      const deleteParams = {
        TableName: dynamodb.cartTable,
        Key: {
          customerId: req.customerId,
          bookId: book.bookId
        }
      };
      return docClient.delete(deleteParams).promise();
    });

    await Promise.all(deletePromises);

    // 3. 同步更新畅销榜（异步执行，不影响主流程）
    // 将更新逻辑放在后台执行，不阻塞响应
    updateBestSellers(books).then(result => {
      if (result.success > 0) {
        console.log(`Bestseller updated: ${result.success} books`);
      }
      if (result.failed > 0) {
        console.warn(`Bestseller update failed for ${result.failed} books`);
      }
    }).catch(error => {
      // 畅销榜更新失败不应影响订单创建
      console.error('Error updating bestsellers:', error);
    });

    res.json({ 
      message: 'Order created successfully',
      orderId: orderId
    });
  } catch (error) {
    console.error('Error in POST /orders:', error);
    next(error);
  }
});

module.exports = router;

