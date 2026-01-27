# 架构说明和转换文档

## 概述

本文档详细说明了从AWS Serverless应用到单体应用的转换过程和架构差异。

## 原Serverless架构

### 技术栈

**前端:**
- React应用
- Amazon CloudFront + S3
- Amazon Cognito (用户认证)

**后端:**
- AWS Lambda (多个独立函数)
- Amazon API Gateway
- Amazon DynamoDB
- Amazon ElastiCache Redis
- Amazon Neptune
- Amazon Elasticsearch

**开发工具:**
- AWS CodePipeline
- AWS CodeBuild
- AWS CodeCommit

### Lambda函数列表

原应用包含以下Lambda函数:

**API函数 (JavaScript):**
1. `listBooks.js` - 列出书籍
2. `getBook.js` - 获取单本书
3. `addToCart.js` - 添加到购物车
4. `listItemsInCart.js` - 列出购物车
5. `getCartItem.js` - 获取购物车项
6. `updateCart.js` - 更新购物车
7. `removeFromCart.js` - 删除购物车项
8. `checkout.js` - 结账
9. `listOrders.js` - 列出订单
10. `getBestSellers.js` - 获取畅销书

**API函数 (Python):**
11. `getRecommendations.py` - 获取推荐
12. `getRecommendationsByBook.py` - 按书获取推荐
13. `search.py` - 搜索书籍

**Streaming函数:**
14. `updateBestSellers.js` - 更新畅销书(DynamoDB Streams触发)
15. `updateSearchCluster.py` - 更新搜索集群(DynamoDB Streams触发)

**Setup函数:**
16. `uploadBooks.js` - 上传初始书籍数据

## 转换后的单体架构

### 技术栈

**前端:**
- React应用(保持不变)
- 可部署到任何Web服务器

**后端:**
- Node.js + Express.js
- AWS DynamoDB
- Redis (可选)
- Elasticsearch (可选)
- Neptune (可选)

**部署:**
- 传统服务器部署
- 或容器化部署(Docker/K8s)

### 应用结构

```
monolith-app/
├── server.js              # Express服务器主入口
├── config.js              # 统一配置管理
├── routes/                # 路由模块(替代Lambda函数)
│   ├── books.js          # 书籍相关API
│   ├── cart.js           # 购物车API
│   ├── orders.js         # 订单API
│   ├── bestsellers.js    # 畅销书API
│   ├── recommendations.js # 推荐系统API
│   └── search.js         # 搜索API
├── scripts/              # 工具脚本
│   ├── init-db.js       # 数据库初始化
│   └── test-api.sh      # API测试
└── package.json          # 依赖管理
```

## 转换映射表

### Lambda函数 → Express路由

| 原Lambda函数 | 转换后路由 | HTTP方法 | 路径 |
|-------------|-----------|----------|------|
| listBooks.js | routes/books.js | GET | /books |
| getBook.js | routes/books.js | GET | /books/:id |
| addToCart.js | routes/cart.js | POST | /cart |
| listItemsInCart.js | routes/cart.js | GET | /cart |
| getCartItem.js | routes/cart.js | GET | /cart/:bookId |
| updateCart.js | routes/cart.js | PUT | /cart |
| removeFromCart.js | routes/cart.js | DELETE | /cart |
| checkout.js | routes/orders.js | POST | /orders |
| listOrders.js | routes/orders.js | GET | /orders |
| getBestSellers.js | routes/bestsellers.js | GET | /bestsellers |
| getRecommendations.py | routes/recommendations.js | GET | /recommendations |
| getRecommendationsByBook.py | routes/recommendations.js | GET | /recommendations/:bookId |
| search.py | routes/search.js | GET | /search?q=keyword |

### 特殊功能转换

**1. DynamoDB Streams → 业务逻辑整合**

原架构中的Streaming函数通过DynamoDB Streams自动触发:
- `updateBestSellers.js` - 订单创建时更新Redis
- `updateSearchCluster.py` - 书籍更新时同步到ES

单体架构中的处理方式:
- 直接在业务逻辑中处理
- 或使用后台任务/消息队列异步处理
- 本转换中暂时移除了自动更新机制

**2. API Gateway → Express中间件**

原架构使用API Gateway处理:
- CORS
- 认证(Cognito)
- 请求/响应转换

单体架构使用Express中间件:
```javascript
// CORS
app.use(cors());

// 认证
app.use((req, res, next) => {
  req.customerId = req.headers['x-customer-id'];
  next();
});
```

**3. Cognito认证 → 简化认证**

原架构:
```javascript
event.requestContext.identity.cognitoIdentityId
```

单体架构:
```javascript
req.customerId  // 从请求头获取
```

## 关键差异

### 1. 语言统一

**原架构:** JavaScript + Python混合
**单体架构:** 统一使用JavaScript/Node.js

