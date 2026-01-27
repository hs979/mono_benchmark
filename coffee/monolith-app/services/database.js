
/**
 * DynamoDB数据库服务
 * 使用AWS DynamoDB作为数据存储
 */

const AWS = require('aws-sdk');

// 配置AWS SDK
// 注意：请确保已配置AWS凭证，可以通过以下方式之一：
// 1. 环境变量：AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY
// 2. AWS凭证文件：~/.aws/credentials
// 3. IAM角色（如果在EC2上运行）

const options = {
  region: process.env.AWS_REGION || 'us-east-1'
};

const dynamoDB = new AWS.DynamoDB.DocumentClient(options);

// DynamoDB表名配置
const TABLE_NAMES = {
  validator: process.env.VALIDATOR_TABLE || 'presso-validator',
  config: process.env.CONFIG_TABLE || 'presso-config-table',
  orders: process.env.ORDER_TABLE || 'presso-order-table',
  counting: process.env.COUNTING_TABLE || 'presso-counting-table',
  orderJourneyEvents: process.env.ORDER_JOURNEY_TABLE || 'presso-order-journey-events',
  users: process.env.USERS_TABLE || 'presso-users'
};

/**
 * 初始化数据库，加载初始数据
 */
async function initialize() {
  console.log('[Database] 正在初始化DynamoDB数据...');
  
  try {
    // 初始化默认配置
    const defaultConfig = {
      PK: 'config-ABC',
      drinksPerBarcode: 10,
      end: '2022-06-22',
      language: 'pt',
      maxOrdersInQueue: 10,
      maxOrdersPerUser: 1,
      menu: [
        {
          available: true,
          drink: 'Americano',
          icon: 'barista-icons_americano-alternative',
          modifiers: [
            {
              Name: 'Milk',
              Options: ['Regular', 'Oat']
            }
          ]
        },
        {
          available: true,
          drink: 'Flat White',
          icon: 'barista-icons_flat-white-alternative@2x',
          modifiers: [
            {
              Name: 'Milk',
              Options: ['Regular', 'Oat']
            }
          ]
        },
        {
          available: false,
          drink: 'Cappuccino',
          icon: 'barista-icons_cappuccino',
          modifiers: [
            {
              Name: 'Milk',
              Options: ['Regular', 'Oat']
            }
          ]
        },
        {
          available: true,
          drink: 'Singe Espresso',
          icon: 'barista-icons_espresso-alternative',
          modifiers: []
        },
        {
          available: true,
          drink: 'Double Espresso',
          icon: 'barista-icons_espresso-alternative',
          modifiers: []
        }
      ],
      region: 'us-west-2',
      requester: 'admin',
      start: '2022-10-26',
      storeOpen: true
    };
    
    // 检查配置是否已存在
    const existingConfig = await getItem('config', { PK: 'config-ABC' });
    if (!existingConfig) {
      await putItem('config', defaultConfig);
      console.log('[Database] - 默认配置已创建');
    } else {
      console.log('[Database] - 配置已存在，跳过创建');
    }
    
    // 初始化计数器
    const existingCounter = await getItem('counting', { PK: 'orderID-ABC' });
    if (!existingCounter) {
      await putItem('counting', {
        PK: 'orderID-ABC',
        IDvalue: 0
      });
      console.log('[Database] - 订单计数器已创建');
    } else {
      console.log('[Database] - 订单计数器已存在，跳过创建');
    }
    
    console.log('[Database] DynamoDB数据初始化完成');
  } catch (error) {
    console.error('[Database] 初始化错误:', error);
    throw error;
  }
}

/**
 * 在表中放置项目
 */
async function putItem(tableName, item) {
  const table = TABLE_NAMES[tableName];
  if (!table) {
    throw new Error(`Table ${tableName} does not exist in configuration`);
  }
  
  const params = {
    TableName: table,
    Item: {
      ...item,
      updatedAt: Date.now()
    }
  };
  
  try {
    await dynamoDB.put(params).promise();
    console.log(`[Database] PUT ${tableName}: ${item.PK}${item.SK ? '#' + item.SK : ''}`);
    return item;
  } catch (error) {
    console.error(`[Database] PUT ${tableName} 错误:`, error);
    throw error;
  }
}

/**
 * 从表中获取项目
 */
