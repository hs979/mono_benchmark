# 电商平台单体应用

这是一个单体应用，使用Python Flask框架实现。

## 项目概述

本应用是一个完整的电商平台后端系统，包含以下核心功能：

- **产品管理**：产品信息的存储、查询和验证
- **订单管理**：订单创建、查询和状态跟踪
- **支付处理**：支付预授权、验证和处理（包含模拟的第三方支付服务）
- **配送定价**：根据产品和地址计算配送费用
- **仓库管理**：包装请求的创建和管理
- **配送管理**：配送请求的创建和状态跟踪

## 技术栈

- **Web框架**：Flask 2.3.3
- **数据库**：SQLite3（轻量级、无需额外配置）
- **编程语言**：Python 3.7+
- **API风格**：RESTful API

## 项目结构

```
monolith-app/
├── app.py              # 主应用文件，包含所有API端点
├── database.py         # 数据库模块，处理数据库连接和初始化
├── services.py         # 业务服务模块，包含所有业务逻辑
├── requirements.txt    # Python依赖包列表
├── README.md          # 本文件
└── ecommerce.db       # SQLite数据库文件（运行后自动创建）
```

## 快速开始

### 1. 环境要求

- Python 3.7 或更高版本
- pip（Python包管理器）

### 2. 安装依赖

```bash
# 进入项目目录
cd monolith-app

# 安装Python依赖包
pip install -r requirements.txt
```

### 3. 运行应用

```bash
# 直接运行应用（开发模式）
python app.py
```

应用将在 `http://localhost:5000` 启动。

首次运行时，应用会自动：
1. 创建SQLite数据库文件（ecommerce.db）
2. 初始化所有数据表
3. 插入示例产品数据

### 4. 生产环境部署

在生产环境中，建议使用WSGI服务器（如Gunicorn）来运行应用：

