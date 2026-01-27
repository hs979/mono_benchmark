/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

/**
 * 订单处理服务
 * 负责订单处理工作流，包括容量检查、订单号生成、超时处理
 */

const database = require('./database');

// 存储活动的工作流执行
const activeExecutions = new Map();
const MAX_CONCURRENT_ORDERS = 20;

/**
 * 注册事件监听器
 */
function registerListeners(eventBus) {
  // 监听新订单事件
  eventBus.on('Validator.NewOrder', handleNewOrder);
  
  console.log('[OrderProcessor] 事件监听器已注册');
}

/**
 * 处理新订单事件
 */
async function handleNewOrder(event) {
  try {
    console.log('[OrderProcessor] 收到新订单事件:', event.detail.orderId);
    
    const { orderId, userId, eventId, bucket } = event.detail;
    
    // 检查商店状态
    const shopStatus = await checkShopStatus(eventId);
    
    if (!shopStatus.isOpen) {
      console.log('[OrderProcessor] 商店未开放');
      emitShopUnavailable(userId, eventId);
      return;
    }
    
    // 检查容量
    const hasCapacity = await checkCapacity();
    
    if (!hasCapacity) {
      console.log('[OrderProcessor] 容量已满');
      emitShopUnavailable(userId, eventId);
      return;
    }
    
    // 启动订单工作流
    await startOrderWorkflow(orderId, userId, eventId, bucket);
    
  } catch (error) {
    console.error('[OrderProcessor] 处理新订单错误:', error);
  }
}

/**
 * 检查商店状态
 */
async function checkShopStatus(eventId) {
  const configKey = `config-${eventId}`;
  const config = await database.getItem('config', { PK: configKey });
  
  if (!config) {
    return { isOpen: false };
  }
  
  console.log(`[OrderProcessor] 商店状态: ${config.storeOpen ? '开放' : '关闭'}`);
  
  return {
    isOpen: config.storeOpen === true
  };
}

/**
 * 检查容量
 */
async function checkCapacity() {
  const runningCount = activeExecutions.size;
  const hasCapacity = runningCount < MAX_CONCURRENT_ORDERS;
  
  console.log(`[OrderProcessor] 容量检查 - 运行中: ${runningCount}, 最大: ${MAX_CONCURRENT_ORDERS}, 有容量: ${hasCapacity}`);
  
  return hasCapacity;
}

/**
 * 启动订单工作流
 */