async function getItem(tableName, key) {
  const table = TABLE_NAMES[tableName];
  if (!table) {
    throw new Error(`Table ${tableName} does not exist in configuration`);
  }
  
  const params = {
    TableName: table,
    Key: key
  };
  
  try {
    const result = await dynamoDB.get(params).promise();
    const item = result.Item || null;
    console.log(`[Database] GET ${tableName}: ${key.PK}${key.SK ? '#' + key.SK : ''} - ${item ? '找到' : '未找到'}`);
    return item;
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      console.log(`[Database] GET ${tableName}: ${key.PK}${key.SK ? '#' + key.SK : ''} - 表或项目未找到，将尝试初始化`);
      return null;
    }
    console.error(`[Database] GET ${tableName} 错误:`, error);
    throw error;
  }
}

/**
 * 更新表中的项目
 */
async function updateItem(tableName, key, updates) {
  const table = TABLE_NAMES[tableName];
  if (!table) {
    throw new Error(`Table ${tableName} does not exist in configuration`);
  }
  
  // 构建更新表达式
  const updateExpressionParts = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};
  
  let index = 0;
  for (const [attr, value] of Object.entries(updates)) {
    const attrName = `#attr${index}`;
    const attrValue = `:val${index}`;
    updateExpressionParts.push(`${attrName} = ${attrValue}`);
    expressionAttributeNames[attrName] = attr;
    expressionAttributeValues[attrValue] = value;
    index++;
  }
  
  // 添加更新时间戳
  updateExpressionParts.push(`#updatedAt = :updatedAt`);
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = Date.now();
  
  const params = {
    TableName: table,
    Key: key,
    UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  };
  
  try {
    const result = await dynamoDB.update(params).promise();
    console.log(`[Database] UPDATE ${tableName}: ${key.PK}${key.SK ? '#' + key.SK : ''}`);
    return result.Attributes;
  } catch (error) {
    console.error(`[Database] UPDATE ${tableName} 错误:`, error);
    throw error;
  }
}

/**
 * 从表中删除项目
 */
async function deleteItem(tableName, key) {
  const table = TABLE_NAMES[tableName];
  if (!table) {
    throw new Error(`Table ${tableName} does not exist in configuration`);
  }
  
  const params = {
    TableName: table,
    Key: key
  };
  
  try {
    await dynamoDB.delete(params).promise();
    console.log(`[Database] DELETE ${tableName}: ${key.PK}${key.SK ? '#' + key.SK : ''} - 成功`);
    return true;
  } catch (error) {
    console.error(`[Database] DELETE ${tableName} 错误:`, error);
    throw error;
  }
}

/**
 * 查询表
 */
async function query(tableName, options) {
  const table = TABLE_NAMES[tableName];
  if (!table) {
    throw new Error(`Table ${tableName} does not exist in configuration`);
  }
  
  const { PK, SK, IndexName, ORDERSTATE, USERID, Limit = 100 } = options;
  
  let params = {
    TableName: table,
    Limit: Limit
  };
  
  // 根据索引类型构建查询
  if (IndexName === 'GSI-status' && ORDERSTATE) {
    params.IndexName = 'GSI-status';
    params.KeyConditionExpression = 'ORDERSTATE = :orderState';
    params.ExpressionAttributeValues = {
      ':orderState': ORDERSTATE
    };
  } else if (IndexName === 'GSI-userId' && USERID) {
    params.IndexName = 'GSI-userId';
    params.KeyConditionExpression = 'USERID = :userId';
    params.ExpressionAttributeValues = {
      ':userId': USERID
    };
  } else if (PK) {
    // 基于主键查询
    if (SK) {
      params.KeyConditionExpression = 'PK = :pk AND SK = :sk';
      params.ExpressionAttributeValues = {
        ':pk': PK,
        ':sk': SK
      };
    } else {
      params.KeyConditionExpression = 'PK = :pk';
      params.ExpressionAttributeValues = {
        ':pk': PK
      };
    }
  }
  
  try {
    const result = await dynamoDB.query(params).promise();
    console.log(`[Database] QUERY ${tableName}: 找到 ${result.Items.length} 条记录`);
    return result.Items || [];
  } catch (error) {
    console.error(`[Database] QUERY ${tableName} 错误:`, error);
    throw error;
  }
}

