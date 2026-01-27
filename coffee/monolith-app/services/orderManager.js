

/**
 * 订单管理服务
 * 负责订单的CRUD操作和状态管理
 */

const database = require('./database');
const orderProcessor = require('./orderProcessor');
const authService = require('./authService');

/**
 * 注册事件监听器
 */
function registerListeners(eventBus) {
  // 监听工作流启动事件
  eventBus.on('OrderProcessor.WorkflowStarted', handleWorkflowStarted);
  
  // 监听等待完成事件
  eventBus.on('OrderProcessor.WaitingCompletion', handleWaitingCompletion);
  
  // 监听订单超时事件
  eventBus.on('OrderProcessor.OrderTimeOut', handleOrderTimeout);
  
  console.log('[OrderManager] 事件监听器已注册');
}

/**
 * 处理工作流启动事件
 */
async function handleWorkflowStarted(event) {
  try {
    console.log('[OrderManager] 处理工作流启动事件:', event.detail.orderId);
    
    const { orderId, userId, eventId, TaskToken } = event.detail;
    
    // 在订单表中创建订单记录
    const order = {
      PK: 'orders',
      SK: orderId,
      USERID: userId,
      ORDERSTATE: `${eventId}-CREATED`,
      TaskToken: TaskToken,
      robot: false,
      TS: Date.now()
    };
    
    await database.putItem('orders', order);
    console.log(`[OrderManager] 订单创建成功: ${orderId}`);
    
  } catch (error) {
    console.error('[OrderManager] 处理工作流启动事件错误:', error);
  }
}

/**
 * 处理等待完成事件
 */
