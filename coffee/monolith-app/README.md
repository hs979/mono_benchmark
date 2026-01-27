# presso 咖啡订单管理系统

一个功能完整的咖啡订单管理系统，支持QR码验证、订单流转、咖啡师协作和实时统计等功能。

## 项目概述

presso是一个现代化的咖啡店订单管理系统，提供以下核心功能：

- 🔐 JWT用户认证 - 安全的用户登录和权限管理
- 📱 QR码生成和验证 - 安全的订单创建机制
- 📝 订单管理 - 完整的订单生命周期管理
- 👨‍🍳 咖啡师工作流 - 订单认领、制作、完成
- ⚙️ 配置管理 - 灵活的菜单和商店状态配置
- 📊 业务指标 - 实时统计和数据分析
- 📜 订单追踪 - 完整的订单历史记录
- 💾 DynamoDB存储 - 可靠的云端数据持久化

## 系统架构

本应用采用模块化的单体架构设计，各服务模块职责清晰、解耦合理。

### 核心服务模块

**1. 用户认证服务** (`services/authService.js`)
- 用户注册和登录
- JWT token生成和验证
- 基于角色的权限控制（用户/管理员）
- 密码加密存储

**2. 验证器服务** (`services/validator.js`)
- 生成时间限定的QR码
- 验证QR码有效性
- 管理令牌计数
- 需要管理员权限

**3. 订单管理服务** (`services/orderManager.js`)
- 订单增删改查
- 订单状态流转
- 咖啡师订单认领
- 订单数据验证

**4. 订单处理服务** (`services/orderProcessor.js`)
- 订单工作流编排
- 商店状态和容量检查
- 订单号自动生成
- 智能超时管理

**5. 配置服务** (`services/config.js`)
- 菜单管理
- 商店开关控制
- 配置实时更新

**6. 订单旅程服务** (`services/orderJourney.js`)
- 订单事件记录
- 生成订单历史HTML
- 订单统计分析

**7. 指标服务** (`services/metrics.js`)
- 业务数据收集
- 订单统计分析
- 饮品销量排行

**8. 发布服务** (`services/publisher.js`)
- 事件发布通知
- 系统日志记录

**9. 数据库服务** (`services/database.js`)
- AWS DynamoDB集成
- 数据持久化和查询
- 支持索引和原子性操作

## 技术栈

- **运行时**: Node.js 14+
- **Web框架**: Express.js
- **数据存储**: AWS DynamoDB (云端NoSQL数据库)
- **认证系统**: JWT (JSON Web Token)
- **密码加密**: bcryptjs
- **事件系统**: EventEmitter
- **ID生成**: nanoid

## 快速开始

### 环境要求

- Node.js 14.0 或更高版本
- npm 或 yarn
- AWS账号（用于DynamoDB）
- AWS CLI 或 AWS凭证配置

### AWS DynamoDB配置

在运行应用之前，需要先配置AWS DynamoDB：

#### 1. 配置AWS凭证

选择以下任一方式配置AWS凭证：

**方式一：使用AWS CLI配置**
```bash
aws configure
# 输入你的 AWS Access Key ID
# 输入你的 AWS Secret Access Key
# 输入默认区域（如：us-east-1）
```

**方式二：设置环境变量**
```bash
export AWS_ACCESS_KEY_ID=your_access_key_id
export AWS_SECRET_ACCESS_KEY=your_secret_access_key
export AWS_REGION=us-east-1
```

**方式三：使用凭证文件**
创建 `~/.aws/credentials` 文件：
```ini
[default]
aws_access_key_id = your_access_key_id
aws_secret_access_key = your_secret_access_key
```

#### 2. 创建DynamoDB表

应用需要以下6张DynamoDB表，你可以使用AWS控制台或AWS CLI创建：

**表1：presso-validator**
```bash
aws dynamodb create-table \
  --table-name presso-validator \
  --attribute-definitions AttributeName=PK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

**表2：presso-config-table**
```bash
aws dynamodb create-table \
  --table-name presso-config-table \
  --attribute-definitions AttributeName=PK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

**表3：presso-order-table**
```bash
aws dynamodb create-table \
  --table-name presso-order-table \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=TS,AttributeType=N \
    AttributeName=ORDERSTATE,AttributeType=S \
    AttributeName=USERID,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --local-secondary-indexes \
    'IndexName=LSI-timestamp,KeySchema=[{AttributeName=PK,KeyType=HASH},{AttributeName=TS,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
  --global-secondary-indexes \
    '[{"IndexName":"GSI-status","KeySchema":[{"AttributeName":"ORDERSTATE","KeyType":"HASH"},{"AttributeName":"SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}},{"IndexName":"GSI-userId","KeySchema":[{"AttributeName":"USERID","KeyType":"HASH"},{"AttributeName":"SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

**表4：presso-counting-table**
```bash
aws dynamodb create-table \
  --table-name presso-counting-table \
  --attribute-definitions AttributeName=PK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