/**
 * 扫描整个表
 */
async function scan(tableName, options = {}) {
  const table = TABLE_NAMES[tableName];
  if (!table) {
    throw new Error(`Table ${tableName} does not exist in configuration`);
  }
  
  const { Limit = 100 } = options;
  
  const params = {
    TableName: table,
    Limit: Limit
  };
  
  try {
    const result = await dynamoDB.scan(params).promise();
    console.log(`[Database] SCAN ${tableName}: 找到 ${result.Items.length} 条记录`);
    return result.Items || [];
  } catch (error) {
    console.error(`[Database] SCAN ${tableName} 错误:`, error);
    throw error;
  }
}

/**
 * 原子性增加计数器
 */
async function incrementCounter(tableName, key, incrementValue = 1) {
  const table = TABLE_NAMES[tableName];
  if (!table) {
    throw new Error(`Table ${tableName} does not exist in configuration`);
  }
  
  const params = {
    TableName: table,
    Key: key,
    UpdateExpression: 'SET IDvalue = if_not_exists(IDvalue, :start) + :inc, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':inc': incrementValue,
      ':start': 0,
      ':updatedAt': Date.now()
    },
    ReturnValues: 'ALL_NEW'
  };
  
  try {
    const result = await dynamoDB.update(params).promise();
    const newValue = result.Attributes.IDvalue;
    console.log(`[Database] INCREMENT ${tableName}: ${key.PK}${key.SK ? '#' + key.SK : ''} -> ${newValue}`);
    return newValue;
  } catch (error) {
    console.error(`[Database] INCREMENT ${tableName} 错误:`, error);
    throw error;
  }
}

/**
 * 获取表的统计信息
 * 注意：DynamoDB不支持直接获取表大小，这里返回近似值
 */
async function getStats() {
  const stats = {};
  
  for (const [logicalName, tableName] of Object.entries(TABLE_NAMES)) {
    try {
      const result = await dynamoDB.scan({
        TableName: tableName,
        Select: 'COUNT'
      }).promise();
      stats[logicalName] = result.Count || 0;
    } catch (error) {
      console.error(`[Database] 获取 ${logicalName} 统计信息错误:`, error);
      stats[logicalName] = 0;
    }
  }
  
  return stats;
}

/**
 * 清空所有表（用于测试）
 * 警告：这个操作会删除表中的所有数据！
 */
async function clearAll() {
  console.log('[Database] 警告：开始清空所有表...');
  
  for (const [logicalName, tableName] of Object.entries(TABLE_NAMES)) {
    try {
      // 扫描表获取所有项目
      const result = await dynamoDB.scan({
        TableName: tableName
      }).promise();
      
      // 批量删除
      if (result.Items && result.Items.length > 0) {
        for (const item of result.Items) {
          const key = { PK: item.PK };
          if (item.SK) {
            key.SK = item.SK;
          }
          await dynamoDB.delete({
            TableName: tableName,
            Key: key
          }).promise();
        }
        console.log(`[Database] 已清空表 ${logicalName}: ${result.Items.length} 条记录`);
      }
    } catch (error) {
      console.error(`[Database] 清空表 ${logicalName} 错误:`, error);
    }
  }
  
  console.log('[Database] 所有表已清空');
}

/**
 * 获取用户（用于认证）
 */
async function getUserByUsername(username) {
  try {
    const result = await dynamoDB.query({
      TableName: TABLE_NAMES.users,
      IndexName: 'GSI-username',
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: {
        ':username': username
      }
    }).promise();
    
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  } catch (error) {
    console.error('[Database] 查询用户错误:', error);
    throw error;
  }
}

/**
 * 创建用户
 */
async function createUser(userData) {
  const userId = `user-${Date.now()}`;
  const user = {
    PK: userId,
    SK: 'profile',
    userId: userId,
    username: userData.username,
    passwordHash: userData.passwordHash,
    role: userData.role || 'user',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  await putItem('users', user);
  return user;
}

module.exports = {
  initialize,
  putItem,
  getItem,
  updateItem,
  deleteItem,
  query,
  scan,
  incrementCounter,
  getStats,
  clearAll,
  getUserByUsername,
  createUser,
  TABLE_NAMES
};