async function handleWaitingCompletion(event) {
  try {
    console.log('[OrderManager] 处理等待完成事件:', event.detail.orderId);
    
    const { orderId, userId, TaskToken, orderNumber, eventId } = event.detail;
    
    // 更新订单记录
    const order = await database.getItem('orders', { PK: 'orders', SK: orderId });
    
    if (!order) {
      console.log(`[OrderManager] 未找到订单: ${orderId}`);
      return;
    }
    
    // 验证用户ID
    if (order.USERID !== userId) {
      console.log(`[OrderManager] 用户ID不匹配: ${order.USERID} !== ${userId}`);
      return;
    }
    
    // 更新订单
    await database.updateItem('orders', { PK: 'orders', SK: orderId }, {
      TS: Date.now(),
      TaskToken: TaskToken,
      orderNumber: orderNumber
    });
    
    console.log(`[OrderManager] 订单更新成功: ${orderId}, 订单号: ${orderNumber}`);
    
    // 获取更新后的订单
    const updatedOrder = await database.getItem('orders', { PK: 'orders', SK: orderId });
    
    // 发布事件
    console.log('[OrderManager] 发布 OrderManager.WaitingCompletion 事件');
    global.eventBus.emit('OrderManager.WaitingCompletion', {
      'detail-type': 'OrderManager.WaitingCompletion',
      source: 'presso',
      detail: {
        orderId: updatedOrder.SK,
        orderNumber: updatedOrder.orderNumber,
        state: updatedOrder.ORDERSTATE,
        drinkOrder: updatedOrder.drinkOrder ? JSON.parse(updatedOrder.drinkOrder) : null,
        userId: updatedOrder.USERID,
        robot: updatedOrder.robot,
        eventId: eventId,
        TS: updatedOrder.TS,
        Message: '任务令牌已存储在订单表中'
      },
      time: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[OrderManager] 处理等待完成事件错误:', error);
  }
}

/**
 * 处理订单超时事件
 */
async function handleOrderTimeout(event) {
  try {
    console.log('[OrderManager] 处理订单超时事件:', event.detail.orderId);
    
    const { orderId, userId, eventId } = event.detail;
    
    // 更新订单状态为超时
    const order = await database.getItem('orders', { PK: 'orders', SK: orderId });
    
    if (order) {
      await database.updateItem('orders', { PK: 'orders', SK: orderId }, {
        ORDERSTATE: `${eventId}-TIMEOUT`,
        TS: Date.now()
      });
      
      console.log(`[OrderManager] 订单状态更新为超时: ${orderId}`);
    }
    
  } catch (error) {
    console.error('[OrderManager] 处理订单超时事件错误:', error);
  }
}

/**
 * 获取用户ID
 */
function getUserId(req) {
  // 使用authService获取用户ID
  const userId = authService.getUserId(req);
  if (userId) {
    return userId;
  }
  
  // 兼容性处理：如果没有认证信息，从查询参数获取（用于测试）
  if (req.query.userId) {
    return req.query.userId;
  }
  
  // 默认用户ID
  return 'user-' + Math.random().toString(36).substr(2, 9);
}

/**
 * 验证饮品订单
 */
function sanitizeOrder(order, menu) {
  if (!order || !order.drink) {
    return false;
  }
  
  // 检查饮品是否在菜单中
  const drinkItem = menu.find(item => item.drink === order.drink);
  
  if (!drinkItem) {
    console.log(`[OrderManager] 饮品不在菜单中: ${order.drink}`);
    return false;
  }
  
  // 检查修饰符
  if (order.modifiers && order.modifiers.length > 0) {
    for (const modifier of order.modifiers) {
      let found = false;
      
      for (const allowedModifier of drinkItem.modifiers) {
        if (allowedModifier.Options && allowedModifier.Options.includes(modifier)) {
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.log(`[OrderManager] 修饰符无效: ${modifier}`);
        return false;
      }
    }
  }
  
  console.log(`[OrderManager] 订单验证通过: ${order.drink}`);
  return true;
}

/**
 * 获取订单列表
 * GET /orders?state=CREATED&eventId=ABC&maxItems=100
 */
async function getOrders(req, res) {
  try {
    console.log('[OrderManager] 获取订单列表');
    
    const { state, eventId, maxItems = 100 } = req.query;
    
    if (!state || !eventId) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: '缺少state或eventId参数' 
      });
    }
    
    const orderState = `${eventId}-${state}`;
    
    // 查询订单
    const orders = await database.query('orders', {
      IndexName: 'GSI-status',
      ORDERSTATE: orderState,
      Limit: parseInt(maxItems)
    });
    
    console.log(`[OrderManager] 找到 ${orders.length} 个订单`);
    
    res.status(200).json(orders);
    
  } catch (error) {
    console.error('[OrderManager] 获取订单列表错误:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}

/**
 * 获取当前用户的订单
 * GET /myOrders
 */
async function getMyOrders(req, res) {
  try {
    const userId = getUserId(req);
    
    console.log(`[OrderManager] 获取用户订单: ${userId}`);
    
    // 查询用户的订单
    const orders = await database.query('orders', {
      IndexName: 'GSI-userId',
      USERID: userId,
      Limit: 100
    });
    
    console.log(`[OrderManager] 找到 ${orders.length} 个订单`);
    
    res.status(200).json(orders);
    
  } catch (error) {
    console.error('[OrderManager] 获取用户订单错误:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}

/**
 * 获取单个订单详情
 * GET /orders/:id
 */
async function getOrderById(req, res) {
  try {
    const orderId = req.params.id;
    
    console.log(`[OrderManager] 获取订单详情: ${orderId}`);
    
    const order = await database.getItem('orders', { PK: 'orders', SK: orderId });
    
    if (!order) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: '订单不存在' 
      });
    }
    
    res.status(200).json({
      orderId: order.SK,
      drinkOrder: order.drinkOrder ? JSON.parse(order.drinkOrder) : null,
      orderState: order.ORDERSTATE,
      TS: order.TS
    });
    
  } catch (error) {
    console.error('[OrderManager] 获取订单详情错误:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}

/**
 * 更新订单
 * PUT /orders/:id?action=complete&eventId=ABC
 */
async function updateOrder(req, res) {
  try {
    const orderId = req.params.id;
    const { action, eventId } = req.query;
    const userId = getUserId(req);
    
    console.log(`[OrderManager] 更新订单: ${orderId}, action: ${action || '提交订单'}`);
    
    // eventId 是必需的
    if (!eventId) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: '缺少eventId参数' 
      });
    }
    
    const order = await database.getItem('orders', { PK: 'orders', SK: orderId });
    
    if (!order) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: '订单不存在' 
      });
    }
    
    // 根据action处理不同的操作
    if (action === 'complete') {
      await handleCompleteOrder(orderId, eventId, order, res);
    } else if (action === 'cancel') {
      await handleCancelOrder(orderId, eventId, order, res);
    } else if (action === 'make') {
      await handleMakeOrder(orderId, eventId, userId, order, res);
    } else if (action === 'unmake') {
      await handleUnmakeOrder(orderId, eventId, order, res);
    } else if (!action || action === 'submit') {
      // 客户提交订单（action为空或为'submit'）
      await handleSubmitOrder(orderId, eventId, userId, req.body, order, res);
    } else {
      res.status(400).json({ 
        error: 'Bad Request', 
        message: '无效的action' 
      });
    }
    
  } catch (error) {
    console.error('[OrderManager] 更新订单错误:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}

/**
 * 处理客户提交订单
 */
async function handleSubmitOrder(orderId, eventId, userId, body, order, res) {
  console.log(`[OrderManager] 客户提交订单: ${orderId}`);
  
  // 获取菜单
  const config = await database.getItem('config', { PK: `config-${eventId}` });
  
  if (!config) {
    return res.status(400).json({ 
      error: 'Bad Request', 
      message: '未找到配置' 
    });
  }
  
  // 验证订单
  const isValid = sanitizeOrder(body, config.menu);
  
  if (!isValid) {
    return res.status(400).json({ 
      error: 'Invalid Order', 
      message: '无效的订单' 
    });
  }
  
  // 验证用户ID
  if (body.userId !== order.USERID) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: '用户ID不匹配' 
    });
  }
  
  // 检查TaskToken是否存在
  if (!order.TaskToken) {
    return res.status(400).json({ 
      error: 'Bad Request', 
      message: '订单状态无效' 
    });
  }
  
  // 更新订单
  await database.updateItem('orders', { PK: 'orders', SK: orderId }, {
    drinkOrder: JSON.stringify(body)
  });
  
  // 恢复工作流
  orderProcessor.resumeWorkflow(orderId, order.TaskToken);
  
  res.status(200).json({ 
    message: '订单提交成功',
    orderId: orderId
  });
}

