#Bookstore 全栈应用

一个功能完整的在线书店Web应用，采用传统单体架构构建，包含前端React应用和后端Express.js API服务。

## 📖 应用简介

Bookstore是一个现代化的在线书店应用，用户可以：

- 🔍 **浏览和搜索书籍** - 按分类浏览或使用关键词搜索
- 🛒 **管理购物车** - 添加、修改、删除购物车中的商品
- 📦 **下单结账** - 完成购买流程
- 📊 **查看订单历史** - 查看过往购买记录
- ⭐ **畅销书榜单** - 查看热门书籍排行
- 💡 **个性化推荐** - 基于用户偏好的图书推荐

## 🏗️ 技术架构

### 前端
- **框架**: React
- **路由**: React Router
- **状态管理**: Redux
- **UI库**: React Bootstrap
- **构建工具**: Create React App

### 后端
- **运行环境**: Node.js (>=14.0.0)
- **Web框架**: Express.js
- **数据库**: AWS DynamoDB
- **缓存**: Redis (可选，用于畅销书功能)
- **搜索**: Elasticsearch (可选，用于全文搜索)
- **图数据库**: Neptune (可选，用于推荐系统)

## 📁 项目结构

```
bookstore-fullstack/
├── frontend/              # React前端应用
│   ├── src/              # 源代码
│   ├── public/           # 静态资源
│   └── build/            # 构建产物（npm run build后生成）
│
├── routes/               # 后端API路由
│   ├── books.js         # 书籍相关API
│   ├── cart.js          # 购物车API
│   ├── orders.js        # 订单API
│   ├── bestsellers.js   # 畅销书API
│   ├── recommendations.js # 推荐系统API
│   └── search.js        # 搜索API
│
├── scripts/             # 工具脚本
│   ├── init-db.js      # 数据库初始化
│   └── test-api.sh     # API测试脚本
│
├── server.js            # Express服务器主入口
├── config.js            # 配置管理
├── package.json         # 后端依赖
└── README.md           # 本文档
```

## 🚀 快速开始

### 前置要求

1. **Node.js** >= 14.0.0
2. **npm** 包管理器
3. **AWS账户** 并配置好访问凭证
4. **AWS DynamoDB** 表（可使用脚本自动创建）

### 安装步骤

#### 1. 安装依赖

```bash
# 安装后端和前端的所有依赖
npm run install-all
```

或者手动分别安装：

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd frontend
npm install
cd ..
```

#### 2. 配置环境变量

复制环境变量配置示例文件：

```bash
cp env.example .env
```

编辑`.env`文件，填写必要的配置：

```env
# 基本配置
PORT=3000
NODE_ENV=development

# AWS配置
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=你的AccessKey
AWS_SECRET_ACCESS_KEY=你的SecretKey

# DynamoDB表名
BOOKS_TABLE=Bookstore-Books
CART_TABLE=Bookstore-Cart
ORDERS_TABLE=Bookstore-Orders

# 可选服务（如不需要可设为false）
REDIS_ENABLED=false
ES_ENABLED=false
NEPTUNE_ENABLED=false
```

#### 3. 初始化数据库

运行初始化脚本，创建DynamoDB表并添加示例数据：

```bash
npm run init-db
```

这将自动：
- 创建Books、Cart、Orders三个表
- 添加5本示例书籍数据

#### 4. 构建前端

```bash
npm run build
```

这将编译React应用并生成优化后的静态文件到`frontend/build/`目录。

#### 5. 启动应用

```bash
npm start
```

应用将在 `http://localhost:3000` 启动。

打开浏览器访问：
- 🌐 **前端应用**: http://localhost:3000
- 🔌 **API文档**: http://localhost:3000/api

## 📚 API文档

所有API端点都以`/api`为前缀。

### 书籍管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/books` | 获取所有书籍 |
| GET | `/api/books?category=X` | 按分类获取书籍 |
| GET | `/api/books/:id` | 获取单本书详情 |

### 购物车管理

