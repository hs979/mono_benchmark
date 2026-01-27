# Backend Scripts 说明

## init-db.js - 数据库初始化脚本

### 功能

自动创建 Todo 应用所需的 DynamoDB 表：
- `todo-monolith-table` - 待办事项表
- `todo-monolith-users` - 用户表

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
const { createTodoTable, createUserTable } = require('./scripts/init-db');

// 在应用启动时初始化
async function startup() {
  await createTodoTable();
  await createUserTable();
  // ... 启动服务器
}
```

### 特性

- ✅ **幂等性**：重复运行不会出错，已存在的表会自动跳过
- ✅ **等待机制**：创建表后自动等待表变为 ACTIVE 状态
- ✅ **详细输出**：显示清晰的创建过程和错误提示
- ✅ **错误处理**：提供友好的错误信息和解决建议

### 环境变量

脚本会读取以下环境变量（来自 `.env` 文件）：

```env
# 必需
AWS_REGION=us-east-1

# 可选 - 表名（有默认值）
TODO_TABLE_NAME=todo-monolith-table
USER_TABLE_NAME=todo-monolith-users

# 可选 - AWS凭证（如果不用 aws configure）
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

### 创建的表结构

#### todo-monolith-table (待办事项表)

```
分区键: cognito-username (String)
排序键: id (String)
计费模式: 按需付费 (PAY_PER_REQUEST)

属性:
- cognito-username: 用户标识
- id: 待办事项唯一ID (UUID)
- item: 待办事项内容
- completed: 完成状态 (boolean)
- creation_date: 创建时间
- lastupdate_date: 最后更新时间
```

#### todo-monolith-users (用户表)

```
主键: username (String)
计费模式: 按需付费 (PAY_PER_REQUEST)

属性:
- username: 用户名
- password: 加密后的密码 (bcrypt)
- email: 邮箱
- createdAt: 创建时间
```

### 示例输出

```
========================================
Todo应用 - DynamoDB表初始化
========================================
区域: us-east-1

步骤1: 创建DynamoDB表

✓ 表 todo-monolith-table 创建成功
  分区键: cognito-username (String)
  排序键: id (String)
✓ 表 todo-monolith-users 创建成功
  主键: username (String)

步骤2: 等待表创建完成

  等待表 todo-monolith-table 变为ACTIVE状态...
  ✓ 表 todo-monolith-table 已就绪
  等待表 todo-monolith-users 变为ACTIVE状态...
  ✓ 表 todo-monolith-users 已就绪

========================================
✓ 数据库初始化完成！
========================================

创建的表:
  1. todo-monolith-table - 待办事项表
  2. todo-monolith-users - 用户表

现在可以启动应用了:
  cd backend && npm start
```

### 故障排查

#### 错误：CredentialsError

```
提示: 请检查AWS凭证配置
  1. 运行 aws configure
  2. 或在 .env 文件中配置 AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY
```

#### 错误：NetworkingError

```
提示: 网络连接失败，请检查网络设置和 AWS 区域配置
```

#### 表已存在

```
- 表 todo-monolith-table 已存在，跳过创建
- 表 todo-monolith-users 已存在，跳过创建
```

这是正常的，脚本会自动跳过已存在的表。

## 对比：旧方式 vs 新方式

### 旧方式（手动）

```bash
# 需要运行多个AWS CLI命令
aws dynamodb create-table \
  --table-name todo-monolith-users \
  --attribute-definitions AttributeName=username,AttributeType=S \
  --key-schema AttributeName=username,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

aws dynamodb create-table \
  --table-name todo-monolith-table \
  --attribute-definitions \
    AttributeName=cognito-username,AttributeType=S \
    AttributeName=id,AttributeType=S \
  --key-schema \
    AttributeName=cognito-username,KeyType=HASH \
    AttributeName=id,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# 需要手动等待表创建完成
aws dynamodb wait table-exists --table-name todo-monolith-users
aws dynamodb wait table-exists --table-name todo-monolith-table
```

❌ 繁琐、容易出错、需要记住命令

### 新方式（自动）

```bash
npm run init-db
```

✅ 简单、自动化、友好的错误提示