/**
 * 处理完成订单
 */
async function handleCompleteOrder(orderId, eventId, order, res) {
  console.log(`[OrderManager] 完成订单: ${orderId}`);
  
  // 更新订单状态
  const newState = `${eventId}-COMPLETED`;
  await database.updateItem('orders', { PK: 'orders', SK: orderId }, {
    ORDERSTATE: newState
  });
  
  const updatedOrder = await database.getItem('orders', { PK: 'orders', SK: orderId });
  
  // 发布事件
  global.eventBus.emit('OrderManager.OrderCOMPLETED', {
    'detail-type': 'OrderManager.OrderCOMPLETED',
    source: 'presso',
    detail: {
      eventId: eventId,
      orderId: orderId,
      userId: updatedOrder.USERID,
      ORDERSTATE: updatedOrder.ORDERSTATE,
      Message: '咖啡师已完成订单'
    },
    time: new Date().toISOString()
  });
  
  // 完成工作流
  if (order.TaskToken) {
    orderProcessor.completeWorkflow(orderId, order.TaskToken);
  }
  
  res.status(200).json({ 
    message: '订单已完成',
    orderId: orderId
  });
}

/**
 * 处理取消订单
 */
async function handleCancelOrder(orderId, eventId, order, res) {
  console.log(`[OrderManager] 取消订单: ${orderId}`);
  
  // 更新订单状态
  const newState = `${eventId}-CANCELLED`;
  await database.updateItem('orders', { PK: 'orders', SK: orderId }, {
    ORDERSTATE: newState
  });
  
  const updatedOrder = await database.getItem('orders', { PK: 'orders', SK: orderId });
  
  // 发布事件
  global.eventBus.emit('OrderManager.OrderCANCELLED', {
    'detail-type': 'OrderManager.OrderCANCELLED',
    source: 'presso',
    detail: {
      eventId: eventId,
      orderId: orderId,
      userId: updatedOrder.USERID,
      ORDERSTATE: updatedOrder.ORDERSTATE,
      Message: '咖啡师已取消订单'
    },
    time: new Date().toISOString()
  });
  
  // 完成工作流
  if (order.TaskToken) {
    orderProcessor.completeWorkflow(orderId, order.TaskToken);
  }
  
  res.status(200).json({ 
    message: '订单已取消',
    orderId: orderId
  });
}

/**
 * 处理认领订单
 */
async function handleMakeOrder(orderId, eventId, baristaUserId, order, res) {
  console.log(`[OrderManager] 认领订单: ${orderId}, 咖啡师: ${baristaUserId}`);
  
  // 更新订单
  await database.updateItem('orders', { PK: 'orders', SK: orderId }, {
    baristaUserId: baristaUserId
  });
  
  const updatedOrder = await database.getItem('orders', { PK: 'orders', SK: orderId });
  
  // 发布事件
  global.eventBus.emit('OrderManager.MakeOrder', {
    'detail-type': 'OrderManager.MakeOrder',
    source: 'presso',
    detail: {
      baristaUserId: updatedOrder.baristaUserId,
      orderId: orderId,
      eventId: eventId,
      userId: updatedOrder.USERID,
      Message: '咖啡师已认领订单'
    },
    time: new Date().toISOString()
  });
  
  res.status(200).json({ 
    message: '订单已认领',
    orderId: orderId
  });
}

/**
 * 处理取消认领订单
 */
async function handleUnmakeOrder(orderId, eventId, order, res) {
  console.log(`[OrderManager] 取消认领订单: ${orderId}`);
  
  // 更新订单
  await database.updateItem('orders', { PK: 'orders', SK: orderId }, {
    baristaUserId: ''
  });
  
  const updatedOrder = await database.getItem('orders', { PK: 'orders', SK: orderId });
  
  // 发布事件
  global.eventBus.emit('OrderManager.MakeOrder', {
    'detail-type': 'OrderManager.MakeOrder',
    source: 'presso',
    detail: {
      baristaUserId: '',
      orderId: orderId,
      eventId: eventId,
      userId: updatedOrder.USERID,
      Message: '咖啡师已取消认领订单'
    },
    time: new Date().toISOString()
  });
  
  res.status(200).json({ 
    message: '已取消认领',
    orderId: orderId
  });
}

module.exports = {
  registerListeners,
  getOrders,
  getMyOrders,
  getOrderById,
  updateOrder
};