**表5：presso-order-journey-events**
```bash
aws dynamodb create-table \
  --table-name presso-order-journey-events \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

**表6：presso-users（用户认证表）**
```bash
aws dynamodb create-table \
  --table-name presso-users \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=username,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    '[{"IndexName":"GSI-username","KeySchema":[{"AttributeName":"username","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

> **提示**: 使用 `PAY_PER_REQUEST` 计费模式，你只需为实际使用付费，非常适合开发和测试。

### 安装与运行

```bash
# 1. 进入项目目录
cd monolith-app

# 2. 安装依赖
npm install

# 3. （可选）配置环境变量
# 创建 .env 文件或设置环境变量
export AWS_REGION=us-east-1
export JWT_SECRET=your-super-secret-key-change-this

# 4. 启动应用
npm start

# 或使用开发模式（支持热重载）
npm run dev
```

应用将在 `http://localhost:3000` 启动。

首次启动时，应用会自动初始化默认配置和计数器数据到DynamoDB中。

### 运行测试

```bash
# 在另一个终端运行自动化测试
npm test
```

## API接口文档

### 用户认证服务

#### 用户注册
```http
POST /register
Content-Type: application/json

{
  "username": "john_doe",
  "password": "securepassword123",
  "role": "user"
}
```

**响应示例**:
```json
{
  "message": "注册成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "user-1699999999",
    "username": "john_doe",
    "role": "user"
  }
}
```

**说明**:
- `role` 可选值: `user`（普通用户）或 `admin`（管理员）
- 默认为 `user`
- 密码长度至少6个字符
- 用户名长度至少3个字符

#### 用户登录
```http
POST /login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "securepassword123"
}
```

**响应示例**:
```json
{
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "user-1699999999",
    "username": "john_doe",
    "role": "user"
  }
}
```

**说明**:
- 返回的 `token` 用于后续需要认证的API调用
- Token默认有效期为24小时

#### 获取当前用户信息
```http
GET /me
Authorization: Bearer <your_jwt_token>
```

**响应示例**:
```json
{
  "user": {
    "userId": "user-1699999999",
    "username": "john_doe",
    "role": "user"
  }
}
```

### 验证器服务

#### 生成QR码（需要管理员权限）
```http
GET /qr-code?eventId=ABC
Authorization: Bearer <admin_jwt_token>
```

**响应示例**:
```json
{
  "bucket": {
    "PK": "ABC-12345",
    "last_code": "A1B2C3D4E5",
    "availableTokens": 10
  },
  "qrCode": "A1B2C3D4E5",
  "message": "QR码生成成功"
}
```

#### 验证QR码并创建订单
```http
POST /qr-code?eventId=ABC&token=A1B2C3D4E5&userId=user123
```

**响应示例**:
```json
{
  "orderId": "xyz789",
  "message": "订单创建成功",
  "availableTokens": 9
}
```

### 订单管理服务

#### 获取订单列表
```http
GET /orders?state=CREATED&eventId=ABC&maxItems=100
```

**订单状态**:
- `CREATED` - 已创建
- `COMPLETED` - 已完成
- `CANCELLED` - 已取消
- `TIMEOUT` - 超时

#### 获取我的订单（需要认证）
```http
GET /myOrders
Authorization: Bearer <your_jwt_token>
```

**说明**:
- 需要提供有效的JWT token
- 自动根据token中的用户ID查询订单

#### 获取订单详情
```http
GET /orders/{orderId}
```

#### 提交订单（客户）
```http
PUT /orders/{orderId}?eventId=ABC
Content-Type: application/json

{
  "userId": "user123",
  "drink": "Americano",
  "modifiers": ["Regular"]
}
```

#### 认领订单（咖啡师）
```http
PUT /orders/{orderId}?action=make&eventId=ABC&userId=barista123
```

#### 完成订单（咖啡师）
```http
PUT /orders/{orderId}?action=complete&eventId=ABC
```

#### 取消订单（咖啡师）
```http
PUT /orders/{orderId}?action=cancel&eventId=ABC
```

### 配置服务

#### 获取配置
```http
GET /config?eventId=ABC
```

**响应示例**:
```json
{
  "PK": "config-ABC",
  "drinksPerBarcode": 10,
  "storeOpen": true,
  "menu": [
    {
      "drink": "Americano",
      "available": true,
      "modifiers": [
        {
          "Name": "Milk",
          "Options": ["Regular", "Oat"]
        }
      ]
    }
  ]
}
```

