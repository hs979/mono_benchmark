
/**
 * 指标服务
 * 负责收集和记录各种业务指标
 */

// 内存指标存储
const metrics = {
  orders: {
    started: 0,
    completed: 0,
    cancelled: 0,
    timeout: 0,
    total: 0
  },
  drinks: new Map(), // 饮品统计
  modifiers: new Map(), // 修饰符统计
  events: [] // 事件时间序列
};

/**
 * 注册事件监听器
 */
function registerListeners(eventBus) {
  // 监听验证器事件
  eventBus.on('Validator.NewOrder', handleNewOrder);
  
  // 监听订单处理器事件
  eventBus.on('OrderProcessor.OrderTimeOut', handleOrderTimeout);
  
  // 监听订单管理器事件
  eventBus.on('OrderManager.WaitingCompletion', handleWaitingCompletion);
  eventBus.on('OrderManager.OrderCOMPLETED', handleOrderCompleted);
  eventBus.on('OrderManager.OrderCANCELLED', handleOrderCancelled);
  
  console.log('[Metrics] 事件监听器已注册');
}

/**
 * 处理新订单事件
 */
function handleNewOrder(event) {
  try {
    console.log('[Metrics] 记录新订单指标');
    
    // 增加订单开始计数
    metrics.orders.started++;
    metrics.orders.total++;
    
    // 记录事件
    recordMetricEvent({
      type: 'Order',
      state: 'Started',
      value: 1,
      timestamp: event.time || new Date().toISOString(),
      details: event.detail
    });
    
    console.log(`[Metrics] 订单已开始计数: ${metrics.orders.started}`);
    
  } catch (error) {
    console.error('[Metrics] 处理新订单指标错误:', error);
  }
}

/**
 * 处理订单超时事件
 */
function handleOrderTimeout(event) {
  try {
    console.log('[Metrics] 记录订单超时指标');
    
    // 增加超时计数
    metrics.orders.timeout++;
    
    // 记录事件
    recordMetricEvent({
      type: 'Order',
      state: 'Timeout',
      value: 1,
      timestamp: event.time || new Date().toISOString(),
      details: event.detail
    });
    
    console.log(`[Metrics] 订单超时计数: ${metrics.orders.timeout}`);
    
  } catch (error) {
    console.error('[Metrics] 处理订单超时指标错误:', error);
  }
}

/**
 * 处理等待完成事件（订单详情已提交）
 */
function handleWaitingCompletion(event) {
  try {
    console.log('[Metrics] 记录订单详情提交指标');
    
    const drinkOrder = event.detail?.drinkOrder;
    
    if (!drinkOrder) {
      console.log('[Metrics] 事件中没有饮品订单信息');
      return;
    }
    
    // 统计饮品类型
    if (drinkOrder.drink) {
      const drink = drinkOrder.drink;
      const currentCount = metrics.drinks.get(drink) || 0;
      metrics.drinks.set(drink, currentCount + 1);
      
      console.log(`[Metrics] 饮品统计 - ${drink}: ${currentCount + 1}`);
      
      // 记录饮品指标
      recordMetricEvent({
        type: 'Drink',
        dimension: drink,
        value: 1,
        timestamp: event.time || new Date().toISOString()
      });
    }
    
    // 统计修饰符
    if (drinkOrder.modifiers && Array.isArray(drinkOrder.modifiers)) {
      for (const modifier of drinkOrder.modifiers) {
        const currentCount = metrics.modifiers.get(modifier) || 0;
        metrics.modifiers.set(modifier, currentCount + 1);
        
        console.log(`[Metrics] 修饰符统计 - ${modifier}: ${currentCount + 1}`);
        
        // 记录修饰符指标
        recordMetricEvent({
          type: 'Modifier',
          dimension: modifier,
          value: 1,
          timestamp: event.time || new Date().toISOString()
        });
      }
    }
    
  } catch (error) {
    console.error('[Metrics] 处理等待完成指标错误:', error);
  }
}

/**
 * 处理订单完成事件
 */
function handleOrderCompleted(event) {
  try {
    console.log('[Metrics] 记录订单完成指标');
    
    // 增加完成计数
    metrics.orders.completed++;
    
    // 记录事件
    recordMetricEvent({
      type: 'Order',
      state: 'Completed',
      value: 1,
      timestamp: event.time || new Date().toISOString(),
      details: event.detail
    });
    
    console.log(`[Metrics] 订单完成计数: ${metrics.orders.completed}`);
    
  } catch (error) {
    console.error('[Metrics] 处理订单完成指标错误:', error);
  }
}

/**
 * 处理订单取消事件
 */
function handleOrderCancelled(event) {
  try {
    console.log('[Metrics] 记录订单取消指标');
    
    // 增加取消计数
    metrics.orders.cancelled++;
    
    // 记录事件
    recordMetricEvent({
      type: 'Order',
      state: 'Cancelled',
      value: 1,
      timestamp: event.time || new Date().toISOString(),
      details: event.detail
    });
    
    console.log(`[Metrics] 订单取消计数: ${metrics.orders.cancelled}`);
    
  } catch (error) {
    console.error('[Metrics] 处理订单取消指标错误:', error);
  }
}