```bash
# 安装Gunicorn
pip install gunicorn

# 使用Gunicorn运行（4个工作进程）
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## API接口文档

### 根路由

```
GET /
```
返回API概览信息和所有可用的端点列表。

### 产品API

#### 1. 获取所有产品

```
GET /products
```

**响应示例**：
```json
{
  "products": [
    {
      "productId": "uuid",
      "name": "笔记本电脑",
      "category": "电子产品",
      "price": 5999,
      "package": {
        "width": 400,
        "length": 300,
        "height": 50,
        "weight": 2000
      },
      "tags": ["电脑", "办公", "学习"],
      "pictures": [],
      "createdDate": "2024-01-01T00:00:00",
      "modifiedDate": "2024-01-01T00:00:00"
    }
  ]
}
```

#### 2. 获取单个产品

```
GET /products/<product_id>
```

**响应示例**：
```json
{
  "product": {
    "productId": "uuid",
    "name": "笔记本电脑",
    ...
  }
}
```

#### 3. 验证产品列表

```
POST /products/validate
Content-Type: application/json
```

**请求体**：
```json
{
  "products": [
    {
      "productId": "uuid",
      "name": "笔记本电脑",
      "price": 5999,
      "package": {
        "width": 400,
        "length": 300,
        "height": 50,
        "weight": 2000
      },
      "quantity": 1
    }
  ]
}
```

**响应示例**：
```json
{
  "message": "All products are valid"
}
```

### 第三方支付API

#### 1. 创建支付预授权

```
POST /payment-3p/preauth
Content-Type: application/json
```

**请求体**：
```json
{
  "cardNumber": "1234567890123456",
  "amount": 12345
}
```

**响应示例**：
```json
{
  "paymentToken": "uuid"
}
```

#### 2. 检查支付Token

```
POST /payment-3p/check
Content-Type: application/json
```

**请求体**：
```json
{
  "paymentToken": "uuid",
  "amount": 12345
}
```

**响应示例**：
```json
{
  "ok": true
}
```

#### 3. 处理支付

```
POST /payment-3p/processPayment
Content-Type: application/json
```

**请求体**：
```json
{
  "paymentToken": "uuid"
}
```

#### 4. 取消支付

```
POST /payment-3p/cancelPayment
Content-Type: application/json
```

**请求体**：
```json
{
  "paymentToken": "uuid"
}
```

#### 5. 更新支付金额

```
POST /payment-3p/updateAmount
Content-Type: application/json
```

**请求体**：
```json
{
  "paymentToken": "uuid",
  "amount": 10000
}
```

### 支付验证API

#### 验证支付Token

```
POST /payment/validate
Content-Type: application/json
```

**请求体**：
```json
{
  "paymentToken": "uuid",
  "total": 12345
}
```

**响应示例**：
```json
{
  "ok": true
}
```

### 配送定价API

#### 计算配送价格

```
POST /delivery-pricing/pricing
Content-Type: application/json
```

**请求体**：
```json
{
  "products": [
    {
      "productId": "uuid",
      "name": "笔记本电脑",
      "price": 5999,
      "package": {
        "width": 400,
        "length": 300,
        "height": 50,
        "weight": 2000
      },
      "quantity": 1
    }
  ],
  "address": {
    "name": "张三",
    "streetAddress": "某某街道123号",
    "city": "北京",
    "country": "CN",
    "phoneNumber": "13800138000"
  }
}
```

**响应示例**：
```json
{
  "pricing": 500
}
```

### 订单API

#### 1. 创建订单

```
POST /orders
Content-Type: application/json
```

**请求体**：
```json
{
  "userId": "user-uuid",
  "products": [
    {
      "productId": "product-uuid",
      "name": "笔记本电脑",
      "price": 5999,
      "package": {
        "width": 400,
        "length": 300,
        "height": 50,
        "weight": 2000
      },
      "quantity": 1
    }
  ],
  "address": {
    "name": "张三",
    "streetAddress": "某某街道123号",
    "city": "北京",
    "country": "CN",
    "phoneNumber": "13800138000"
  },
  "deliveryPrice": 500,
  "paymentToken": "payment-token-uuid"
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "Order created",
  "order": {
    "orderId": "order-uuid",
    "userId": "user-uuid",
    "status": "NEW",
    "products": [...],
    "address": {...},
    "deliveryPrice": 500,
    "paymentToken": "payment-token-uuid",
    "total": 6499,
    "createdDate": "2024-01-01T00:00:00",
    "modifiedDate": "2024-01-01T00:00:00"
  }
}
```

#### 2. 获取所有订单

```
GET /orders
```

#### 3. 获取单个订单

```
GET /orders/<order_id>
```

### 仓库API

#### 1. 获取所有包装请求

```
GET /warehouse/packaging-requests
```

#### 2. 获取单个包装请求

```
GET /warehouse/packaging-requests/<order_id>
```

#### 3. 完成包装

```
POST /warehouse/packaging-requests/<order_id>/complete
```

### 配送API

#### 1. 获取所有配送

```
GET /delivery/deliveries
```

#### 2. 获取单个配送

```
GET /delivery/deliveries/<order_id>
```

#### 3. 开始配送

```
POST /delivery/deliveries/<order_id>/start
```

#### 4. 完成配送

```
POST /delivery/deliveries/<order_id>/complete
```

## 完整业务流程测试

以下是一个完整的订单创建流程示例：

### 步骤1：获取产品列表

```bash
curl http://localhost:5000/products
```

记录一个产品的完整信息（包括productId）。

### 步骤2：计算配送价格

```bash
curl -X POST http://localhost:5000/delivery-pricing/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {
        "productId": "从步骤1获取的productId",
        "name": "产品名称",
        "price": 5999,
        "package": {"width": 400, "length": 300, "height": 50, "weight": 2000},
        "quantity": 1
      }
    ],
    "address": {
      "name": "张三",
      "streetAddress": "某某街道123号",
      "city": "北京",
      "country": "CN",
      "phoneNumber": "13800138000"
    }
  }'
```

记录返回的配送价格。

### 步骤3：创建支付预授权

```bash
curl -X POST http://localhost:5000/payment-3p/preauth \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "1234567890123456",
    "amount": 6499
  }'
```

记录返回的paymentToken。

### 步骤4：创建订单

```bash
curl -X POST http://localhost:5000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-001",
    "products": [
      {
        "productId": "从步骤1获取的productId",
        "name": "产品名称",
        "price": 5999,
        "package": {"width": 400, "length": 300, "height": 50, "weight": 2000},
        "quantity": 1
      }
    ],
    "address": {
      "name": "张三",
      "streetAddress": "某某街道123号",
      "city": "北京",
      "country": "CN",
      "phoneNumber": "13800138000"
    },
    "deliveryPrice": 500,
    "paymentToken": "从步骤3获取的paymentToken"
  }'