#### 更新配置
```http
PUT /config?eventId=ABC
Content-Type: application/json

{
  "storeOpen": true,
  "drinksPerBarcode": 15
}
```

### 订单旅程服务

#### 获取订单旅程
```http
GET /order-journey/{orderId}
```

#### 获取订单旅程HTML
```http
GET /order-journey/{orderId}/html
```

在浏览器中打开可查看美观的订单历史时间线。

#### 获取订单统计
```http
GET /order-journey/stats
```

### 指标服务

#### 获取所有指标
```http
GET /metrics
```

**响应示例**:
```json
{
  "orders": {
    "started": 10,
    "completed": 8,
    "cancelled": 1,
    "timeout": 1,
    "total": 10
  },
  "drinks": {
    "Americano": 5,
    "Flat White": 3
  },
  "modifiers": {
    "Regular": 6,
    "Oat": 2
  }
}
```

#### 获取订单指标
```http
GET /metrics/orders
```

**响应示例**:
```json
{
  "started": 10,
  "completed": 8,
  "total": 10,
  "completionRate": "80.00%",
  "cancellationRate": "10.00%"
}
```

#### 获取饮品统计
```http
GET /metrics/drinks
```

#### 生成指标报告
```http
GET /metrics/report
```

## 使用示例

### 用户认证流程

```bash
# 1. 注册新用户
curl -X POST "http://localhost:3000/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "customer1",
    "password": "password123",
    "role": "user"
  }'
# 保存返回的token

# 2. 注册管理员用户
curl -X POST "http://localhost:3000/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin1",
    "password": "admin123",
    "role": "admin"
  }'
# 保存返回的token

# 3. 用户登录
curl -X POST "http://localhost:3000/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "customer1",
    "password": "password123"
  }'

# 4. 获取当前用户信息
curl "http://localhost:3000/me" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 完整订单流程

```bash
# 1. 管理员生成QR码（需要管理员token）
curl "http://localhost:3000/qr-code?eventId=ABC" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# 2. 客户扫描QR码创建订单（需要用户token）
curl -X POST "http://localhost:3000/qr-code?eventId=ABC&token=YOUR_QR_CODE" \
  -H "Authorization: Bearer USER_JWT_TOKEN"

# 3. 客户提交订单详情
curl -X PUT "http://localhost:3000/orders/ORDER_ID?eventId=ABC" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "customer1",
    "drink": "Americano",
    "modifiers": ["Regular"]
  }'

# 4. 咖啡师认领订单
curl -X PUT "http://localhost:3000/orders/ORDER_ID?action=make&eventId=ABC&userId=barista1"

# 5. 咖啡师完成订单
curl -X PUT "http://localhost:3000/orders/ORDER_ID?action=complete&eventId=ABC"
```

### 查询订单

```bash
# 查看所有已创建的订单
curl "http://localhost:3000/orders?state=CREATED&eventId=ABC"

# 查看我的订单
curl "http://localhost:3000/myOrders?userId=customer1"

# 查看订单详情
curl "http://localhost:3000/orders/ORDER_ID"
```

### 配置管理

```bash
# 获取当前配置
curl "http://localhost:3000/config?eventId=ABC"

# 更新商店状态
curl -X PUT "http://localhost:3000/config?eventId=ABC" \
  -H "Content-Type: application/json" \
  -d '{"storeOpen": false}'