/**
 * 记录指标事件
 */
function recordMetricEvent(metric) {
  // 添加到事件时间序列
  metrics.events.push({
    ...metric,
    recordedAt: Date.now()
  });
  
  // 限制事件历史记录数量（保留最近1000条）
  if (metrics.events.length > 1000) {
    metrics.events = metrics.events.slice(-1000);
  }
}

/**
 * 获取所有指标
 */
function getAllMetrics() {
  return {
    orders: { ...metrics.orders },
    drinks: Object.fromEntries(metrics.drinks),
    modifiers: Object.fromEntries(metrics.modifiers),
    eventCount: metrics.events.length
  };
}

/**
 * 获取订单指标
 */
function getOrderMetrics() {
  return {
    ...metrics.orders,
    completionRate: metrics.orders.total > 0 
      ? ((metrics.orders.completed / metrics.orders.total) * 100).toFixed(2) + '%'
      : '0%',
    cancellationRate: metrics.orders.total > 0
      ? ((metrics.orders.cancelled / metrics.orders.total) * 100).toFixed(2) + '%'
      : '0%',
    timeoutRate: metrics.orders.total > 0
      ? ((metrics.orders.timeout / metrics.orders.total) * 100).toFixed(2) + '%'
      : '0%'
  };
}

/**
 * 获取饮品统计
 */
function getDrinkMetrics() {
  const drinkStats = [];
  
  for (const [drink, count] of metrics.drinks.entries()) {
    drinkStats.push({
      drink: drink,
      count: count,
      percentage: metrics.orders.total > 0
        ? ((count / metrics.orders.total) * 100).toFixed(2) + '%'
        : '0%'
    });
  }
  
  // 按数量排序
  drinkStats.sort((a, b) => b.count - a.count);
  
  return drinkStats;
}

/**
 * 获取修饰符统计
 */
function getModifierMetrics() {
  const modifierStats = [];
  
  for (const [modifier, count] of metrics.modifiers.entries()) {
    modifierStats.push({
      modifier: modifier,
      count: count
    });
  }
  
  // 按数量排序
  modifierStats.sort((a, b) => b.count - a.count);
  
  return modifierStats;
}

/**
 * 获取事件时间序列
 */
function getEventTimeSeries(options = {}) {
  const { type, limit = 100 } = options;
  
  let events = metrics.events;
  
  // 按类型过滤
  if (type) {
    events = events.filter(e => e.type === type);
  }
  
  // 限制数量
  events = events.slice(-limit);
  
  return events;
}

/**
 * 重置所有指标
 */
function resetMetrics() {
  console.log('[Metrics] 重置所有指标');
  
  metrics.orders.started = 0;
  metrics.orders.completed = 0;
  metrics.orders.cancelled = 0;
  metrics.orders.timeout = 0;
  metrics.orders.total = 0;
  
  metrics.drinks.clear();
  metrics.modifiers.clear();
  metrics.events = [];
  
  console.log('[Metrics] 指标已重置');
}

/**
 * 生成指标报告
 */
function generateMetricsReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 presso 指标报告');
  console.log('='.repeat(60));
  
  // 订单指标
  const orderMetrics = getOrderMetrics();
  console.log('\n📦 订单指标:');
  console.log(`  总订单数: ${orderMetrics.total}`);
  console.log(`  已开始: ${orderMetrics.started}`);
  console.log(`  已完成: ${orderMetrics.completed} (${orderMetrics.completionRate})`);
  console.log(`  已取消: ${orderMetrics.cancelled} (${orderMetrics.cancellationRate})`);
  console.log(`  超时: ${orderMetrics.timeout} (${orderMetrics.timeoutRate})`);
  
  // 饮品统计
  const drinkMetrics = getDrinkMetrics();
  if (drinkMetrics.length > 0) {
    console.log('\n☕ 饮品统计:');
    for (const stat of drinkMetrics) {
      console.log(`  ${stat.drink}: ${stat.count} (${stat.percentage})`);
    }
  }
  
  // 修饰符统计
  const modifierMetrics = getModifierMetrics();
  if (modifierMetrics.length > 0) {
    console.log('\n🥛 修饰符统计:');
    for (const stat of modifierMetrics) {
      console.log(`  ${stat.modifier}: ${stat.count}`);
    }
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  return {
    orders: orderMetrics,
    drinks: drinkMetrics,
    modifiers: modifierMetrics
  };
}

module.exports = {
  registerListeners,
  getAllMetrics,
  getOrderMetrics,
  getDrinkMetrics,
  getModifierMetrics,
  getEventTimeSeries,
  resetMetrics,
  generateMetricsReport
};

