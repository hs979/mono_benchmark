/**
 * DynamoDB表初始化脚本
 * 创建todo应用所需的DynamoDB表
 * 
 * 使用方法：
 *   node scripts/init-db.js
 *   或在package.json中添加: npm run init-db
 */

require('dotenv').config();
const AWS = require('aws-sdk');

// 配置AWS
const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1'
};

// 如果提供了访问密钥
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  awsConfig.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  awsConfig.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}

const dynamodb = new AWS.DynamoDB(awsConfig);

// 表名配置
const TODO_TABLE = process.env.TODO_TABLE_NAME || 'todo-monolith-table';
const USER_TABLE = process.env.USER_TABLE_NAME || 'todo-monolith-users';

/**
 * 检查表是否存在
 */
async function tableExists(tableName) {
  try {
    await dynamodb.describeTable({ TableName: tableName }).promise();
    return true;
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

/**
 * 等待表变为ACTIVE状态
 */
async function waitForTable(tableName) {
  console.log(`  等待表 ${tableName} 变为ACTIVE状态...`);
  let attempts = 0;
  const maxAttempts = 30; // 最多等待60秒（每次2秒）
  
  while (attempts < maxAttempts) {
    try {
      const result = await dynamodb.describeTable({ TableName: tableName }).promise();
      const status = result.Table.TableStatus;
      
      if (status === 'ACTIVE') {
        console.log(`  ✓ 表 ${tableName} 已就绪`);
        return true;
      }
      
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      console.error(`\n  ✗ 检查表状态时出错: ${error.message}`);
      return false;
    }
  }
  
  console.log(`\n  ✗ 等待超时`);
  return false;
}

/**
 * 创建待办事项表
 */
async function createTodoTable() {
  const params = {
    TableName: TODO_TABLE,
    KeySchema: [
      { AttributeName: 'cognito-username', KeyType: 'HASH' },  // 分区键
      { AttributeName: 'id', KeyType: 'RANGE' }                // 排序键
    ],
    AttributeDefinitions: [
      { AttributeName: 'cognito-username', AttributeType: 'S' },
      { AttributeName: 'id', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST',  // 按需付费模式
    Tags: [
      { Key: 'Application', Value: 'TodoMonolith' },
      { Key: 'Environment', Value: process.env.NODE_ENV || 'development' }
    ]
  };

  try {
    if (await tableExists(TODO_TABLE)) {
      console.log(`- 表 ${TODO_TABLE} 已存在，跳过创建`);
      return false;
    }

    await dynamodb.createTable(params).promise();
    console.log(`✓ 表 ${TODO_TABLE} 创建成功`);
    console.log(`  分区键: cognito-username (String)`);
    console.log(`  排序键: id (String)`);
    return true;
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log(`- 表 ${TODO_TABLE} 已存在`);
      return false;
    }
    throw error;
  }
}

/**
 * 创建用户表
 */
async function createUserTable() {
  const params = {
    TableName: USER_TABLE,
    KeySchema: [
      { AttributeName: 'username', KeyType: 'HASH' }  // 主键
    ],
    AttributeDefinitions: [
      { AttributeName: 'username', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST',  // 按需付费模式
    Tags: [
      { Key: 'Application', Value: 'TodoMonolith' },
      { Key: 'Environment', Value: process.env.NODE_ENV || 'development' }
    ]
  };

  try {
    if (await tableExists(USER_TABLE)) {
      console.log(`- 表 ${USER_TABLE} 已存在，跳过创建`);
      return false;
    }

    await dynamodb.createTable(params).promise();
    console.log(`✓ 表 ${USER_TABLE} 创建成功`);
    console.log(`  主键: username (String)`);
    return true;
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log(`- 表 ${USER_TABLE} 已存在`);
      return false;
    }
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('Todo应用 - DynamoDB表初始化');
  console.log('========================================');
  console.log(`区域: ${awsConfig.region}`);
  if (awsConfig.endpoint) {
    console.log(`端点: ${awsConfig.endpoint} (本地模式)`);
  }
  console.log('');

  try {
    // 创建表
    console.log('步骤1: 创建DynamoDB表');
    console.log('');
    
    const todoCreated = await createTodoTable();
    const userCreated = await createUserTable();
    
    // 等待表变为ACTIVE
    if (todoCreated || userCreated) {
      console.log('');
      console.log('步骤2: 等待表创建完成');
      console.log('');
      
      if (todoCreated) {
        await waitForTable(TODO_TABLE);
      }
      if (userCreated) {
        await waitForTable(USER_TABLE);
      }
    }

    console.log('');
    console.log('========================================');
    console.log('✓ 数据库初始化完成！');
    console.log('========================================');
    console.log('');
    console.log('创建的表:');
    console.log(`  1. ${TODO_TABLE} - 待办事项表`);
    console.log(`  2. ${USER_TABLE} - 用户表`);
    console.log('');
    console.log('现在可以启动应用了:');
    console.log('  cd backend && npm start');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('✗ 初始化失败！');
    console.error('========================================');
    console.error('错误信息:', error.message);
    console.error('');
    
    if (error.code === 'CredentialsError' || error.code === 'InvalidClientTokenId') {
      console.error('提示: 请检查AWS凭证配置');
      console.error('  1. 运行 aws configure');
      console.error('  2. 或在 .env 文件中配置 AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY');
    } else if (error.code === 'NetworkingError') {
      console.error('提示: 网络连接失败，请检查网络设置和 AWS 区域配置');
    }
    
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

// 导出函数供其他模块使用
module.exports = {
  createTodoTable,
  createUserTable,
  tableExists,
  main
};