| 方法 | 路径 | 说明 | 请求体 |
|------|------|------|--------|
| GET | `/api/cart` | 获取购物车 | - |
| GET | `/api/cart/:bookId` | 获取购物车中的某本书 | - |
| POST | `/api/cart` | 添加到购物车 | `{bookId, quantity, price}` |
| PUT | `/api/cart` | 更新购物车 | `{bookId, quantity}` |
| DELETE | `/api/cart` | 从购物车删除 | `{bookId}` |

### 订单管理

| 方法 | 路径 | 说明 | 请求体 |
|------|------|------|--------|
| GET | `/api/orders` | 获取订单列表 | - |
| POST | `/api/orders` | 创建订单(结账) | `{books: [{bookId, price, quantity}]}` |

### 其他功能

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/bestsellers` | 获取畅销书榜单(前20) |
| GET | `/api/recommendations` | 获取推荐书籍 |
| GET | `/api/recommendations/:bookId` | 按书获取推荐 |
| GET | `/api/search?q=keyword` | 搜索书籍 |

### 认证端点

| 方法 | 路径 | 说明 | 请求体 |
|------|------|------|--------|
| POST | `/api/auth/register` | 用户注册 | `{email, password, name}` |
| POST | `/api/auth/login` | 用户登录 | `{email, password}` |
| POST | `/api/auth/refresh` | 刷新token | `{refreshToken}` |
| GET | `/api/auth/me` | 获取当前用户信息 | - |

### 请求示例

```bash
# 注册用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"用户名"}'

# 登录（获取token）
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 使用token访问API
curl http://localhost:3000/api/books \
  -H "Authorization: Bearer your-access-token"

# 搜索书籍
curl "http://localhost:3000/api/search?q=javascript" \
  -H "Authorization: Bearer your-access-token"

# 添加到购物车
curl -X POST http://localhost:3000/api/cart \
  -H "Authorization: Bearer your-access-token" \
  -H "Content-Type: application/json" \
  -d '{"bookId":"book-001","quantity":1,"price":99.00}'
```

**开发模式快捷方式**（`AUTH_DEV_MODE=true`时可用）:
```bash
# 使用x-customer-id跳过JWT验证
curl http://localhost:3000/api/books \
  -H "x-customer-id: dev-user-123"
```

## ⚙️ 配置说明

### 核心配置

- **PORT**: 应用监听端口，默认3000
- **NODE_ENV**: 运行环境，development或production
- **AWS_REGION**: AWS区域
- **AWS_ACCESS_KEY_ID**: AWS访问密钥ID
- **AWS_SECRET_ACCESS_KEY**: AWS密钥

### DynamoDB配置

应用使用三个DynamoDB表：

**Books表** - 存储书籍信息
- 分区键: `id` (String)
- 全局二级索引: `category-index`

**Cart表** - 存储购物车数据
- 分区键: `customerId` (String)
- 排序键: `bookId` (String)

**Orders表** - 存储订单数据
- 分区键: `customerId` (String)
- 排序键: `orderId` (String)

### 可选服务配置

#### Redis (畅销书功能)
```env
REDIS_ENABLED=true
REDIS_HOST=your-redis-host
REDIS_PORT=6379
```

如果Redis未启用，畅销书接口将返回空数组。

#### Elasticsearch (搜索功能)
```env
ES_ENABLED=true
ES_ENDPOINT=your-es-endpoint
```

如果Elasticsearch未启用，搜索将使用DynamoDB扫描(性能较低)。

#### Neptune (推荐功能)
```env
NEPTUNE_ENABLED=true
NEPTUNE_ENDPOINT=your-neptune-endpoint
```

如果Neptune未启用，推荐接口将返回空数组。

## 🛠️ 开发指南

### 开发模式

**后端开发** - 使用nodemon实现热重载：

```bash
npm run dev
```

**前端开发** - 独立运行前端开发服务器：

```bash
npm run dev-frontend
```

前端开发服务器将在 http://localhost:3001 启动，API请求会自动代理到后端。

### 测试

运行API测试脚本：

```bash
npm run test-api
```

这将测试所有API端点的基本功能。

### 构建生产版本

```bash
# 构建前端
npm run build

