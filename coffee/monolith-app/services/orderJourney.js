
/**
 * 订单旅程服务
 * 负责记录订单的完整旅程，生成订单历史记录和HTML展示页面
 */

const database = require('./database');

/**
 * 注册事件监听器
 */
function registerListeners(eventBus) {
  // 监听所有订单相关事件
  eventBus.on('Validator.NewOrder', (event) => recordEvent(event));
  eventBus.on('OrderProcessor.WorkflowStarted', (event) => recordEvent(event));
  eventBus.on('OrderProcessor.WaitingCompletion', (event) => recordEvent(event));
  eventBus.on('OrderProcessor.OrderTimeOut', (event) => recordEvent(event));
  eventBus.on('OrderProcessor.ShopUnavailable', (event) => recordEvent(event));
  eventBus.on('OrderProcessor.orderFinished', (event) => recordEvent(event));
  eventBus.on('OrderManager.WaitingCompletion', (event) => recordEvent(event));
  eventBus.on('OrderManager.OrderCOMPLETED', (event) => recordEvent(event));
  eventBus.on('OrderManager.OrderCANCELLED', (event) => recordEvent(event));
  eventBus.on('OrderManager.MakeOrder', (event) => recordEvent(event));
  
  console.log('[OrderJourney] 事件监听器已注册');
}

/**
 * 记录订单事件
 */
function recordEvent(event) {
  try {
    const orderId = event.detail?.orderId;
    
    if (!orderId) {
      console.log('[OrderJourney] 事件中没有orderId，跳过记录');
      return;
    }
    
    console.log(`[OrderJourney] 记录事件: ${event['detail-type']} for order ${orderId}`);
    
    // 创建事件记录
    const eventRecord = {
      PK: orderId,
      SK: event.time || new Date().toISOString(),
      detailType: event['detail-type'],
      orderDetails: JSON.stringify(event.detail),
      timestamp: Date.now()
    };
    
    // 存储到订单旅程事件表
    database.putItem('orderJourneyEvents', eventRecord);
    
    console.log(`[OrderJourney] 事件已记录: ${orderId}`);
    
  } catch (error) {
    console.error('[OrderJourney] 记录事件错误:', error);
  }
}

/**
 * 获取订单的完整旅程
 */
function getOrderJourney(orderId) {
  console.log(`[OrderJourney] 获取订单旅程: ${orderId}`);
  
  const events = database.query('orderJourneyEvents', {
    PK: orderId
  });
  
  // 按时间排序
  events.sort((a, b) => new Date(a.SK) - new Date(b.SK));
  
  console.log(`[OrderJourney] 找到 ${events.length} 个事件`);
  
  return events;
}

/**
 * 生成订单旅程HTML
 */
