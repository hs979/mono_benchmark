# Backend Scripts 说明

## init-db.js - 数据库初始化脚本

### 功能

自动创建 Serverlesspresso 应用所需的 DynamoDB 表：
- `presso-validator` - 验证表
- `presso-config-table` - 配置表
- `presso-counting-table` - 计数表
- `presso-order-table` - 订单表
- `presso-order-journey-events` - 订单旅程事件表
- `presso-users` - 用户表

### 使用方法

#### 1. 独立运行（推荐）

```bash
npm run init-db
```

或直接运行：

```bash
node scripts/init-db.js
```

#### 2. 在代码中调用

```javascript
const { createOrdersTable, createConfigTable } = require('./scripts/init-db');

// 在应用启动时初始化
async function startup() {
  await createOrdersTable();
  await createConfigTable();
  // ... 启动服务器
}
```

### 特性

- ✅ **幂等性**：重复运行不会出错，已存在的表会自动跳过
- ✅ **等待机制**：创建表后自动等待表变为 ACTIVE 状态
- ✅ **详细输出**：显示清晰的创建过程和错误提示
- ✅ **错误处理**：提供友好的错误信息和解决建议
- ✅ **完整索引**：自动创建 GSI 和 LSI

### 环境变量

脚本会读取以下环境变量（来自 `.env` 文件）：

```env
# 必需
AWS_REGION=us-east-1

# 可选 - 表名（有默认值）
VALIDATOR_TABLE=presso-validator
CONFIG_TABLE=presso-config-table
ORDER_TABLE=presso-order-table
COUNTING_TABLE=presso-counting-table
ORDER_JOURNEY_TABLE=presso-order-journey-events
USERS_TABLE=presso-users

# 可选 - AWS凭证（如果不用 aws configure）
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

### 创建的表结构

#### 1. presso-validator (验证表)
```
主键: PK (String)
计费模式: 按需付费 (PAY_PER_REQUEST)
Stream: 启用
```

#### 2. presso-config-table (配置表)
```
主键: PK (String)
计费模式: 按需付费 (PAY_PER_REQUEST)
Stream: 启用
用途: 存储应用配置（菜单、营业时间等）
```

#### 3. presso-counting-table (计数表)
```
主键: PK (String)
计费模式: 按需付费 (PAY_PER_REQUEST)
用途: 订单ID自增计数器
```

#### 4. presso-order-table (订单表)
```
分区键: PK (String)
排序键: SK (String)
计费模式: 按需付费 (PAY_PER_REQUEST)

LSI: LSI-timestamp
  - PK (HASH) + TS (RANGE)

GSI: GSI-status
  - ORDERSTATE (HASH) + SK (RANGE)
  
GSI: GSI-userId
  - USERID (HASH) + SK (RANGE)

用途: 存储订单信息，支持按状态和用户查询
```

#### 5. presso-order-journey-events (订单旅程事件表)
```
分区键: PK (String)
排序键: SK (String)
计费模式: 按需付费 (PAY_PER_REQUEST)
Stream: 启用
用途: 记录订单生命周期中的所有事件
```

#### 6. presso-users (用户表)
```
分区键: PK (String)
排序键: SK (String)
计费模式: 按需付费 (PAY_PER_REQUEST)

GSI: GSI-username
  - username (HASH)

用途: 存储用户信息，支持通过用户名查询
```

### 示例输出

```
========================================
Serverlesspresso应用 - DynamoDB表初始化
========================================
区域: us-east-1

步骤1: 创建DynamoDB表

✓ 表 presso-validator 创建成功
  主键: PK (String)
✓ 表 presso-config-table 创建成功
  主键: PK (String)
✓ 表 presso-counting-table 创建成功
  主键: PK (String)
✓ 表 presso-order-table 创建成功
  分区键: PK (String), 排序键: SK (String)
  LSI: LSI-timestamp (PK, TS)
  GSI: GSI-status (ORDERSTATE, SK)
  GSI: GSI-userId (USERID, SK)
✓ 表 presso-order-journey-events 创建成功
  分区键: PK (String), 排序键: SK (String)
✓ 表 presso-users 创建成功
  分区键: PK (String), 排序键: SK (String)
  GSI: GSI-username (username)

步骤2: 等待表创建完成

  ✓ 表 presso-validator 已就绪
  ✓ 表 presso-config-table 已就绪
  ✓ 表 presso-counting-table 已就绪
  ✓ 表 presso-order-table 已就绪
  ✓ 表 presso-order-journey-events 已就绪
  ✓ 表 presso-users 已就绪

========================================
✓ 数据库初始化完成！
========================================

创建的表:
  1. presso-validator - 验证表
  2. presso-config-table - 配置表
  3. presso-counting-table - 计数表
  4. presso-order-table - 订单表
  5. presso-order-journey-events - 订单旅程事件表
  6. presso-users - 用户表

现在可以启动应用了:
  npm start
```

### 架构说明

此应用采用 **职责分离架构**：

1. **`scripts/init-db.js`** - 一次性表初始化脚本
   - 使用 `AWS.DynamoDB` 客户端
   - 创建表结构和索引
   - 只在初始化时运行

2. **`services/database.js`** - 运行时数据库服务
   - 创建 `DynamoDB.DocumentClient` 实例
   - 提供表名配置
   - 提供所有 CRUD 业务方法

### 对比：与 Serverless 版本保持一致

本脚本创建的表结构与 serverless 版本完全一致（来自 `serverless-app/01-appCore/template.yaml`），确保单体版本和无服务器版本的数据模型兼容。
