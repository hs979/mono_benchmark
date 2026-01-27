/**
 * 数据库配置模块
 * 
 * 配置AWS DynamoDB连接
 * 提供统一的数据库客户端实例
 */

const AWS = require('aws-sdk');

// 配置AWS区域
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1'
});

// 如果提供了访问密钥，则配置
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });
}

// 创建DynamoDB DocumentClient实例
// DocumentClient提供了更简单的API来操作DynamoDB
const options = {
  region: process.env.AWS_REGION || 'us-east-1'
};

const docClient = new AWS.DynamoDB.DocumentClient(options);

// 表名配置
const tables = {
  TODO_TABLE: process.env.TODO_TABLE_NAME || 'todo-monolith-table',
  USER_TABLE: process.env.USER_TABLE_NAME || 'todo-monolith-users'
};

module.exports = {
  docClient,
  tables
};