function generateOrderJourneyHTML(orderId) {
  console.log(`[OrderJourney] 生成订单旅程HTML: ${orderId}`);
  
  const events = getOrderJourney(orderId);
  
  if (events.length === 0) {
    return '<html><body><h1>未找到订单旅程</h1></body></html>';
  }
  
  // 生成HTML
  let html = [
    '<html>',
    '<head>',
    '<meta charset="UTF-8">',
    '<title>订单旅程 - ' + orderId + '</title>',
    '<style>',
    'body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }',
    'h1 { color: #333; text-align: center; }',
    '.timeline { position: relative; padding: 20px 0; }',
    '.event { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #007bff; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }',
    '.event h2 { margin-top: 0; color: #007bff; font-size: 18px; }',
    '.event .time { color: #666; font-size: 14px; margin-bottom: 10px; }',
    '.event .message { color: #333; line-height: 1.6; }',
    '.event.completed { border-left-color: #28a745; }',
    '.event.completed h2 { color: #28a745; }',
    '.event.cancelled { border-left-color: #dc3545; }',
    '.event.cancelled h2 { color: #dc3545; }',
    '.event.timeout { border-left-color: #ffc107; }',
    '.event.timeout h2 { color: #ffc107; }',
    '.summary { background: white; padding: 20px; margin-bottom: 20px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }',
    '</style>',
    '</head>',
    '<body>',
    '<h1>☕ presso 订单旅程</h1>',
    '<div class="summary">',
    '<h3>订单ID: ' + orderId + '</h3>',
    '<p>事件总数: ' + events.length + '</p>',
    '<p>创建时间: ' + formatTime(events[0].SK) + '</p>',
    '<p>最后更新: ' + formatTime(events[events.length - 1].SK) + '</p>',
    '</div>',
    '<div class="timeline">'
  ];
  
  // 添加每个事件
  for (const event of events) {
    const eventDetails = JSON.parse(event.orderDetails);
    const eventType = parseEventType(event.detailType);
    const eventClass = getEventClass(event.detailType);
    
    html.push(
      '<div class="event ' + eventClass + '">',
      '<h2>' + eventType + '</h2>',
      '<div class="time">⏰ ' + formatTime(event.SK) + '</div>',
      '<div class="message">' + (eventDetails.Message || '事件已记录') + '</div>',
      '</div>'
    );
  }
  
  html.push(
    '</div>',
    '</body>',
    '</html>'
  );
  
  return html.join('\n');
}

/**
 * 解析事件类型为友好的名称
 */
function parseEventType(detailType) {
  const typeMap = {
    'Validator.NewOrder': '✨ 新订单创建',
    'OrderProcessor.WorkflowStarted': '🚀 工作流启动',
    'OrderProcessor.WaitingCompletion': '⏳ 等待完成',
    'OrderProcessor.OrderTimeOut': '⏰ 订单超时',
    'OrderProcessor.ShopUnavailable': '🚫 商店不可用',
    'OrderProcessor.orderFinished': '🏁 订单完成',
    'OrderManager.WaitingCompletion': '📝 订单详情已提交',
    'OrderManager.OrderCOMPLETED': '✅ 订单已完成',
    'OrderManager.OrderCANCELLED': '❌ 订单已取消',
    'OrderManager.MakeOrder': '👨‍🍳 咖啡师已认领'
  };
  
  return typeMap[detailType] || detailType;
}

/**
 * 获取事件的CSS类
 */
function getEventClass(detailType) {
  if (detailType.includes('COMPLETED') || detailType.includes('orderFinished')) {
    return 'completed';
  }
  if (detailType.includes('CANCELLED')) {
    return 'cancelled';
  }
  if (detailType.includes('TimeOut') || detailType.includes('Unavailable')) {
    return 'timeout';
  }
  return '';
}

/**
 * 格式化时间
 */
function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 获取订单统计信息
 */
function getOrderStats() {
  const allEvents = database.scan('orderJourneyEvents', {});
  
  // 按订单ID分组
  const orderMap = new Map();
  
  for (const event of allEvents) {
    if (!orderMap.has(event.PK)) {
      orderMap.set(event.PK, []);
    }
    orderMap.get(event.PK).push(event);
  }
  
  const stats = {
    totalOrders: orderMap.size,
    totalEvents: allEvents.length,
    orders: []
  };
  
  // 为每个订单生成摘要
  for (const [orderId, events] of orderMap.entries()) {
    events.sort((a, b) => new Date(a.SK) - new Date(b.SK));
    
    const lastEvent = events[events.length - 1];
    const firstEvent = events[0];
    
    stats.orders.push({
      orderId: orderId,
      eventCount: events.length,
      createdAt: firstEvent.SK,
      lastEvent: lastEvent.detailType,
      lastUpdated: lastEvent.SK
    });
  }
  
  console.log(`[OrderJourney] 统计: ${stats.totalOrders} 个订单, ${stats.totalEvents} 个事件`);
  
  return stats;
}

module.exports = {
  registerListeners,
  recordEvent,
  getOrderJourney,
  generateOrderJourneyHTML,
  getOrderStats
};

