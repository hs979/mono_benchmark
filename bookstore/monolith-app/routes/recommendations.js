/**
 * 推荐系统路由
 * 基于社交关系图提供书籍推荐
 * 使用Neptune图数据库(可选)或返回模拟数据
 */

const express = require('express');
const router = express.Router();
const config = require('../config');

// Neptune Gremlin客户端(可选)
let gremlin = null;
let connection = null;

// 尝试初始化Neptune连接
function initNeptune() {
  if (config.neptune.enabled && config.neptune.endpoint) {
    try {
      gremlin = require('gremlin');
      const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
      const Graph = gremlin.structure.Graph;

      const neptuneEndpoint = `wss://${config.neptune.endpoint}:${config.neptune.port}/gremlin`;
      connection = new DriverRemoteConnection(neptuneEndpoint, {});
      const graph = new Graph();
      const g = graph.traversal().withRemote(connection);

      console.log('Neptune connection initialized');
      return g;
    } catch (error) {
      console.error('Failed to initialize Neptune:', error);
      return null;
    }
  }
  return null;
}

const g = initNeptune();

/**
 * GET /recommendations
 * 获取基于朋友购买历史的推荐书籍(前5名)
 */
router.get('/', async (req, res, next) => {
  try {
    // 如果Neptune未启用或未连接,返回模拟数据
    if (!config.neptune.enabled || !g) {
      console.warn('Neptune not available, returning mock data');
      return res.json([]);
    }

    // 使用固定的用户ID进行查询
    // 在实际应用中,应该使用req.customerId
    const userId = 'us-east-1:09048fa7-0587-4963-a17e-593196775c4a';

    // Gremlin查询: 获取用户朋友购买的书籍推荐
    const recommendations = await g.V(userId)
      .out('friendOf')
      .aggregate('friends')
      .barrier()
      .out('purchased')
      .dedup()
      .project('bookId', 'purchases', 'friendsPurchased')
        .by(gremlin.process.id)
        .by(gremlin.process.in_('purchased').where(gremlin.process.P.within('friends')).count())
        .by(gremlin.process.in_('purchased').where(gremlin.process.P.within('friends')).id().fold())
      .order()
        .by('purchases', gremlin.process.order.desc)
      .limit(5)
      .toList();

    res.json(recommendations);
  } catch (error) {
    console.error('Error in GET /recommendations:', error);
    // 如果查询出错,返回空数组
    res.json([]);
  }
});

/**
 * GET /recommendations/:bookId
 * 获取购买了特定书籍的朋友列表和购买次数
 * 路径参数: bookId - 书籍ID
 */
router.get('/:bookId', async (req, res, next) => {
  try {
    const bookId = req.params.bookId;

    // 如果Neptune未启用或未连接,返回模拟数据
    if (!config.neptune.enabled || !g) {
      console.warn('Neptune not available, returning mock data');
      return res.json({
        friendsPurchased: [],
        purchased: 0
      });
    }

    // Gremlin查询: 获取购买了该书的朋友
    const result = await g.V(bookId)
      .project('friendsPurchased', 'purchased')
        .by(gremlin.process.in_('purchased')
          .dedup()
          .where(gremlin.process.id().is(gremlin.process.P.neq(bookId)))
          .id()
          .fold())
        .by(gremlin.process.in_('purchased').count())
      .toList();

    if (result && result.length > 0) {
      res.json(result[0]);
    } else {
      res.json({
        friendsPurchased: [],
        purchased: 0
      });
    }
  } catch (error) {
    console.error('Error in GET /recommendations/:bookId:', error);
    // 如果查询出错,返回默认值
    res.json({
      friendsPurchased: [],
      purchased: 0
    });
  }
});

module.exports = router;

