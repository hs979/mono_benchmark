/**
 * 数据库初始化脚本
 * 创建DynamoDB表和初始化示例数据
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { aws, dynamodb: dynamodbConfig } = require('../config');
const { dynamodb, docClient } = require('../utils/dynamodb');
const { bulkIndexBooks } = require('../utils/search-sync');


const booksTable = dynamodbConfig.booksTable;
const cartTable = dynamodbConfig.cartTable;
const ordersTable = dynamodbConfig.ordersTable;
const usersTable = dynamodbConfig.usersTable;

// 示例书籍数据
const sampleBooks = [
  {
    id: 'book-001',
    name: 'JavaScript高级程序设计',
    author: 'Nicholas C. Zakas',
    category: 'programming',
    price: 99.00,
    rating: 4.8,
    cover: 'https://example.com/covers/js.jpg'
  },
  {
    id: 'book-002',
    name: 'Node.js开发指南',
    author: 'BYVoid',
    category: 'programming',
    price: 69.00,
    rating: 4.5,
    cover: 'https://example.com/covers/nodejs.jpg'
  },
  {
    id: 'book-003',
    name: '深入理解计算机系统',
    author: 'Randal E. Bryant',
    category: 'computer-science',
    price: 139.00,
    rating: 4.9,
    cover: 'https://example.com/covers/csapp.jpg'
  },
  {
    id: 'book-004',
    name: '代码整洁之道',
    author: 'Robert C. Martin',
    category: 'programming',
    price: 89.00,
    rating: 4.7,
    cover: 'https://example.com/covers/clean-code.jpg'
  },
  {
    id: 'book-005',
    name: '设计模式',
    author: 'Erich Gamma',
    category: 'programming',
    price: 109.00,
    rating: 4.6,
    cover: 'https://example.com/covers/design-patterns.jpg'
  }
];

/**
 * 创建Books表
 */
async function createBooksTable() {
  const params = {
    TableName: booksTable,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'category', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'category-index',
        KeySchema: [
          { AttributeName: 'category', KeyType: 'HASH' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };

  try {
    await dynamodb.createTable(params).promise();
    console.log(`✓ 表 ${booksTable} 创建成功`);
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log(`- 表 ${booksTable} 已存在`);
    } else {
      throw error;
    }
  }
}

/**
 * 创建Cart表
 */
async function createCartTable() {
  const params = {
    TableName: cartTable,
    KeySchema: [
      { AttributeName: 'customerId', KeyType: 'HASH' },
      { AttributeName: 'bookId', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'customerId', AttributeType: 'S' },
      { AttributeName: 'bookId', AttributeType: 'S' }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };

  try {
    await dynamodb.createTable(params).promise();
    console.log(`✓ 表 ${cartTable} 创建成功`);
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log(`- 表 ${cartTable} 已存在`);
    } else {
      throw error;
    }
  }
}

/**
 * 创建Orders表
 */
async function createOrdersTable() {
  const params = {
    TableName: ordersTable,
    KeySchema: [
      { AttributeName: 'customerId', KeyType: 'HASH' },
      { AttributeName: 'orderId', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'customerId', AttributeType: 'S' },
      { AttributeName: 'orderId', AttributeType: 'S' }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };

  try {
    await dynamodb.createTable(params).promise();
    console.log(`✓ 表 ${ordersTable} 创建成功`);
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log(`- 表 ${ordersTable} 已存在`);
    } else {
      throw error;
    }
  }
}

/**
 * 创建Users表
 */
async function createUsersTable() {
  const params = {
    TableName: usersTable,
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'email-index',
        KeySchema: [
          { AttributeName: 'email', KeyType: 'HASH' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };

  try {
    await dynamodb.createTable(params).promise();
    console.log(`✓ 表 ${usersTable} 创建成功`);
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log(`- 表 ${usersTable} 已存在`);
    } else {
      throw error;
    }
  }
}

/**
 * 等待表变为ACTIVE状态
 */
async function waitForTable(tableName) {
  console.log(`等待表 ${tableName} 变为ACTIVE状态...`);
  let isActive = false;
  
  while (!isActive) {
    try {
      const result = await dynamodb.describeTable({ TableName: tableName }).promise();
      if (result.Table.TableStatus === 'ACTIVE') {
        isActive = true;
        console.log(`✓ 表 ${tableName} 已就绪`);
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

/**
 * 初始化示例书籍数据
 */
async function initializeSampleBooks() {
  console.log('开始初始化示例书籍数据...');
  
  for (const book of sampleBooks) {
    const params = {
      TableName: booksTable,
      Item: book
    };

    try {
      await docClient.put(params).promise();
      console.log(`✓ 添加书籍: ${book.name}`);
    } catch (error) {
      console.error(`✗ 添加书籍失败 ${book.name}:`, error.message);
    }
  }
  
  console.log('✓ 示例数据初始化完成');
}

/**
 * 同步书籍数据到Elasticsearch搜索集群
 */
async function syncBooksToElasticsearch() {
  console.log('开始同步书籍数据到Elasticsearch...');
  const config = require('../config');
  if (!config.elasticsearch.enabled) {
    console.log('- Elasticsearch未启用，跳过同步');
    return;
  }
  
  try {
    const result = await bulkIndexBooks(sampleBooks);
    
    if (result.success > 0) {
      console.log(`✓ 成功索引 ${result.success} 本书籍到Elasticsearch`);
    }
    
    if (result.failed > 0) {
      console.warn(`⚠ 有 ${result.failed} 本书籍索引失败`);
    }
    
    if (result.success === 0 && result.failed === 0) {
      console.log('- 没有书籍需要索引');
    }
  } catch (error) {
    console.error('✗ 同步到Elasticsearch失败:', error.message);
    console.warn('搜索功能可能不可用，但不影响其他功能');
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('AWS Bookstore 数据库初始化');
  console.log('========================================\n');

  try {
    // 创建表
    console.log('步骤1: 创建DynamoDB表\n');
    await createBooksTable();
    await createCartTable();
    await createOrdersTable();
    await createUsersTable();

    console.log('\n步骤2: 等待表创建完成\n');
    await waitForTable(booksTable);
    await waitForTable(cartTable);
    await waitForTable(ordersTable);
    await waitForTable(usersTable);

    // 初始化数据
    console.log('\n步骤3: 初始化示例数据\n');
    await initializeSampleBooks();

    // 同步到Elasticsearch
    console.log('\n步骤4: 同步数据到Elasticsearch\n');
    await syncBooksToElasticsearch();

    console.log('\n========================================');
    console.log('✓ 数据库初始化完成!');
    console.log('========================================');
  } catch (error) {
    console.error('\n✗ 初始化失败:', error);
    process.exit(1);
  }
}

// 如果需要dotenv
try {
  require('dotenv').config();
} catch (e) {
  // dotenv可能未安装,忽略
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { main };

