# Todo 应用快速开始指南

## 🚀 最快捷的启动方式（推荐）

### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 配置环境变量

在 `backend` 目录创建 `.env` 文件：

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

### 3. 初始化数据库（一行命令）

```bash
cd backend
npm run init-db
```

✅ 这会自动创建所需的DynamoDB表，无需手动操作！

### 4. 启动应用

**启动后端：**
```bash
cd backend
npm start
```

**启动前端（新窗口）：**
```bash
cd frontend
npm start
```

### 5. 开始使用

浏览器自动打开 `http://localhost:3000`，注册账号即可使用！

---

## 📝 总结

相比旧方式（手动运行AWS CLI命令），新方式只需：

```bash
# 1. 安装
npm install

# 2. 配置 .env 文件

# 3. 初始化数据库（一行命令！）
npm run init-db

# 4. 启动
npm start
```

**就是这么简单！** 🎉