# 启动生产服务器
NODE_ENV=production npm start
```

## 🚀 部署选项

### 1. 传统服务器部署

使用PM2管理Node.js进程：

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name bookstore

# 保存配置
pm2 save

# 设置开机自启
pm2 startup
```

### 2. Docker容器部署

创建`Dockerfile`:

```dockerfile
FROM node:14

WORKDIR /app

# 复制后端代码
COPY package*.json ./
RUN npm install

# 复制前端代码并构建
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

构建和运行：

```bash
docker build -t bookstore-app .
docker run -p 3000:3000 --env-file .env bookstore-app
```

### 3. 云平台部署

应用可部署到：
- AWS EC2
- AWS Elastic Beanstalk
- AWS ECS/Fargate
- Heroku
- DigitalOcean
- 其他支持Node.js的云平台

## 🔐 用户认证

应用已集成完整的JWT（JSON Web Token）认证系统。

### 认证模式

**开发模式**（`AUTH_DEV_MODE=true`）：
- 支持JWT认证
- 允许使用`x-customer-id`请求头跳过验证
- 方便本地开发和测试

**生产模式**（`AUTH_DEV_MODE=false`）：
- 强制要求JWT认证
- 所有受保护的API都需要Bearer token
- 适合生产环境

### 快速开始

#### 1. 注册用户
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"用户名"}'
```

#### 2. 登录获取Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

#### 3. 使用Token访问API
```bash
curl http://localhost:3000/api/books \
  -H "Authorization: Bearer your-access-token"
```

**详细文档**: 查看 [JWT_AUTH_GUIDE.md](JWT_AUTH_GUIDE.md) 获取完整的认证系统使用指南。

## 🐛 故障排查

### 常见问题

**问题1: 启动失败**
```
Error: Cannot find module 'express'
```
解决：运行 `npm install` 安装依赖

**问题2: DynamoDB连接失败**
- 检查AWS凭证是否正确
- 确认AWS区域配置
- 确认DynamoDB表已创建

**问题3: 前端页面404**
- 确认已运行 `npm run build`
- 检查 `frontend/build/` 目录是否存在
- 查看服务器日志

**问题4: 端口被占用**
```
Error: listen EADDRINUSE: address already in use :::3000
```
解决：修改`.env`中的`PORT`配置

## 📈 性能优化

### 推荐优化

1. **启用缓存** - 配置Redis缓存热门数据
2. **使用CDN** - 通过CDN分发静态资源
3. **数据库索引** - 确保DynamoDB表有适当的索引
4. **压缩响应** - 启用gzip压缩
5. **负载均衡** - 使用Nginx或云负载均衡器

### 性能指标

建议监控：
- 响应时间 < 200ms
- CPU使用率 < 70%
- 内存使用率 < 80%
- 错误率 < 1%

## 🔒 安全建议

1. **环境变量** - 不要将`.env`文件提交到版本控制
2. **AWS凭证** - 使用IAM角色而不是硬编码凭证
3. **HTTPS** - 生产环境必须使用HTTPS
4. **输入验证** - 对所有用户输入进行验证
5. **依赖更新** - 定期更新npm包以修复安全漏洞

## 📦 可用脚本

| 命令 | 说明 |
|------|------|
| `npm start` | 启动生产服务器 |
| `npm run dev` | 启动开发服务器（热重载） |
| `npm run build` | 构建前端生产版本 |
| `npm run install-all` | 安装前后端所有依赖 |
| `npm run init-db` | 初始化DynamoDB表和数据 |
| `npm run test-api` | 运行API测试 |
| `npm run dev-frontend` | 独立运行前端开发服务器 |

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📞 支持

如有问题或建议，请通过以下方式联系：
- 提交GitHub Issue
- 查看文档
- 联系开发团队

---

**版本**: 1.0.0  
**最后更新**: 2025-11-08
