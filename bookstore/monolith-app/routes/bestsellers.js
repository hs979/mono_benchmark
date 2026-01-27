/**
 * 畅销书路由
 * 处理畅销书榜单的查询
 * 使用Redis存储和查询畅销书数据
 */

const express = require('express');
const router = express.Router();
const redis = require('redis');
const { promisify } = require('util');
const config = require('../config');

let redisClient = null;
let zrevrangeAsync = null;

// 初始化Redis客户端
function initRedis() {
  if (config.redis.enabled && !redisClient) {
    try {
      redisClient = redis.createClient({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('Redis connection refused');
            return new Error('Redis server refused connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      redisClient.on('error', (err) => {
        console.error('Redis error:', err);
      });

      redisClient.on('connect', () => {
        console.log('Redis connected successfully');
      });

      // 将Redis命令转换为Promise
      zrevrangeAsync = promisify(redisClient.zrevrange).bind(redisClient);
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      redisClient = null;
    }
  }
}

// 初始化Redis
initRedis();

/**
 * GET /bestsellers
 * 获取畅销书榜单(前20名)
 */
router.get('/', async (req, res, next) => {
  try {
    // 如果Redis未启用或未连接,返回模拟数据
    if (!config.redis.enabled || !redisClient) {
      console.warn('Redis not available, returning mock data');
      return res.json([]);
    }

    const key = 'TopBooks:AllTime';
    
    // 获取排行榜前20名
    // zrevrange按分数从高到低返回成员
    const members = await zrevrangeAsync(key, 0, 19);
    
    // 清理JSON格式的bookId
    const bookIds = members.map(member => {
      try {
        return JSON.parse(member);
      } catch (e) {
        return member;
      }
    });

    res.json(bookIds);
  } catch (error) {
    console.error('Error in GET /bestsellers:', error);
    // 如果Redis出错,返回空数组而不是报错
    res.json([]);
  }
});

module.exports = router;

