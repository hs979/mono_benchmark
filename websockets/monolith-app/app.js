// WebSocket聊天应用 - 单体应用版本
// 实现连接管理和消息广播功能

const WebSocket = require('ws');

// 配置
const PORT = process.env.PORT || 8080;

// 存储所有活跃的WebSocket连接
// 键：connectionId（自增ID），值：WebSocket连接对象
const connections = new Map();
let connectionIdCounter = 0;

/**
 * 创建WebSocket服务器
 */
const wss = new WebSocket.Server({ port: PORT });

/**
 * 处理新的WebSocket连接
 */
wss.on('connection', (ws) => {
  // 生成唯一的连接ID
  const connectionId = ++connectionIdCounter;
  
  // 将连接存储到Map中
  connections.set(connectionId, ws);
  
  console.log(`[连接] 新客户端已连接，connectionId: ${connectionId}, 当前在线人数: ${connections.size}`);
  
  /**
   * 处理客户端发送的消息
   */
  ws.on('message', (message) => {
    try {
      // 解析消息
      const parsedMessage = JSON.parse(message);
      console.log(`[消息] 收到来自connectionId ${connectionId}的消息:`, parsedMessage);
      
      // 检查action类型
      if (parsedMessage.action === 'sendmessage' && parsedMessage.data) {
        const messageData = parsedMessage.data;
        
        // 广播消息给所有连接的客户端
        let successCount = 0;
        let failCount = 0;
        
        connections.forEach((clientWs, clientId) => {
          // 检查连接是否有效
          if (clientWs.readyState === WebSocket.OPEN) {
            try {
              // 发送消息数据
              clientWs.send(messageData);
              successCount++;
            } catch (error) {
              console.error(`[错误] 发送消息到connectionId ${clientId}失败:`, error.message);
              failCount++;
            }
          } else {
            // 清理无效连接
            connections.delete(clientId);
            console.log(`[清理] 删除无效连接 connectionId: ${clientId}`);
            failCount++;
          }
        });
        
        console.log(`[广播] 消息已发送 - 成功: ${successCount}, 失败: ${failCount}`);
      } else {
        console.log(`[警告] 未知的消息格式或缺少必要字段:`, parsedMessage);
      }
    } catch (error) {
      console.error(`[错误] 处理消息时出错:`, error.message);
    }
  });
  
  /**
   * 处理客户端断开连接
   */
  ws.on('close', () => {
    // 从Map中删除连接
    connections.delete(connectionId);
    console.log(`[断开] connectionId ${connectionId}已断开连接，当前在线人数: ${connections.size}`);
  });
  
  /**
   * 处理连接错误
   */
  ws.on('error', (error) => {
    console.error(`[错误] connectionId ${connectionId}发生错误:`, error.message);
    // 发生错误时也删除连接
    connections.delete(connectionId);
  });
});

/**
 * 服务器启动成功
 */
wss.on('listening', () => {
  console.log(`==============================================`);
  console.log(`WebSocket聊天服务器已启动`);
  console.log(`监听端口: ${PORT}`);
  console.log(`连接地址: ws://localhost:${PORT}`);
  console.log(`==============================================`);
});

/**
 * 服务器错误处理
 */
wss.on('error', (error) => {
  console.error('[致命错误] WebSocket服务器错误:', error);
  process.exit(1);
});

/**
 * 优雅关闭处理
 */
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  
  // 关闭所有客户端连接
  connections.forEach((ws, connectionId) => {
    ws.close();
    console.log(`关闭连接: ${connectionId}`);
  });
  
  // 关闭WebSocket服务器
  wss.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