```

## 核心功能

### QR码验证机制

- 基于时间桶的QR码生成（5分钟有效期）
- 令牌计数管理，防止滥用
- 管理员权限控制

### 订单工作流

1. **订单创建** - 通过QR码验证创建
2. **订单提交** - 客户填写饮品详情
3. **订单认领** - 咖啡师选择订单
4. **订单制作** - 咖啡师准备饮品
5. **订单完成** - 交付给客户

### 智能超时管理

- 客户提交超时：5分钟
- 咖啡师制作超时：15分钟
- 自动状态更新和通知

### 容量控制

- 最大并发订单数：20
- 商店开关状态控制
- 动态容量调整

## 数据结构

### 订单对象
```javascript
{
  PK: 'orders',
  SK: 'orderId',
  USERID: 'userId',
  ORDERSTATE: 'ABC-CREATED',
  TaskToken: 'token',
  drinkOrder: '{"drink":"Americano","modifiers":["Regular"]}',
  orderNumber: 123,
  baristaUserId: 'barista1',
  robot: false,
  TS: 1699999999999
}
```

### 配置对象
```javascript
{
  PK: 'config-ABC',
  drinksPerBarcode: 10,
  storeOpen: true,
  menu: [...],
  maxOrdersInQueue: 10,
  maxOrdersPerUser: 1
}
```

## 事件系统

应用采用事件驱动架构，主要事件类型：

**验证器事件**:
- `Validator.NewOrder` - 新订单创建

**订单处理器事件**:
- `OrderProcessor.WorkflowStarted` - 工作流启动
- `OrderProcessor.WaitingCompletion` - 等待完成
- `OrderProcessor.OrderTimeOut` - 订单超时
- `OrderProcessor.ShopUnavailable` - 商店不可用

**订单管理器事件**:
- `OrderManager.WaitingCompletion` - 等待完成
- `OrderManager.OrderCOMPLETED` - 订单已完成
- `OrderManager.OrderCANCELLED` - 订单已取消
- `OrderManager.MakeOrder` - 认领订单

**配置服务事件**:
- `ConfigService.ConfigChanged` - 配置变更

## 部署建议

### 开发环境

使用内存数据库，便于快速开发和测试：

```bash
npm start
```

### 生产环境

建议进行以下增强：

1. **数据持久化**: 接入MongoDB、PostgreSQL等数据库
2. **认证授权**: 实现JWT或OAuth2认证
3. **日志系统**: 集成Winston、Log4js等日志框架
4. **监控告警**: 接入Prometheus、Grafana等监控工具
5. **进程管理**: 使用PM2进行进程管理和负载均衡
6. **反向代理**: 通过Nginx进行请求分发和负载均衡

### 环境变量

应用支持以下环境变量配置：

```bash
# 服务器配置
PORT=3000                          # 应用监听端口
NODE_ENV=production                # 环境模式（development/production）

# AWS配置
AWS_REGION=us-east-1               # AWS区域
AWS_ACCESS_KEY_ID=your_key         # AWS访问密钥ID
AWS_SECRET_ACCESS_KEY=your_secret  # AWS访问密钥

# DynamoDB表名（可选，使用默认值）
VALIDATOR_TABLE= presso-validator
CONFIG_TABLE= presso-config-table
ORDER_TABLE=presso-order-table
COUNTING_TABLE=presso-counting-table
ORDER_JOURNEY_TABLE=presso-order-journey-events
USERS_TABLE=presso-users

# JWT配置
JWT_SECRET=your-super-secret-key   # JWT密钥（生产环境必须修改！）
JWT_EXPIRES_IN=24h                 # Token有效期（默认24小时）
```

**重要提示**:
- 生产环境务必修改 `JWT_SECRET` 为强密码
- 建议使用 `.env` 文件管理环境变量（不要提交到版本控制）
- AWS凭证建议使用IAM角色而非明文密钥

## 故障排查

### 应用无法启动
- 检查Node.js版本是否>=14.0
- 检查端口3000是否被占用
- 运行 `npm install` 确保依赖完整

### DynamoDB连接失败
- **错误**: `Unable to connect to DynamoDB`
  - 检查AWS凭证是否正确配置
  - 确认AWS区域设置正确
  - 验证网络连接正常
  - 检查IAM权限是否包含DynamoDB访问权限

- **错误**: `ResourceNotFoundException`
  - 确认所有6张DynamoDB表已创建
  - 检查表名是否与配置一致
  - 确认表所在区域与应用配置一致

### 用户认证问题
- **注册失败**:
  - 检查用户名长度>=3个字符
  - 检查密码长度>=6个字符
  - 确认用户名未被占用
  
- **登录失败**:
  - 确认用户名和密码正确
  - 检查用户是否已注册
  
- **Token无效**:
  - 确认使用 `Authorization: Bearer <token>` 格式
  - 检查token是否已过期（默认24小时）
  - 验证JWT_SECRET配置是否正确

### QR码生成失败
- **权限被拒绝**:
  - 确保使用管理员账号的token
  - 检查token中的role字段是否为"admin"
  
- 确保eventId参数正确
- 检查配置表中是否存在对应的eventId

### 订单创建失败
- 确保token正确且未过期（5分钟）
- 检查可用令牌数是否>0
- 确认商店状态为开放
- 确认已提供有效的JWT认证token

### 订单提交失败
- 确认饮品在菜单中存在
- 确认修饰符在允许的选项中
- 确认userId与订单创建时的userId一致
- 检查是否提供了有效的认证token

## 性能优化

- 事件驱动架构减少阻塞
- DynamoDB提供高性能NoSQL存储
- 异步处理提升并发能力
- 模块化设计便于横向扩展
- JWT无状态认证减少服务器负担
- DynamoDB按需计费模式优化成本

## 许可证

MIT-0 (MIT No Attribution)

Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

## 技术支持

遇到问题？查看以下资源：
- 查看控制台日志了解详细错误信息
- 运行 `npm test` 验证系统功能
- 检查 API 文档确认接口使用正确

---

**版本**: 1.0.0  
**最后更新**: 2024
