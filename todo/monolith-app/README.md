# Todo应用 - 单体版本

这是一个传统的单体Web应用。
## 项目简介

这是一个待办事项管理应用，功能包括：
- 用户注册和登录（使用JWT认证）
- 创建待办事项
- 查看所有待办事项
- 更新待办事项
- 标记待办事项为已完成
- 删除待办事项

## 技术栈

### 后端
- **运行环境**: Node.js
- **Web框架**: Express.js
- **数据库**: AWS DynamoDB
- **身份认证**: JWT (JSON Web Token)
- **密码加密**: bcryptjs

### 前端
- **框架**: React
- **UI组件库**: Reactstrap (Bootstrap 4)
- **HTTP客户端**: Axios

## 项目结构

```
monolith-app/
├── backend/                    # 后端代码
│   ├── config/                 # 配置文件
│   │   └── db.js              # 数据库配置
│   ├── middleware/             # 中间件
│   │   └── auth.js            # JWT认证中间件
│   ├── routes/                 # 路由
│   │   ├── auth.js            # 用户认证路由（注册/登录）
│   │   └── todo.js            # Todo业务逻辑路由
│   ├── utils/                  # 工具函数
│   │   └── jwt.js             # JWT工具
│   ├── server.js               # 主服务器文件
│   └── package.json            # 后端依赖
├── frontend/                   # 前端代码
│   ├── public/                 # 静态资源
│   │   └── index.html
│   ├── src/                    # 源代码
│   │   ├── App.js             # 主应用组件
│   │   ├── ToDo.js            # 待办事项组件
│   │   ├── config.js          # 前端配置
│   │   └── ...                # 其他文件
│   └── package.json            # 前端依赖
└── README.md                   # 本文件
```

## 环境准备

在开始之前，请确保您的系统已安装以下软件：

1. **Node.js** (版本 >= 12.x)
   - 下载地址: https://nodejs.org/
   - 验证安装: `node --version`

2. **npm** (通常随Node.js一起安装)
   - 验证安装: `npm --version`

3. **AWS账号和DynamoDB访问权限**
   - 您需要有一个AWS账号
   - 需要配置AWS访问密钥（Access Key ID 和 Secret Access Key）

## 数据库配置

### 1. 配置AWS凭证

有两种方式配置AWS凭证：

**方式一：使用AWS CLI配置（推荐）**

```bash
aws configure
```

按提示输入您的：
- AWS Access Key ID
- AWS Secret Access Key
- Default region (例如: us-east-1)
- Default output format (可选择: json)

**方式二：在环境变量中配置**

在 `backend/.env` 文件中配置（需要创建该文件）：

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=你的访问密钥ID
AWS_SECRET_ACCESS_KEY=你的访问密钥
```

## 部署步骤

### 第一步：启动后端服务

1. **进入后端目录**

```bash
cd backend
```

2. **安装依赖**

```bash
npm install
```

3. **配置环境变量**

创建 `.env` 文件（如果尚未创建）：

```bash
# Windows PowerShell
New-Item -ItemType File -Path ".env"

# Linux/Mac
touch .env
```

编辑 `.env` 文件，添加以下内容：

```env
# AWS配置
AWS_REGION=us-east-1

# DynamoDB表名
TODO_TABLE_NAME=todo-monolith-table
USER_TABLE_NAME=todo-monolith-users

# JWT密钥（请修改为您自己的密钥）
JWT_SECRET=your-super-secret-jwt-key-change-this

# 服务器配置
PORT=8080
NODE_ENV=development
```

**重要提示**: 
- 请务必修改 `JWT_SECRET` 为您自己的强密钥
- 如果使用AWS CLI配置了凭证，则不需要在 `.env` 中添加 `AWS_ACCESS_KEY_ID` 和 `AWS_SECRET_ACCESS_KEY`

4. **初始化数据库表（首次运行）**

运行初始化脚本自动创建DynamoDB表：

```bash
npm run init-db
```

该脚本会自动创建两个表：
- `todo-monolith-table` - 待办事项表（分区键：cognito-username，排序键：id）
- `todo-monolith-users` - 用户表（主键：username）

如果表已存在，脚本会自动跳过创建。

**可选：手动创建表**

如果您更喜欢手动创建表，也可以使用AWS CLI：

```bash
# 创建用户表
aws dynamodb create-table \
  --table-name todo-monolith-users \
  --attribute-definitions AttributeName=username,AttributeType=S \
  --key-schema AttributeName=username,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# 创建待办事项表
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
```

5. **启动后端服务**

```bash
npm start
```

如果一切正常，您将看到：

```
========================================
Todo应用后端服务已启动
运行地址: http://localhost:8080
环境: development
========================================
```

**开发模式（可选）**：使用 nodemon 实现热重载

```bash
npm run dev
```

### 第二步：启动前端应用

打开一个**新的**命令行窗口（保持后端服务运行）：

1. **进入前端目录**

```bash
cd frontend
```

2. **安装依赖**

```bash
npm install
```

3. **启动前端开发服务器**

```bash
npm start
```

前端应用将自动在浏览器中打开，地址为：`http://localhost:3000`