**转换说明:**
- Python的Gremlin查询转换为JavaScript的gremlin库
- Python的Elasticsearch查询转换为JavaScript的@elastic/elasticsearch库

### 2. 事件驱动 → 请求响应

**原架构:**
```javascript
exports.handler = (event, context, callback) => {
  // Lambda事件处理
  callback(null, response);
}
```

**单体架构:**
```javascript
router.get('/endpoint', async (req, res, next) => {
  // Express请求处理
  res.json(data);
});
```

### 3. 环境变量

**原架构:**
- 通过CloudFormation传递
- Lambda环境变量

**单体架构:**
- 通过.env文件管理
- 使用dotenv库加载

### 4. 服务连接

**原架构:**
- Lambda自动获取IAM权限
- VPC配置自动处理

**单体架构:**
- 需要配置AWS凭证
- 需要配置网络访问

## 功能对比

### 保留的核心功能

✅ 书籍浏览和查询
✅ 购物车管理
✅ 订单创建和查询
✅ 畅销书榜单(需Redis)
✅ 推荐系统(需Neptune)
✅ 搜索功能(需Elasticsearch)

### 移除的功能

❌ 自动扩展(Lambda特性)
❌ 按使用付费(Lambda特性)
❌ DynamoDB Streams自动触发
❌ CloudFront CDN分发
❌ Cognito用户管理
❌ CodePipeline CI/CD

### 简化的功能

⚠️ 用户认证: 从Cognito改为请求头传递
⚠️ 实时更新: 从Streams触发改为同步更新或手动触发

## 性能对比

### Serverless架构

**优势:**
- 自动扩展
- 无需管理服务器
- 按使用付费
- 全球分发(CloudFront)

**劣势:**
- 冷启动延迟
- 调试复杂
- 本地测试困难
- 函数间调用开销

### 单体架构

**优势:**
- 无冷启动
- 易于调试
- 本地开发简单
- 函数间调用快速

**劣势:**
- 需要手动扩展
- 固定成本
- 需要管理服务器
- 单点故障风险

## 数据库设计

数据库结构保持不变,使用相同的DynamoDB表:

### Books表
```javascript
{
  id: string (PK)
  name: string
  author: string
  category: string (GSI)
  price: number
  rating: number
  cover: string
}
```

### Cart表
```javascript
{
  customerId: string (PK)
  bookId: string (SK)
  quantity: number
  price: number
}
```

### Orders表
```javascript
{
  customerId: string (PK)
  orderId: string (SK)
  orderDate: number
  books: array
}
```

## 部署对比

### Serverless部署

```bash
# 使用CloudFormation一键部署
aws cloudformation create-stack \
  --stack-name bookstore \
  --template-body file://template.yaml
```

### 单体部署

```bash
# 安装依赖
npm install

# 配置环境
cp env.example .env
vim .env

# 初始化数据库
npm run init-db

# 启动应用
npm start
```

## 成本对比

### Serverless成本

- Lambda: 按调用次数和执行时间
- API Gateway: 按请求数
- DynamoDB: 按读写容量
- Redis/ES/Neptune: 固定实例成本
- 估计: ~$0.45/小时(轻度使用)

### 单体成本

- EC2实例: 固定月费
- DynamoDB: 按读写容量
- Redis/ES/Neptune: 固定实例成本(可选)
- 估计: 取决于实例规格

## 扩展建议

### 1. 添加认证系统

可以集成:
- JWT认证
- OAuth 2.0
- Passport.js

### 2. 添加缓存层

```javascript
// 在routes中添加缓存
const cache = new Map();
if (cache.has(key)) {
  return res.json(cache.get(key));
}
```

### 3. 添加日志系统

```javascript
const winston = require('winston');
// 配置日志
```

### 4. 添加监控

```javascript
const prometheus = require('prom-client');
// 添加指标收集
```

### 5. 容器化部署

```dockerfile
FROM node:14
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 迁移路径

### 从Serverless到单体

1. 导出DynamoDB数据
2. 部署单体应用
3. 配置环境变量
4. 导入数据
5. 更新前端API端点
6. 测试验证
7. 切换流量

### 从单体回到Serverless

1. 将Express路由拆分为Lambda函数
2. 添加API Gateway配置
3. 部署Lambda函数
4. 更新前端API端点
5. 测试验证
6. 切换流量

## 总结

本转换将AWS Serverless应用成功转换为传统单体应用:

✅ **功能完整性**: 保留了所有核心业务功能
✅ **代码质量**: 遵循Express.js最佳实践
✅ **易于维护**: 清晰的模块化结构
✅ **灵活部署**: 支持多种部署方式
✅ **优雅降级**: 可选服务失败不影响核心功能

单体应用更适合:
- 开发和调试
- 学习和实验
- 小规模部署
- 成本敏感场景

Serverless更适合:
- 自动扩展需求
- 按需付费模式
- 全球分发需求
- 无服务器运维