```

记录返回的orderId。

### 步骤5：查看包装请求

```bash
curl http://localhost:5000/warehouse/packaging-requests/[orderId]
```

### 步骤6：完成包装

```bash
curl -X POST http://localhost:5000/warehouse/packaging-requests/[orderId]/complete
```

### 步骤7：查看配送信息

```bash
curl http://localhost:5000/delivery/deliveries/[orderId]
```

### 步骤8：开始配送

```bash
curl -X POST http://localhost:5000/delivery/deliveries/[orderId]/start
```

### 步骤9：完成配送

```bash
curl -X POST http://localhost:5000/delivery/deliveries/[orderId]/complete
```

## 数据库说明

应用使用SQLite数据库，包含以下表：

1. **products** - 产品信息表
2. **orders** - 订单表
3. **payment_tokens** - 支付token表
4. **warehouse_packaging** - 仓库包装请求表
5. **deliveries** - 配送表

数据库文件名为 `ecommerce.db`，位于应用根目录下。

如需重置数据库，只需删除 `ecommerce.db` 文件，应用重启时会自动重新创建。

## 日志

应用使用Python标准日志模块，日志级别为INFO。所有重要操作都会记录日志，包括：

- 订单创建
- 产品验证
- 支付处理
- 包装和配送状态变更
- 错误信息



## 注意事项

1. **数据库**：本应用使用SQLite，适合开发和测试。生产环境建议使用PostgreSQL或MySQL。
2. **并发**：SQLite在高并发场景下性能有限，生产环境需考虑使用更强大的数据库。
3. **认证**：本应用未实现用户认证，实际使用时需要添加认证中间件。
4. **配置**：应用使用硬编码配置，生产环境应使用环境变量或配置文件。
5. **错误处理**：应用已包含基本错误处理，但生产环境可能需要更完善的错误处理机制。

## 许可证

本项目基于MIT-0许可证。

## 问题反馈

如遇到问题，请检查：
1. Python版本是否为3.7+
2. 所有依赖包是否正确安装
3. 端口5000是否被占用
4. 数据库文件是否有读写权限

## Serverless版本转换

本单体应用已成功转换为AWS Serverless架构版本，转换后的代码位于`serverless-app`目录中。

### 转换架构说明

**原单体应用架构：**
- Web框架：Flask
- 数据库：SQLite
- 部署方式：单一服务器/容器

**Serverless架构：**
- 计算服务：AWS Lambda（21个函数）
- API网关：Amazon API Gateway
- 数据存储：Amazon DynamoDB（5个表）
- 事件驱动：Amazon EventBridge
- 基础设施：AWS SAM模板

### 主要改进点

1. **弹性伸缩**：自动根据流量扩缩容，无需手动管理服务器
2. **按需付费**：只为实际使用的资源付费，开发测试阶段基本免费
3. **事件驱动**：使用EventBridge解耦服务间依赖，提高系统灵活性
4. **高可用性**：AWS托管服务自带多区域容灾能力
5. **服务独立**：每个Lambda函数独立部署和扩展，互不影响

### 功能对照

所有原单体应用功能在Serverless版本中完全保留，一对一转换：

| 功能模块 | 单体应用 | Serverless应用 |
|---------|---------|---------------|
| 产品管理 | ProductService类 | 3个Lambda函数 |
| 第三方支付 | Payment3PService类 | 5个Lambda函数 |
| 支付验证 | PaymentService类 | 1个Lambda函数 |
| 配送定价 | DeliveryPricingService类 | 1个Lambda函数 |
| 订单管理 | OrderService类 | 3个Lambda函数 |
| 仓库管理 | WarehouseService类 | 4个Lambda函数（含事件处理） |
| 配送管理 | DeliveryService类 | 5个Lambda函数（含事件处理） |

### 使用指引

详细的部署和测试指引请查看：[serverless-app/README.md](serverless-app/README.md)

快速开始：

```bash
# 进入serverless应用目录
cd serverless-app

# 构建应用
sam build

