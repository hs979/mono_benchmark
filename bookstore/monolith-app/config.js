/**
 * 应用配置文件
 * 管理所有环境变量和配置参数
 */

// 加载环境变量
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const JWT_ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_TOKEN_EXPIRY || '1h';
const JWT_REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d';
const AUTH_DEV_MODE = process.env.AUTH_DEV_MODE === 'true';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const BOOKS_TABLE = process.env.BOOKS_TABLE || 'Bookstore-Books';
const CART_TABLE = process.env.CART_TABLE || 'Bookstore-Cart';
const ORDERS_TABLE = process.env.ORDERS_TABLE || 'Bookstore-Orders';
const USERS_TABLE = process.env.USERS_TABLE || 'Bookstore-Users';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';
const ES_ENDPOINT = process.env.ES_ENDPOINT || 'localhost:9200';
const ES_INDEX = process.env.ES_INDEX || 'lambda-index';
const ES_TYPE = process.env.ES_TYPE || 'lambda-type';
const ES_ENABLED = process.env.ES_ENABLED !== 'false';
const NEPTUNE_ENDPOINT = process.env.NEPTUNE_ENDPOINT;
const NEPTUNE_PORT = process.env.NEPTUNE_PORT || 8182;
const NEPTUNE_ENABLED = process.env.NEPTUNE_ENABLED !== 'false';

const config = {
  // 服务器配置
  port: PORT,
  nodeEnv: NODE_ENV,

  // JWT配置
  jwt: {
    secret: JWT_SECRET,
    refreshSecret: JWT_REFRESH_SECRET,
    accessTokenExpiry: JWT_ACCESS_TOKEN_EXPIRY,
    refreshTokenExpiry: JWT_REFRESH_TOKEN_EXPIRY
  },

  // 认证模式配置
  auth: {
    // 开发模式：允许使用x-customer-id请求头跳过JWT验证
    // 生产模式：必须使用JWT认证
    devMode: AUTH_DEV_MODE
  },

  // AWS配置
  aws: {
    region: AWS_REGION,
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  },

  // DynamoDB表名
  dynamodb: {
    booksTable: BOOKS_TABLE,
    cartTable: CART_TABLE,
    ordersTable: ORDERS_TABLE,
    usersTable: USERS_TABLE
  },

  // Redis配置
  redis: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    enabled: REDIS_ENABLED // 默认启用
  },

  // Elasticsearch配置
  elasticsearch: {
    endpoint: ES_ENDPOINT,
    index: ES_INDEX,
    type: ES_TYPE,
    enabled: ES_ENABLED // 默认启用
  },

  // Neptune配置
  neptune: {
    endpoint: NEPTUNE_ENDPOINT,
    port: NEPTUNE_PORT,
    enabled: NEPTUNE_ENABLED // 默认启用
  }
};

module.exports = config;