## 使用指南

### 1. 注册新用户

- 打开浏览器，访问 `http://localhost:3000`
- 点击"还没有账号？点击注册"
- 输入用户名和密码（至少6位）
- 可选：输入邮箱
- 点击"注册"按钮

### 2. 登录

- 如果已有账号，在登录界面输入用户名和密码
- 点击"登录"按钮

### 3. 管理待办事项

登录成功后，您可以：

- **添加待办事项**: 在输入框中输入内容，点击"添加"
- **查看待办事项**: 使用"全部"、"已完成"、"未完成"按钮过滤显示
- **完成待办事项**: 点击绿色的对勾按钮
- **删除待办事项**: 点击红色的删除按钮

### 4. 退出登录

点击"退出登录"按钮即可退出

## API接口文档

### 认证接口

#### 1. 用户注册
- **URL**: `POST /auth/register`
- **请求体**:
```json
{
  "username": "用户名",
  "password": "密码",
  "email": "邮箱（可选）"
}
```
- **响应**:
```json
{
  "message": "注册成功",
  "token": "JWT令牌",
  "username": "用户名"
}
```

#### 2. 用户登录
- **URL**: `POST /auth/login`
- **请求体**:
```json
{
  "username": "用户名",
  "password": "密码"
}
```
- **响应**:
```json
{
  "message": "登录成功",
  "token": "JWT令牌",
  "username": "用户名"
}
```

### Todo接口（需要认证）

所有Todo接口都需要在请求头中包含JWT令牌：
```
Authorization: <JWT令牌>
```

#### 1. 获取所有待办事项
- **URL**: `GET /api/item`
- **响应**:
```json
{
  "Items": [...],
  "Count": 数量
}
```

#### 2. 获取单个待办事项
- **URL**: `GET /api/item/:id`
- **响应**: 待办事项详情

#### 3. 创建待办事项
- **URL**: `POST /api/item`
- **请求体**:
```json
{
  "item": "待办事项内容",
  "completed": false
}
```

#### 4. 更新待办事项
- **URL**: `PUT /api/item/:id`
- **请求体**:
```json
{
  "item": "更新后的内容",
  "completed": true/false
}
```

#### 5. 标记为已完成
- **URL**: `POST /api/item/:id/done`

#### 6. 删除待办事项
- **URL**: `DELETE /api/item/:id`

## 测试指南

### 功能测试清单

请按照以下步骤测试应用的各项功能：

#### 用户认证测试

- [ ] 测试用户注册
  - 输入有效的用户名和密码
  - 验证是否成功注册并自动登录
  - 验证密码长度限制（至少6位）

- [ ] 测试用户登录
  - 使用已注册的账号登录
  - 验证错误的用户名或密码是否被拒绝

- [ ] 测试登录状态持久化
  - 登录后刷新页面
  - 验证是否保持登录状态

- [ ] 测试退出登录
  - 点击退出登录按钮
  - 验证是否返回登录界面

#### 待办事项功能测试

- [ ] 测试创建待办事项
  - 输入待办事项内容并添加
  - 验证是否显示在列表中

- [ ] 测试查看待办事项
  - 验证所有待办事项是否正确显示
  - 测试"全部"、"已完成"、"未完成"过滤功能

- [ ] 测试标记完成
  - 点击对勾按钮标记某项为完成
  - 验证该项是否显示删除线

- [ ] 测试删除待办事项
  - 点击删除按钮
  - 验证该项是否从列表中消失

- [ ] 测试多用户隔离
  - 注册并登录多个不同的账号
  - 验证每个用户只能看到自己的待办事项

## 常见问题

### 1. 后端启动失败

**问题**: 提示端口已被占用
```
Error: listen EADDRINUSE: address already in use :::8080
```

**解决方案**: 
- 修改 `backend/.env` 中的 `PORT` 配置为其他端口（如8081）
- 或关闭占用8080端口的其他程序

### 2. 无法连接到DynamoDB

**问题**: 提示AWS凭证错误或表不存在

**解决方案**:
- 确认已正确配置AWS凭证
- 确认已在AWS DynamoDB中创建了所需的表
- 确认表名与 `.env` 文件中的配置一致
- 确认AWS区域设置正确

### 3. 前端无法连接后端

**问题**: 登录或添加待办事项时报错

**解决方案**:
- 确认后端服务正在运行
- 检查 `frontend/src/config.js` 中的 `api_base_url` 配置
- 检查浏览器控制台是否有CORS错误
- 确认后端端口与前端配置一致

### 4. JWT令牌过期

**问题**: 提示"登录已过期，请重新登录"

**解决方案**:
- 这是正常现象，JWT令牌默认有效期为24小时
- 重新登录即可获取新的令牌
- 如需修改有效期，可编辑 `backend/utils/jwt.js` 中的 `JWT_EXPIRES_IN` 配置


## 许可证

MIT License

