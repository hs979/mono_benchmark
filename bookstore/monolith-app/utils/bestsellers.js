/**
 * 畅销榜更新工具函数
 * 用于更新Redis中的畅销书排行榜
 */

const redis = require('redis');
const { promisify } = require('util');
const config = require('../config');

let redisClient = null;
let zincrbyAsync = null;

/**
 * 初始化Redis客户端
 */
function initRedisClient() {
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
        console.log('Redis connected for bestsellers updates');
      });

      // 将Redis命令转换为Promise
      zincrbyAsync = promisify(redisClient.zincrby).bind(redisClient);
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      redisClient = null;
    }
  }
}

/**
 * 更新畅销榜
 * @param {string} bookId - 书籍ID
 * @param {number} quantity - 销售数量
 * @returns {Promise<boolean>} 是否更新成功
 */
async function updateBestSeller(bookId, quantity) {
  // 如果Redis未启用，直接返回
  if (!config.redis.enabled) {
    console.log('Redis not enabled, skipping bestseller update');
    return false;
  }

  // 初始化Redis客户端（如果还未初始化）
  if (!redisClient) {
    initRedisClient();
  }

  // 如果初始化失败，返回
  if (!redisClient) {
    console.warn('Redis client not available, skipping bestseller update');
    return false;
  }

  try {
    const key = 'TopBooks:AllTime';
    
    // 增加书籍的销量分数
    // ZINCRBY key increment member
    // 如果member不存在，会自动创建并设置分数为increment
    await zincrbyAsync(key, quantity, JSON.stringify(bookId));
    
    console.log(`Updated bestseller: bookId=${bookId}, quantity=${quantity}`);
    return true;
  } catch (error) {
    // 畅销榜更新失败不应该影响主业务
    console.error('Failed to update bestseller:', error);
    return false;
  }
}

/**
 * 批量更新畅销榜
 * @param {Array} books - 书籍数组，每个元素包含 {bookId, quantity}
 * @returns {Promise<Object>} 更新结果统计
 */
async function updateBestSellers(books) {
  if (!books || books.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const book of books) {
    const result = await updateBestSeller(book.bookId, book.quantity);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * 关闭Redis连接（用于应用关闭时）
 */
function closeRedisClient() {
  if (redisClient) {
    redisClient.quit();
    redisClient = null;
    zincrbyAsync = null;
  }
}

module.exports = {
  updateBestSeller,
  updateBestSellers,
  closeRedisClient
};



