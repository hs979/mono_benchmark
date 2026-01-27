/**
 * 搜索路由
 * 使用Elasticsearch提供全文搜索功能
 */

const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const config = require('../config');

// Elasticsearch客户端(使用AWS签名请求)
let esClient = null;

// 初始化Elasticsearch客户端
function initElasticsearch() {
  if (config.elasticsearch.enabled && config.elasticsearch.endpoint) {
    try {
      // 使用 @elastic/elasticsearch 库
      const { Client } = require('@elastic/elasticsearch');
      const { createAWSConnection, awsGetCredentials } = require('@acuris/aws-es-connection');

      const awsCredentials = awsGetCredentials();
      const AWSConnection = createAWSConnection(AWS.config.credentials);

      esClient = new Client({
        node: `https://${config.elasticsearch.endpoint}`,
        ...AWSConnection
      });

      console.log('Elasticsearch client initialized');
    } catch (error) {
      console.error('Failed to initialize Elasticsearch:', error);
      console.warn('Will use simplified search without Elasticsearch');
      esClient = null;
    }
  }
}

// 初始化Elasticsearch
initElasticsearch();

/**
 * GET /search?q=keyword
 * 搜索书籍(按书名、作者、分类)
 * 查询参数: q - 搜索关键词
 */
router.get('/', async (req, res, next) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({ 
        error: 'Missing required query parameter: q' 
      });
    }

    // 如果Elasticsearch未启用或未连接,使用DynamoDB扫描作为备选方案
    if (!config.elasticsearch.enabled || !esClient) {
      console.warn('Elasticsearch not available, using DynamoDB scan');
      return await searchWithDynamoDB(query, req, res, next);
    }

    // 构建Elasticsearch查询
    const searchQuery = {
      index: config.elasticsearch.index,
      body: {
        size: 25,
        query: {
          multi_match: {
            query: query,
            fields: ['name.S', 'author.S', 'category.S']
          }
        }
      }
    };

    const result = await esClient.search(searchQuery);

    // 返回搜索结果
    res.json({
      total: result.body.hits.total.value || result.body.hits.total,
      hits: result.body.hits.hits
    });
  } catch (error) {
    console.error('Error in GET /search:', error);
    // 如果Elasticsearch出错,回退到DynamoDB搜索
    try {
      await searchWithDynamoDB(req.query.q, req, res, next);
    } catch (fallbackError) {
      next(fallbackError);
    }
  }
});

/**
 * 使用DynamoDB扫描作为搜索的备选方案
 * 这是一个简化的搜索实现,性能较低
 */
async function searchWithDynamoDB(query, req, res, next) {
  const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: config.aws.region
  });

  const params = {
    TableName: config.dynamodb.booksTable
  };

  const data = await dynamoDb.scan(params).promise();
  
  // 简单的字符串匹配搜索
  const lowerQuery = query.toLowerCase();
  const results = data.Items.filter(item => {
    return (
      (item.name && item.name.toLowerCase().includes(lowerQuery)) ||
      (item.author && item.author.toLowerCase().includes(lowerQuery)) ||
      (item.category && item.category.toLowerCase().includes(lowerQuery))
    );
  });

  res.json({
    total: results.length,
    hits: results.map(item => ({
      _source: item
    }))
  });
}

module.exports = router;

