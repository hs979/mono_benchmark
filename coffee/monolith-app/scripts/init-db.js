/**
 * DynamoDB表初始化脚本
 * 创建Serverlesspresso应用所需的DynamoDB表
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
const TABLE_NAMES = {
  validator: process.env.VALIDATOR_TABLE || 'presso-validator',
  config: process.env.CONFIG_TABLE || 'presso-config-table',
  orders: process.env.ORDER_TABLE || 'presso-order-table',
  counting: process.env.COUNTING_TABLE || 'presso-counting-table',
  orderJourneyEvents: process.env.ORDER_JOURNEY_TABLE || 'presso-order-journey-events',
  users: process.env.USERS_TABLE || 'presso-users'
};

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
  const maxAttempts = 30;
  
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
 * 创建验证表
 */
async function createValidatorTable() {
  const params = {
    TableName: TABLE_NAMES.validator,
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: 'NEW_AND_OLD_IMAGES'
    }
  };

  try {
    if (await tableExists(TABLE_NAMES.validator)) {
      console.log(`- 表 ${TABLE_NAMES.validator} 已存在，跳过创建`);
      return false;
    }

    await dynamodb.createTable(params).promise();
    console.log(`✓ 表 ${TABLE_NAMES.validator} 创建成功`);
    console.log(`  主键: PK (String)`);
    return true;
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log(`- 表 ${TABLE_NAMES.validator} 已存在`);
      return false;
    }
    throw error;
  }
}

/**
 * 创建配置表
 */
async function createConfigTable() {
  const params = {
    TableName: TABLE_NAMES.config,
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: 'NEW_AND_OLD_IMAGES'
    }
  };

  try {
    if (await tableExists(TABLE_NAMES.config)) {
      console.log(`- 表 ${TABLE_NAMES.config} 已存在，跳过创建`);
      return false;
    }

    await dynamodb.createTable(params).promise();
    console.log(`✓ 表 ${TABLE_NAMES.config} 创建成功`);
    console.log(`  主键: PK (String)`);
    return true;
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log(`- 表 ${TABLE_NAMES.config} 已存在`);
      return false;
    }
    throw error;
  }
}

/**
 * 创建计数表
 */
async function createCountingTable() {
  const params = {
    TableName: TABLE_NAMES.counting,
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  };

  try {
    if (await tableExists(TABLE_NAMES.counting)) {
      console.log(`- 表 ${TABLE_NAMES.counting} 已存在，跳过创建`);
      return false;
    }

    await dynamodb.createTable(params).promise();
    console.log(`✓ 表 ${TABLE_NAMES.counting} 创建成功`);
    console.log(`  主键: PK (String)`);
    return true;
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log(`- 表 ${TABLE_NAMES.counting} 已存在`);
      return false;
    }
    throw error;
  }
}

/**
 * 创建订单表
 */
async function createOrdersTable() {
  const params = {
    TableName: TABLE_NAMES.orders,
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'TS', AttributeType: 'N' },
      { AttributeName: 'ORDERSTATE', AttributeType: 'S' },
      { AttributeName: 'USERID', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    LocalSecondaryIndexes: [
      {
        IndexName: 'LSI-timestamp',
        KeySchema: [
          { AttributeName: 'PK', KeyType: 'HASH' },
          { AttributeName: 'TS', KeyType: 'RANGE' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        }
      }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'GSI-status',
        KeySchema: [
          { AttributeName: 'ORDERSTATE', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        }
      },
      {
        IndexName: 'GSI-userId',
        KeySchema: [
          { AttributeName: 'USERID', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        }
      }
    ]
  };

  try {
    if (await tableExists(TABLE_NAMES.orders)) {
      console.log(`- 表 ${TABLE_NAMES.orders} 已存在，跳过创建`);
      return false;
    }

    await dynamodb.createTable(params).promise();
    console.log(`✓ 表 ${TABLE_NAMES.orders} 创建成功`);
    console.log(`  分区键: PK (String), 排序键: SK (String)`);
    console.log(`  LSI: LSI-timestamp (PK, TS)`);
    console.log(`  GSI: GSI-status (ORDERSTATE, SK)`);
    console.log(`  GSI: GSI-userId (USERID, SK)`);
    return true;
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log(`- 表 ${TABLE_NAMES.orders} 已存在`);
      return false;
    }
    throw error;
  }
}

/**
 * 创建订单旅程事件表
 */
async function createOrderJourneyEventsTable() {
  const params = {
    TableName: TABLE_NAMES.orderJourneyEvents,
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: 'NEW_AND_OLD_IMAGES'
    }
  };

  try {
    if (await tableExists(TABLE_NAMES.orderJourneyEvents)) {
      console.log(`- 表 ${TABLE_NAMES.orderJourneyEvents} 已存在，跳过创建`);
      return false;
    }

    await dynamodb.createTable(params).promise();
    console.log(`✓ 表 ${TABLE_NAMES.orderJourneyEvents} 创建成功`);
    console.log(`  分区键: PK (String), 排序键: SK (String)`);
    return true;
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log(`- 表 ${TABLE_NAMES.orderJourneyEvents} 已存在`);
      return false;
    }
    throw error;
  }
}