async function startOrderWorkflow(orderId, userId, eventId, bucket) {
  console.log(`[OrderProcessor] 启动订单工作流: ${orderId}`);
  
  const executionId = `exec-${orderId}`;
  
  // 创建任务令牌（模拟Step Functions的waitForTaskToken）
  const taskToken = `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // 标记为活动执行
  activeExecutions.set(executionId, {
    orderId,
    userId,
    eventId,
    status: 'RUNNING',
    startTime: Date.now(),
    taskToken
  });
  
  // 发出工作流启动事件
  console.log('[OrderProcessor] 发布 OrderProcessor.WorkflowStarted 事件');
  global.eventBus.emit('OrderProcessor.WorkflowStarted', {
    'detail-type': 'OrderProcessor.WorkflowStarted',
    source: 'presso',
    detail: {
      Message: '订单工作流已启动，等待用户提交订单',
      TaskToken: taskToken,
      orderId,
      userId,
      eventId
    },
    time: new Date().toISOString()
  });
  
  // 设置超时（5分钟客户超时）
  const customerTimeout = setTimeout(() => {
    handleCustomerTimeout(executionId, orderId, userId, eventId);
  }, 5 * 60 * 1000);
  
  // 存储超时引用
  const execution = activeExecutions.get(executionId);
  if (execution) {
    execution.customerTimeout = customerTimeout;
  }
}

/**
 * 处理客户超时
 */
function handleCustomerTimeout(executionId, orderId, userId, eventId) {
  const execution = activeExecutions.get(executionId);
  
  if (!execution || execution.status !== 'RUNNING') {
    return;
  }
  
  console.log(`[OrderProcessor] 客户超时: ${orderId}`);
  
  execution.status = 'TIMEOUT';
  activeExecutions.delete(executionId);
  
  // 发出超时事件
  global.eventBus.emit('OrderProcessor.OrderTimeOut', {
    'detail-type': 'OrderProcessor.OrderTimeOut',
    source: 'presso',
    detail: {
      Message: '订单超时，客户未在规定时间内提交订单',
      userId,
      orderId,
      eventId,
      cause: 'Customer timedout'
    },
    time: new Date().toISOString()
  });
}

/**
 * 处理咖啡师超时
 */
function handleBaristaTimeout(executionId, orderId, userId, eventId) {
  const execution = activeExecutions.get(executionId);
  
  if (!execution || execution.status !== 'RUNNING') {
    return;
  }
  
  console.log(`[OrderProcessor] 咖啡师超时: ${orderId}`);
  
  execution.status = 'TIMEOUT';
  activeExecutions.delete(executionId);
  
  // 发出超时事件
  global.eventBus.emit('OrderProcessor.OrderTimeOut', {
    'detail-type': 'OrderProcessor.OrderTimeOut',
    source: 'presso',
    detail: {
      Message: '订单超时，咖啡师未在规定时间内完成订单',
      userId,
      orderId,
      eventId,
      cause: 'Barista timedout'
    },
    time: new Date().toISOString()
  });
}

/**
 * 恢复工作流（当客户提交订单后）
 */
function resumeWorkflow(orderId, taskToken) {
  console.log(`[OrderProcessor] 恢复工作流: ${orderId}`);
  
  // 查找对应的执行
  let execution = null;
  let executionId = null;
  
  for (const [id, exec] of activeExecutions.entries()) {
    if (exec.orderId === orderId && exec.taskToken === taskToken) {
      execution = exec;
      executionId = id;
      break;
    }
  }
  
  if (!execution) {
    console.log(`[OrderProcessor] 未找到执行: ${orderId}`);
    return;
  }
  
  // 清除客户超时
  if (execution.customerTimeout) {
    clearTimeout(execution.customerTimeout);
  }
  
  // 生成订单号
  const orderNumber = generateOrderNumber(execution.eventId);
  
  console.log(`[OrderProcessor] 生成订单号: ${orderNumber}`);
  
  // 更新任务令牌
  const newTaskToken = `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  execution.taskToken = newTaskToken;
  execution.orderNumber = orderNumber;
  
  // 发出等待完成事件
  console.log('[OrderProcessor] 发布 OrderProcessor.WaitingCompletion 事件');
  global.eventBus.emit('OrderProcessor.WaitingCompletion', {
    'detail-type': 'OrderProcessor.WaitingCompletion',
    source: 'presso',
    detail: {
      Message: '订单已提交，生成订单号，等待咖啡师完成',
      TaskToken: newTaskToken,
      orderId: execution.orderId,
      orderNumber: orderNumber,
      userId: execution.userId,
      eventId: execution.eventId
    },
    time: new Date().toISOString()
  });
  
  // 设置咖啡师超时（15分钟）
  const baristaTimeout = setTimeout(() => {
    handleBaristaTimeout(executionId, execution.orderId, execution.userId, execution.eventId);
  }, 15 * 60 * 1000);
  
  execution.baristaTimeout = baristaTimeout;
}

/**
 * 完成工作流（当咖啡师完成或取消订单后）
 */
function completeWorkflow(orderId, taskToken) {
  console.log(`[OrderProcessor] 完成工作流: ${orderId}`);
  
  // 查找对应的执行
  let execution = null;
  let executionId = null;
  
  for (const [id, exec] of activeExecutions.entries()) {
    if (exec.orderId === orderId && exec.taskToken === taskToken) {
      execution = exec;
      executionId = id;
      break;
    }
  }
  
  if (!execution) {
    console.log(`[OrderProcessor] 未找到执行: ${orderId}`);
    return;
  }
  
  // 清除超时
  if (execution.baristaTimeout) {
    clearTimeout(execution.baristaTimeout);
  }
  
  // 标记为完成
  execution.status = 'COMPLETED';
  activeExecutions.delete(executionId);
  
  // 发出订单完成事件
  console.log('[OrderProcessor] 发布 OrderProcessor.orderFinished 事件');
  global.eventBus.emit('OrderProcessor.orderFinished', {
    'detail-type': 'OrderProcessor.orderFinished',
    source: 'presso',
    detail: {
      Message: '订单已到达工作流末端',
      userId: execution.userId,
      orderId: execution.orderId,
      eventId: execution.eventId
    },
    time: new Date().toISOString()
  });
}

/**
 * 生成订单号
 */
async function generateOrderNumber(eventId) {
  const counterKey = `orderID-${eventId}`;
  const orderNumber = await database.incrementCounter('counting', { PK: counterKey });
  return orderNumber;
}

/**
 * 发出商店不可用事件
 */
function emitShopUnavailable(userId, eventId) {
  console.log('[OrderProcessor] 发布 OrderProcessor.ShopUnavailable 事件');
  global.eventBus.emit('OrderProcessor.ShopUnavailable', {
    'detail-type': 'OrderProcessor.ShopUnavailable',
    source: 'presso',
    detail: {
      Message: '商店未准备好接受新订单',
      userId,
      eventId
    },
    time: new Date().toISOString()
  });
}

module.exports = {
  registerListeners,
  resumeWorkflow,
  completeWorkflow,
  activeExecutions
};

