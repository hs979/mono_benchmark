# Serverless Shopping Cart 微服务应用

这是一个**完整的AWS Serverless购物车微服务应用**，包含后端REST API和Vue.js前端界面。本应用展示了如何使用AWS无服务器技术构建一个生产级的购物车系统。

## 技术架构

### 后端服务

- **[Amazon API Gateway](https://aws.amazon.com/api-gateway/)** - REST API网关
- **[AWS Lambda](https://aws.amazon.com/lambda/)** - 无服务器计算
- **[Amazon Cognito](https://aws.amazon.com/cognito/)** - 用户认证与授权
- **[Amazon DynamoDB](https://aws.amazon.com/dynamodb/)** - NoSQL数据库
- **[Amazon SQS](https://aws.amazon.com/sqs/)** - 消息队列
- **[DynamoDB Streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html)** - 数据流处理

### 前端应用

- **[Vue.js](https://vuejs.org/)** - 渐进式JavaScript框架
- **[Vuetify](https://vuetifyjs.com/)** - Material Design组件库
- **[Vuex](https://vuex.vuejs.org/)** - 状态管理
- **[AWS Amplify](https://aws-amplify.github.io/)** - 用户认证和API通信

## 架构设计

![Architecture Diagram](./images/architecture.png)

### 核心功能

#### 1. 匿名购物车
- 用户无需登录即可添加商品到购物车
- 使用UUID cookie标识购物车
- 匿名购物车中的商品1天后自动过期（TTL）

#### 2. 用户购物车与迁移
- 用户登录后，匿名购物车自动合并到用户账户
- 如果用户之前已有购物车，数量会累加
- 使用SQS异步删除旧的匿名购物车数据
- 登录用户购物车保留30天

#### 3. 实时商品统计
- 利用DynamoDB Streams实时监听购物车变化
- 自动统计所有购物车中每个商品的总数量
- 可用于库存预测和热门商品分析

#### 4. 产品Mock服务
- 包含一个简单的产品服务用于演示
- 提供商品列表和详情API

### 购物车迁移机制

当商品被添加到购物车时，会在DynamoDB中写入一条记录，主键使用随机生成的UUID cookie标识。这样用户可以在不登录的情况下添加商品，并且在重启浏览器后仍然保留购物车内容。

当用户登录时，这些商品会被迁移：原有的匿名购物车记录会被删除，并用用户ID作为主键重新创建记录。如果用户之前在其他会话中已有购物车，商品数量会累加。
由于删除操作不需要立即同步完成，系统使用SQS队列异步处理删除任务。

### 商品统计机制

虽然可以扫描整个DynamoDB表来统计所有商品数量，但这在规模扩大后会很昂贵。因此，本应用采用增量计算的方式实时维护统计数据。

每当购物车中的商品被添加、删除或更新时，DynamoDB Streams会产生一个事件并触发Lambda函数。该函数计算商品数量的变化量，并更新到DynamoDB的统计记录中。Lambda配置为：等待60秒或累积100个事件后批量处理，既保证了实时性，又提高了效率。

这使得管理员能够实时获取热门商品数据，辅助库存决策。在本实现中，统计API未添加认证，便于演示和测试。

## API 接口文档

### 购物车服务 API

#### `GET /cart`
获取当前用户（匿名或登录）的购物车内容

**响应示例**：
```json
{
  "products": [
    {
      "sk": "product-123",
      "quantity": 2,
      "productDetail": {
        "productId": "product-123",
        "name": "Sample Product",
        "price": 29.99
      }
    }
  ]
}
```

#### `POST /cart`
添加商品到购物车

**请求体**：
```json
{
  "productId": "product-123",
  "quantity": 1
}
```

**响应示例**：
```json
{
  "productId": "product-123",
  "message": "product added to cart"
}
```

#### `PUT /cart/{product-id}`
更新购物车中指定商品的数量

**请求体**：
```json
{
  "quantity": 3
}
```

#### `POST /cart/migrate`
🔐 **需要认证**

用户登录后调用此接口，将匿名购物车合并到用户账户。如果用户已有购物车，商品数量会累加。

**响应示例**：
```json
{
  "products": [...]
}
```

#### `POST /cart/checkout`
🔐 **需要认证**

结算购物车（当前实现仅清空购物车，未集成支付）

#### `GET /cart/{product-id}/total`
获取指定商品在所有用户购物车中的总数量（用于管理员统计）

**响应示例**：
```json
{
  "productId": "product-123",
  "total": 156
}
```

### 产品服务 API

#### `GET /product`
获取所有商品列表

#### `GET /product/{product_id}`
获取指定商品详情

## 部署指南

### 前置要求

**后端部署：**
- Python >= 3.8.0
- boto3
- SAM CLI >= 0.50.0
- AWS CLI
- 已配置AWS凭证

**前端开发和部署：**
- Node.js >= 12.0
- yarn

### 部署方式

您可以选择以下两种部署方式之一：

---

## 方式一：部署后端 + 本地运行前端（推荐开发环境使用）

### 1. 克隆仓库

```bash
git clone <your-repo-url>
cd aws-serverless-shopping-cart
```

### 2. 配置AWS凭证

如果使用命名的AWS配置文件：
```bash
export AWS_PROFILE=your-profile-name
```

### 3. 部署后端服务

系统会自动创建S3存储桶用于部署。如果想使用现有存储桶，可设置环境变量：
```bash
export S3_BUCKET=your-bucket-name
```

构建并部署所有后端资源：
```bash
make backend
```

此命令会依次部署：
- 认证服务（Cognito用户池）
- 产品Mock服务
- 购物车服务

部署完成后，API Gateway的端点URL会输出到控制台，也可以在AWS控制台查看：
- CloudFormation → 对应的Stack → Outputs

### 4. 本地运行前端

启动前端开发服务器：
```bash
make frontend-serve
```

此命令会：
1. 从AWS SSM Parameter Store获取后端配置并写入 `.env` 文件
2. 安装前端依赖（yarn install）
3. 启动本地开发服务器（默认在 http://localhost:8080）

⚠️ **注意**：后端CORS默认配置为允许 `http://localhost:8080`。如果使用其他端口或IP地址（如 `http://127.0.0.1:8080`），会出现CORS错误。

### 5. 使用前端应用

在浏览器中打开 http://localhost:8080，您可以：
- 浏览商品列表
- 匿名添加商品到购物车（无需登录）
- 点击"Sign In"创建账户并登录
- 登录后匿名购物车会自动合并到用户账户
- 完成结账流程

**创建账户说明**：
- 点击页面右上角的"Sign In"
- 点击"Create Account"
- 使用真实的邮箱地址（需要接收验证码）
- 验证邮箱后即可登录

---

## 方式二：使用 AWS Amplify Console 自动部署（推荐生产环境使用）

AWS Amplify Console 可以自动部署后端和前端，并在每次代码提交时自动更新。

### 一键部署

[![One-click deployment](https://oneclick.amplifyapp.com/button.svg)](https://console.aws.amazon.com/amplify/home#/deploy?repo=https://github.com/aws-samples/aws-serverless-shopping-cart)

### 部署步骤

1. 点击上方的"Deploy to Amplify Console"按钮
2. 点击"Connect to GitHub"连接您的GitHub账户
3. 如果没有具有管理员权限的IAM服务角色，选择"Create new role"，否则跳到步骤6
4. 在下拉菜单中选择"Amplify"，然后选择"Amplify - Backend Deployment"，点击"Next"
5. 再次点击"Next"，为角色命名并点击"Create role"
6. 在Amplify控制台中选择刚创建的角色，点击"Save and deploy"
7. Amplify Console会自动将此仓库fork到您的GitHub账户并开始部署
8. 在[Amplify Console](https://console.aws.amazon.com/amplify/home)中查看部署进度
9. 首次部署大约需要12分钟

部署完成后，Amplify会提供一个公开的URL访问您的应用。

---

## 清理资源

### 方式一清理

删除所有后端CloudFormation堆栈：
```bash
make backend-delete
```

⚠️ **注意**：这将删除所有AWS资源，包括DynamoDB表中的数据。

### 方式二清理

在AWS CloudFormation控制台中删除以下堆栈（堆栈名称以 `aws-serverless-shopping-cart-` 开头）：
- 认证服务堆栈
- 产品服务堆栈
- 购物车服务堆栈

在Amplify Console中删除应用。

---

## 前端功能说明

### 主要功能

1. **商品浏览**
   - 首页展示所有可购买的商品
   - 商品卡片显示图片、名称、价格和描述
   - Material Design风格的现代化UI

2. **匿名购物车**
   - 无需登录即可添加商品到购物车
   - 购物车状态保存在浏览器中
   - 刷新页面后购物车内容依然保留（通过UUID cookie）
   - 右上角显示购物车图标和商品数量

3. **用户认证**
   - 使用AWS Cognito实现安全的用户认证
   - 支持注册、登录、登出功能
   - 邮箱验证确保账户安全

4. **购物车管理**
   - 实时更新购物车商品数量
   - 从购物车中删除商品
   - 显示购物车总价
   - 侧边抽屉式购物车界面

5. **购物车迁移**
   - 登录时自动将匿名购物车合并到用户账户
   - 如果用户已有购物车，商品数量会自动累加
   - 无缝的用户体验

6. **结账流程**
   - 模拟支付流程（未集成真实支付网关）
   - 支付确认页面
   - 结账后清空购物车

### 技术特性

- **响应式设计**：支持桌面和移动设备
- **状态管理**：使用Vuex管理全局状态
- **路由**：Vue Router实现单页应用导航
- **API集成**：通过AWS Amplify SDK与后端通信
- **加载状态**：优雅的加载动画提升用户体验

---

## 后端API测试（可选）

如果您只部署了后端，想直接测试API而不使用前端界面，可以使用以下方法：

### 测试API

部署完成后，你可以使用以下工具测试API：

#### 使用 cURL

**获取购物车**：
```bash
curl -X GET https://your-api-id.execute-api.region.amazonaws.com/Prod/cart \
  -H "Cookie: cart-id=your-generated-uuid"
```

**添加商品到购物车**：
```bash
curl -X POST https://your-api-id.execute-api.region.amazonaws.com/Prod/cart \
  -H "Content-Type: application/json" \
  -H "Cookie: cart-id=your-generated-uuid" \
  -d '{"productId": "product-123", "quantity": 2}'
```

**获取商品列表**：
```bash
curl -X GET https://your-api-id.execute-api.region.amazonaws.com/Prod/product
```

#### 使用 Postman

1. 导入API端点
2. 对于匿名请求，在Headers中添加：`Cookie: cart-id=<your-uuid>`
3. 对于认证请求，先通过Cognito获取JWT token，然后在Headers中添加：`Authorization: <jwt-token>`

### 认证流程

需要认证的接口（`/cart/migrate`、`/cart/checkout`）需要在请求头中携带JWT token：

1. 在Cognito用户池中创建用户
2. 使用AWS CLI或SDK进行认证获取token
3. 在请求头添加：`Authorization: <your-jwt-token>`

**创建用户示例**：
```bash
aws cognito-idp sign-up \
  --client-id <your-app-client-id> \
  --username user@example.com \
  --password YourPassword123! \
  --user-attributes Name=email,Value=user@example.com
```

### 清理资源

删除所有CloudFormation堆栈：
```bash
make backend-delete
```

⚠️ **注意**：这将删除所有AWS资源，包括DynamoDB表中的数据。

## 技术亮点

### 1. 无服务器架构
- 按需扩展，无需管理服务器
- 按实际使用量付费

### 2. DynamoDB单表设计
- 使用复合键（pk + sk）设计
- 支持多种访问模式
- 使用TTL自动过期数据

### 3. 异步处理
- SQS队列处理非关键路径任务
- Lambda并发控制防止DynamoDB限流

### 4. 实时数据流
- DynamoDB Streams + Lambda实现增量统计
- 批处理优化性能

### 5. 可观测性
- AWS X-Ray分布式追踪
- CloudWatch日志和指标
- Lambda Powertools增强监控

## 项目结构

```
.
├── backend/                         # 后端服务
│   ├── auth.yaml                    # Cognito认证服务SAM模板
│   ├── product-mock.yaml            # 产品服务SAM模板
│   ├── shoppingcart-service.yaml    # 购物车服务SAM模板
│   ├── layers/
│   │   ├── shared.py                # 共享工具函数
│   │   └── requirements.txt
│   ├── product-mock-service/
│   │   ├── get_product.py           # 获取单个产品
│   │   ├── get_products.py          # 获取产品列表
│   │   ├── product_list.json        # Mock产品数据
│   │   └── requirements.txt
│   └── shopping-cart-service/
│       ├── add_to_cart.py           # 添加到购物车
│       ├── list_cart.py             # 列出购物车
│       ├── update_cart.py           # 更新购物车
│       ├── migrate_cart.py          # 迁移购物车（登录时）
│       ├── checkout_cart.py         # 结算购物车
│       ├── delete_from_cart.py      # 删除购物车项（SQS触发）
│       ├── db_stream_handler.py     # DynamoDB Stream处理器
│       ├── get_cart_total.py        # 获取商品统计
│       ├── utils.py                 # 工具函数
│       └── requirements.txt
├── frontend/                        # 前端应用
│   ├── src/
│   │   ├── components/              # Vue组件
│   │   │   ├── CartButton.vue       # 购物车按钮
│   │   │   ├── CartDrawer.vue       # 购物车抽屉
│   │   │   ├── CartQuantityEditor.vue # 数量编辑器
│   │   │   ├── LoadingOverlay.vue   # 加载遮罩
│   │   │   └── Product.vue          # 商品卡片
│   │   ├── views/                   # 页面视图
│   │   │   ├── Home.vue             # 首页（商品列表）
│   │   │   ├── Auth.vue             # 登录/注册页面
│   │   │   └── Payment.vue          # 支付页面
│   │   ├── store/                   # Vuex状态管理
│   │   │   ├── store.js             # Store配置
│   │   │   ├── actions.js           # 异步操作
│   │   │   ├── mutations.js         # 状态变更
│   │   │   └── getters.js           # 状态获取
│   │   ├── backend/
│   │   │   └── api.js               # API调用封装
│   │   ├── App.vue                  # 根组件
│   │   ├── main.js                  # 入口文件
│   │   └── router.js                # 路由配置
│   ├── public/
│   │   ├── index.html               # HTML模板
│   │   └── favicon.ico
│   ├── scripts/
│   │   └── fetchconfig.js           # 获取后端配置脚本
│   ├── package.json                 # NPM依赖
│   ├── vue.config.js                # Vue CLI配置
│   └── Makefile                     # 前端构建命令
├── amplify-ci/
│   └── amplify-template.yaml        # Amplify CI/CD配置
├── amplify.yml                      # Amplify构建配置
├── Makefile                         # 主部署命令
└── README.md                        # 本文档
```



## 许可证

本项目采用 MIT-0 许可证。详见 [LICENSE](LICENSE) 文件。

## 相关资源

- [AWS Serverless Application Model (SAM)](https://aws.amazon.com/serverless/sam/)
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)
- [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
- [AWS Lambda Powertools](https://awslabs.github.io/aws-lambda-powertools-python/)