/**
 * 创建用户表
 */
async function createUsersTable() {
  const params = {
    TableName: TABLE_NAMES.users,
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'username', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    GlobalSecondaryIndexes: [
      {
        IndexName: 'GSI-username',
        KeySchema: [
          { AttributeName: 'username', KeyType: 'HASH' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        }
      }
    ]
  };

  try {
    if (await tableExists(TABLE_NAMES.users)) {
      console.log(`- 表 ${TABLE_NAMES.users} 已存在，跳过创建`);
      return false;
    }

    await dynamodb.createTable(params).promise();
    console.log(`✓ 表 ${TABLE_NAMES.users} 创建成功`);
    console.log(`  分区键: PK (String), 排序键: SK (String)`);
    console.log(`  GSI: GSI-username (username)`);
    return true;
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log(`- 表 ${TABLE_NAMES.users} 已存在`);
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
  console.log('Serverlesspresso应用 - DynamoDB表初始化');
  console.log('========================================');
  console.log(`区域: ${awsConfig.region}`);
  console.log('');

  try {
    console.log('步骤1: 创建DynamoDB表');
    console.log('');
    
    const validatorCreated = await createValidatorTable();
    const configCreated = await createConfigTable();
    const countingCreated = await createCountingTable();
    const ordersCreated = await createOrdersTable();
    const orderJourneyCreated = await createOrderJourneyEventsTable();
    const usersCreated = await createUsersTable();
    
    const anyCreated = validatorCreated || configCreated || countingCreated || 
                       ordersCreated || orderJourneyCreated || usersCreated;
    
    if (anyCreated) {
      console.log('');
      console.log('步骤2: 等待表创建完成');
      console.log('');
      
      if (validatorCreated) await waitForTable(TABLE_NAMES.validator);
      if (configCreated) await waitForTable(TABLE_NAMES.config);
      if (countingCreated) await waitForTable(TABLE_NAMES.counting);
      if (ordersCreated) await waitForTable(TABLE_NAMES.orders);
      if (orderJourneyCreated) await waitForTable(TABLE_NAMES.orderJourneyEvents);
      if (usersCreated) await waitForTable(TABLE_NAMES.users);
    }

    console.log('');
    console.log('========================================');
    console.log('✓ 数据库初始化完成！');
    console.log('========================================');
    console.log('');
    console.log('创建的表:');
    console.log(`  1. ${TABLE_NAMES.validator} - 验证表`);
    console.log(`  2. ${TABLE_NAMES.config} - 配置表`);
    console.log(`  3. ${TABLE_NAMES.counting} - 计数表`);
    console.log(`  4. ${TABLE_NAMES.orders} - 订单表`);
    console.log(`  5. ${TABLE_NAMES.orderJourneyEvents} - 订单旅程事件表`);
    console.log(`  6. ${TABLE_NAMES.users} - 用户表`);
    console.log('');
    console.log('现在可以启动应用了:');
    console.log('  npm start');
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
  createValidatorTable,
  createConfigTable,
  createCountingTable,
  createOrdersTable,
  createOrderJourneyEventsTable,
  createUsersTable,
  tableExists,
  main
};
