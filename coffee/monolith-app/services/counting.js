
/**
 * 计数服务
 * 负责生成唯一的订单号
 */

const database = require('./database');

/**
 * 获取订单ID
 */
function getOrderId(eventId) {
  const counterKey = `orderID-${eventId}`;
  const orderNumber = database.incrementCounter('counting', { PK: counterKey });
  
  console.log(`[Counting] 生成订单号: ${orderNumber} (事件: ${eventId})`);
  
  return orderNumber;
}

/**
 * 重置订单ID
 */
function resetOrderId(eventId) {
  const counterKey = `orderID-${eventId}`;
  
  database.updateItem('counting', { PK: counterKey }, {
    IDvalue: 0
  });
  
  console.log(`[Counting] 重置订单号计数器 (事件: ${eventId})`);
}

module.exports = {
  getOrderId,
  resetOrderId
};

