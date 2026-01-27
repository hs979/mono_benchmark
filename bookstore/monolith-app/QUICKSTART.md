# 快速入门指南

这是AWS Bookstore全栈应用的快速入门指南，帮助您在10分钟内启动应用。

## 🎯 快速开始（4步）

### 步骤1: 安装依赖

```bash
cd monolith-app
npm run install-all
```

这将自动安装后端和前端的所有依赖包。

### 步骤2: 配置环境

创建`.env`文件：

```bash
cp env.example .env
```

编辑`.env`文件，填写基本配置：

```env
# 基本配置
PORT=3000
NODE_ENV=development

# AWS配置（必需）
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=你的AccessKey
AWS_SECRET_ACCESS_KEY=你的SecretKey

# DynamoDB表名
BOOKS_TABLE=Bookstore-Books
CART_TABLE=Bookstore-Cart
ORDERS_TABLE=Bookstore-Orders

# 可选服务（初次运行可以禁用）
REDIS_ENABLED=false
ES_ENABLED=false
NEPTUNE_ENABLED=false
```

### 步骤3: 初始化数据库

```bash
npm run init-db
```

这将：
- 创建所需的DynamoDB表
- 添加5本示例书籍数据

### 步骤4: 构建并启动

```bash
# 构建前端
npm run build

# 启动应用
npm start
```

应用将在 http://localhost:3000 启动! 🎉

## 🌐 访问应用

打开浏览器访问：

- **前端应用**: http://localhost:3000
- **API接口**: http://localhost:3000/api

### 认证说明

应用已集成JWT认证。默认开发模式（`AUTH_DEV_MODE=true`）下：

**方式1: 开发模式快速测试**（无需注册登录）
```bash
curl http://localhost:3000/api/books \
  -H "x-customer-id: dev-user-123"
```

**方式2: 使用JWT认证**（推荐）
```bash
# 注册用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 登录获取token（会返回accessToken）
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 使用token访问API
curl http://localhost:3000/api/books \
  -H "Authorization: Bearer your-access-token"
```

**详细指南**: 查看 [JWT_AUTH_GUIDE.md](JWT_AUTH_GUIDE.md)

## 🔧 常用操作

### 重新构建前端

```bash
npm run build
```

### 开发模式（热重载）

```bash
# 后端开发
npm run dev

# 前端开发（在另一个终端）
npm run dev-frontend
```

### 测试API

```bash
npm run test-api
```

## ❓ 常见问题

### Q: 没有AWS账户可以运行吗？
A: 核心功能需要AWS DynamoDB。可以使用[DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)进行本地测试。

### Q: 端口被占用怎么办？
A: 修改`.env`文件中的`PORT`配置为其他端口。

### Q: 构建前端很慢？
A: 首次构建需要下载依赖，可能需要几分钟。后续构建会快很多。

### Q: 如何添加更多书籍？
A: 可以通过API添加，或者修改`scripts/init-db.js`中的示例数据。

## 📚 下一步

- 阅读完整的[README.md](README.md)了解详细功能
- 查看[API文档](README.md#-api文档)
- 尝试修改前端代码（在`frontend/src/`目录）
- 了解[部署选项](README.md#-部署选项)

## 🎓 开发建议

### 最小化配置运行

如果您只想快速体验，可以禁用所有可选服务：

```env
REDIS_ENABLED=false
ES_ENABLED=false
NEPTUNE_ENABLED=false
```

这样应用将使用最基础的功能：
- ✅ 书籍浏览
- ✅ 购物车管理
- ✅ 订单创建
- ⚠️ 畅销书功能不可用（返回空）
- ⚠️ 推荐功能不可用（返回空）
- ⚠️ 搜索使用DynamoDB扫描（较慢）

### 完整功能配置

如果需要所有功能，您需要：
1. 创建ElastiCache Redis集群
2. 创建Elasticsearch域
3. 创建Neptune图数据库集群
4. 在`.env`中配置相应的端点

## 🆘 获取帮助

- 📖 查看[README.md](README.md)完整文档
- 🐛 提交GitHub Issue报告问题
- 💬 查看文档中的故障排查部分

---

**开始使用吧！** 🚀