# 部署到AWS
sam deploy --guided

# 初始化产品数据
python init_products.py
```

### 项目反思与改进建议

#### 转换过程中的关键决策

1. **事件驱动架构的引入**
   - 原单体应用中，订单创建后直接同步调用仓库服务和配送服务
   - Serverless版本改为事件驱动：订单创建 → OrderCreated事件 → 仓库服务监听 → PackageCreated事件 → 配送服务监听
   - **优势**：服务解耦，提高系统弹性；单个服务故障不影响其他服务
   - **改进空间**：可以考虑添加事件重试机制和死信队列（DLQ）处理失败场景

2. **数据库选型**
   - 从SQLite迁移到DynamoDB
   - **优势**：无需管理数据库服务器，自动扩展，高可用
   - **权衡**：DynamoDB不支持复杂查询和事务，需要重新设计数据模型
   - **改进空间**：对于需要复杂查询的场景，可考虑使用Amazon RDS + Aurora Serverless

3. **Lambda函数粒度**
   - 采用细粒度拆分，每个API端点对应一个Lambda函数
   - **优势**：独立部署、扩展和监控；冷启动时间短
   - **权衡**：函数数量较多（21个），管理复杂度增加
   - **改进空间**：可以考虑合并相关度高的函数，减少管理开销

#### 可能存在的问题

1. **冷启动延迟**
   - **问题**：Lambda函数空闲后首次调用会有100-500ms延迟
   - **影响**：对于实时性要求高的场景可能不够理想
   - **解决方案**：
     - 使用Lambda预留并发（Provisioned Concurrency）
     - 配置定时器保持函数温度
     - 优化函数初始化代码，减少依赖包大小

2. **DynamoDB成本**
   - **问题**：按需计费模式在高并发场景下成本可能较高
   - **改进方案**：
     - 评估实际流量后切换到预留容量模式
     - 合理设置DynamoDB Auto Scaling
     - 对于不常访问的数据考虑使用S3存储

3. **EventBridge延迟**
   - **问题**：事件传递存在延迟（通常几百毫秒）
   - **影响**：订单创建到包装请求创建之间有短暂延迟
   - **权衡**：这是事件驱动架构的固有特性，换取的是系统解耦和容错能力

4. **缺少完整的错误处理**
   - **问题**：当前实现未包含DLQ和重试逻辑
   - **改进方案**：
     - 为EventBridge规则添加DLQ配置
     - 为Lambda函数配置异步调用重试策略
     - 添加告警监控关键指标

5. **本地开发体验**
   - **问题**：本地调试需要连接AWS服务，不如单体应用方便
   - **改进方案**：
     - 使用LocalStack模拟AWS服务
     - 添加单元测试和集成测试
     - 使用SAM Local进行本地调试

#### 性能优化建议

1. **Lambda配置优化**
   - 根据实际负载调整内存配置（当前统一256MB）
   - 监控函数执行时间，优化超时设置

2. **DynamoDB优化**
   - 为常用查询添加GSI（全局二级索引）
   - 启用DynamoDB Streams实现更复杂的事件处理

3. **API Gateway优化**
   - 启用API缓存减少Lambda调用次数
   - 配置请求限流（throttling）保护后端服务

4. **监控与可观测性**
   - 集成AWS X-Ray追踪请求链路
   - 配置CloudWatch告警监控关键指标
   - 使用AWS CloudWatch Insights分析日志

#### 安全性改进

当前实现为演示目的，生产环境需要加强：

1. **API认证授权**
   - 添加API Key或JWT Token认证
   - 使用Amazon Cognito管理用户身份
   - 实施细粒度的IAM权限控制

2. **数据加密**
   - 启用DynamoDB静态加密
   - 使用KMS管理加密密钥
   - 敏感数据传输使用HTTPS

3. **输入验证**
   - 在API Gateway层添加请求验证
   - Lambda函数内部增强参数校验
   - 防止SQL注入和XSS攻击

### 总结

本次转换成功地将单体应用迁移到AWS Serverless架构，在保持功能完全一致的前提下，实现了更好的弹性、可用性和成本效益。虽然存在一些固有的权衡（如冷启动、事件延迟），但通过合理的架构设计和配置优化，完全可以满足生产环境的需求。

