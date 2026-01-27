/**
 * 搜索集群同步工具函数
 * 用于将书籍数据同步到Elasticsearch
 */

const AWS = require('aws-sdk');
const config = require('../config');

let esClient = null;

/**
 * 初始化Elasticsearch客户端
 */
function initElasticsearchClient() {
  if (config.elasticsearch.enabled && config.elasticsearch.endpoint && !esClient) {
    try {
      const { Client } = require('@elastic/elasticsearch');
      const { createAWSConnection, awsGetCredentials } = require('@acuris/aws-es-connection');

      const awsCredentials = awsGetCredentials();
      const AWSConnection = createAWSConnection(AWS.config.credentials);

      esClient = new Client({
        node: `https://${config.elasticsearch.endpoint}`,
        ...AWSConnection
      });

      console.log('Elasticsearch client initialized for search sync');
    } catch (error) {
      console.error('Failed to initialize Elasticsearch:', error);
      console.warn('Search sync will be disabled');
      esClient = null;
    }
  }
}

/**
 * 将书籍添加或更新到搜索索引
 * @param {string} bookId - 书籍ID
 * @param {Object} bookData - 书籍数据
 * @returns {Promise<boolean>} 是否同步成功
 */
async function indexBook(bookId, bookData) {
  // 如果Elasticsearch未启用，直接返回
  if (!config.elasticsearch.enabled) {
    console.log('Elasticsearch not enabled, skipping search sync');
    return false;
  }

  // 初始化Elasticsearch客户端（如果还未初始化）
  if (!esClient) {
    initElasticsearchClient();
  }

  // 如果初始化失败，返回
  if (!esClient) {
    console.warn('Elasticsearch client not available, skipping search sync');
    return false;
  }

  try {
    const index = config.elasticsearch.index || 'lambda-index';
    
    // 转换DynamoDB数据格式为Elasticsearch格式
    // DynamoDB存储格式可能是 {S: "value"} 的类型标记格式
    const document = convertDynamoDBFormat(bookData);
    
    // 使用书籍ID作为文档ID，如果已存在会更新，不存在会创建
    await esClient.index({
      index: index,
      id: bookId,
      body: document
    });

    console.log(`Indexed book in Elasticsearch: bookId=${bookId}`);
    return true;
  } catch (error) {
    // 搜索索引更新失败不应该影响主业务
    console.error('Failed to index book in Elasticsearch:', error);
    return false;
  }
}

/**
 * 从搜索索引中删除书籍
 * @param {string} bookId - 书籍ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deleteBook(bookId) {
  // 如果Elasticsearch未启用，直接返回
  if (!config.elasticsearch.enabled) {
    console.log('Elasticsearch not enabled, skipping search sync');
    return false;
  }

  // 初始化Elasticsearch客户端（如果还未初始化）
  if (!esClient) {
    initElasticsearchClient();
  }

  // 如果初始化失败，返回
  if (!esClient) {
    console.warn('Elasticsearch client not available, skipping search sync');
    return false;
  }

  try {
    const index = config.elasticsearch.index || 'lambda-index';
    
    await esClient.delete({
      index: index,
      id: bookId
    });

    console.log(`Deleted book from Elasticsearch: bookId=${bookId}`);
    return true;
  } catch (error) {
    // 如果文档不存在，也不算错误
    if (error.meta && error.meta.statusCode === 404) {
      console.log(`Book not found in Elasticsearch (already deleted): bookId=${bookId}`);
      return true;
    }
    
    // 其他错误
    console.error('Failed to delete book from Elasticsearch:', error);
    return false;
  }
}

/**
 * 批量索引书籍
 * @param {Array} books - 书籍数组，每个元素包含 {id, ...bookData}
 * @returns {Promise<Object>} 索引结果统计
 */
async function bulkIndexBooks(books) {
  if (!books || books.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const book of books) {
    const result = await indexBook(book.id, book);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * 转换DynamoDB格式为普通JSON格式
 * DynamoDB可能使用类型标记格式如 {S: "value", N: "123"}
 * 需要转换为普通格式 {field: "value", number: 123}
 * @param {Object} data - DynamoDB格式的数据
 * @returns {Object} 普通JSON格式的数据
 */
function convertDynamoDBFormat(data) {
  const result = {};
  
  for (const key in data) {
    const value = data[key];
    
    // 如果是DynamoDB类型标记格式
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // 检查是否有类型标记
      if ('S' in value) {
        // 字符串类型
        result[key] = { S: value.S };
      } else if ('N' in value) {
        // 数字类型
        result[key] = { N: value.N };
      } else if ('BOOL' in value) {
        // 布尔类型
        result[key] = { BOOL: value.BOOL };
      } else if ('L' in value) {
        // 列表类型
        result[key] = { L: value.L };
      } else if ('M' in value) {
        // Map类型
        result[key] = { M: value.M };
      } else {
        // 普通对象，直接使用
        result[key] = value;
      }
    } else {
      // 普通值，直接使用
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * 关闭Elasticsearch客户端（用于应用关闭时）
 */
function closeElasticsearchClient() {
  if (esClient) {
    esClient.close();
    esClient = null;
  }
}

module.exports = {
  indexBook,
  deleteBook,
  bulkIndexBooks,
  closeElasticsearchClient
};



