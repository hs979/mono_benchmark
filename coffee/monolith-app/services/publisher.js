/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

/**
 * 发布服务
 * 负责将事件发布到各个主题
 * 在单体应用中实现为日志记录
 */

/**
 * 注册事件监听器
 */
function registerListeners(eventBus) {
  // 监听订单管理事件
  eventBus.on('OrderManager.WaitingCompletion', (event) => publishToAdmin(event));
  eventBus.on('OrderManager.OrderCOMPLETED', (event) => publishToAdmin(event));
  eventBus.on('OrderManager.OrderCANCELLED', (event) => publishToAdmin(event));
  eventBus.on('OrderManager.MakeOrder', (event) => publishToAdmin(event));
  
  // 监听订单处理事件
  eventBus.on('OrderProcessor.WorkflowStarted', (event) => publishToAdmin(event));
  eventBus.on('OrderProcessor.WaitingCompletion', (event) => publishToAdmin(event));
  eventBus.on('OrderProcessor.OrderTimeOut', (event) => publishToAdmin(event));
  eventBus.on('OrderProcessor.ShopUnavailable', (event) => publishToAdmin(event));
  eventBus.on('OrderProcessor.orderFinished', (event) => publishToAdmin(event));
  
  // 监听验证器事件
  eventBus.on('Validator.NewOrder', (event) => publishToAdmin(event));
  
  // 监听配置服务事件
  eventBus.on('ConfigService.ConfigChanged', (event) => publishToConfig(event));
  
  console.log('[Publisher] 事件监听器已注册');
}

/**
 * 发布到管理员主题
 */
function publishToAdmin(event) {
  const eventId = event.detail?.eventId || 'unknown';
  const topic = `presso-admin-${eventId}`;
  
  console.log(`[Publisher] 📢 发布到管理员主题: ${topic}`);
  console.log(`[Publisher]    事件类型: ${event['detail-type']}`);
  console.log(`[Publisher]    详情: ${JSON.stringify(event.detail, null, 2)}`);
  
  // 在实际应用中，这里可以发送WebSocket消息或推送通知
  // 在单体应用中，我们只记录日志
}

/**
 * 发布到用户主题
 */
function publishToUser(event) {
  const userId = event.detail?.userId || 'unknown';
  const topic = `presso-user-${userId}`;
  
  console.log(`[Publisher] 📢 发布到用户主题: ${topic}`);
  console.log(`[Publisher]    事件类型: ${event['detail-type']}`);
  console.log(`[Publisher]    详情: ${JSON.stringify(event.detail, null, 2)}`);
  
  // 在实际应用中，这里可以发送WebSocket消息或推送通知
}

/**
 * 发布到配置主题
 */
function publishToConfig(event) {
  const topic = 'presso-config';
  
  console.log(`[Publisher] 📢 发布到配置主题: ${topic}`);
  console.log(`[Publisher]    事件类型: ${event['detail-type']}`);
  console.log(`[Publisher]    详情: ${JSON.stringify(event.detail, null, 2)}`);
  
  // 在实际应用中，这里可以发送WebSocket消息或推送通知
}

module.exports = {
  registerListeners
};

