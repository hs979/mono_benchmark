# 电商平台单体应用

该应用使用Flask框架构建，采用 **Amazon DynamoDB** 数据库，实现了完整的电商平台功能



## 项目简介

- **用户管理**：用户注册、登录、JWT认证
- **商品管理**：商品浏览、分类查询
- **订单管理**：订单创建、修改、删除、状态跟踪
- **仓库管理**：包装请求处理
- **配送管理**：配送流程管理
- **支付系统**：支付验证和第三方支付模拟

## 技术栈

- **后端框架**：Flask 3.0
- **数据库**：Amazon DynamoDB（使用 boto3 SDK）
- **认证**：JWT（Flask-JWT-Extended）
- **密码加密**：Werkzeug
- **跨域支持**：Flask-CORS

## 系统要求

- Python 3.8+
- AWS 账号（必需，用于访问 DynamoDB）
- AWS IAM 访问密钥（Access Key ID 和 Secret Access Key）
- pip（Python包管理器）

## 目录结构

```
monolith-app/
├── app/                      # 应用主目录
│   ├── __init__.py          # Flask应用工厂
│   ├── models/              # 数据模型（ORM）
│   │   ├── user.py         # 用户模型
│   │   ├── product.py      # 商品模型
│   │   ├── order.py        # 订单模型
│   │   ├── warehouse.py    # 仓库模型
│   │   ├── delivery.py     # 配送模型
│   │   └── payment.py      # 支付模型
│   ├── services/            # 业务逻辑层
│   │   ├── product_service.py
│   │   ├── order_service.py
│   │   ├── warehouse_service.py
│   │   ├── delivery_service.py
│   │   ├── payment_service.py
│   │   └── delivery_pricing.py
│   ├── routes/              # API路由
│   │   ├── auth.py         # 认证接口
│   │   ├── products.py     # 商品接口
│   │   ├── orders.py       # 订单接口
│   │   ├── warehouse.py    # 仓库接口
│   │   ├── delivery.py     # 配送接口
│   │   ├── payment.py      # 支付接口
│   │   └── payment_3p.py   # 第三方支付接口
│   └── utils/               # 工具函数
│       ├── decorators.py   # 装饰器（权限验证）
│       └── validators.py   # 数据验证
├── config.py               # 配置文件
├── run.py                  # 应用启动入口
├── init_dynamodb.py        # DynamoDB 初始化脚本
├── test_complete_flow.py   # API 集成测试
├── requirements.txt        # Python依赖
├── aws_config.example      # AWS 配置示例
└── README.md              # 本文件
```

## 快速开始

### 1. 克隆或获取项目

```bash
cd monolith-app
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 配置 AWS 凭证

#### 方法 A：使用环境变量（推荐）

**Windows (PowerShell):**
```powershell
$env:AWS_ACCESS_KEY_ID="your-access-key-id"
$env:AWS_SECRET_ACCESS_KEY="your-secret-access-key"
$env:AWS_REGION="us-east-1"
```

**Linux/Mac (Bash):**
```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_REGION="us-east-1"
```

#### 方法 B：使用 AWS CLI 配置

```bash
aws configure
# 然后输入您的 Access Key ID、Secret Access Key 和区域
```

> **💡 提示**：参考 `aws_config.example` 文件查看完整的配置示例

### 4. 初始化 DynamoDB 表

创建所有必需的表：

```bash
python init_dynamodb.py
```

如果需要插入示例数据（用于测试）：

```bash
python init_dynamodb.py --with-samples
```

**示例数据包括**：
- 4个测试用户：
  - `admin@example.com` / `admin123` (管理员)
  - `user@example.com` / `user123` (普通用户)
  - `warehouse@example.com` / `warehouse123` (仓库人员)
  - `delivery@example.com` / `delivery123` (配送员)
- 5个示例商品（笔记本、鼠标、椅子、杯子、鞋子）

### 5. 启动应用

```bash
python run.py
```

应用将在 `http://localhost:5000` 启动。

**预期输出**：

```
Starting ecommerce monolith application...
Environment: development
Server running on http://0.0.0.0:5000
```

### 6. 运行测试

在另一个终端中：

```bash
python test_complete_flow.py
```

**测试场景**：
1. ✓ 订单成功完成流程
2. ✓ 打包失败触发退款
3. ✓ 配送失败触发退款
4. ✓ 支付令牌验证
5. ✓ 订单修改功能 
6. ✓ 订单删除功能 
7. ✓ 删除状态限制 

## API文档

### 认证接口

#### 用户注册
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "role": "user"
}
```

#### 用户登录
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

响应：
{
  "success": true,
  "accessToken": "eyJ0eXAiOiJKV1...",
  "refreshToken": "eyJ0eXAiOiJKV1...",
  "user": {...}
}
```

#### 获取当前用户信息
```
GET /api/auth/me
Authorization: Bearer <access_token>
```

### 商品接口

#### 获取商品列表
```
GET /api/products?limit=100
```

#### 获取单个商品
```
GET /api/products/{product_id}
```

#### 按类别获取商品
```
GET /api/products/category/{category}?limit=100
```

### 订单接口

所有订单接口都需要认证（JWT Token）。

#### 创建订单
```
POST /api/orders
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "products": [
    {
      "productId": "uuid",
      "name": "Product Name",
      "price": 1000,
      "quantity": 2,
      "package": {...}
    }
  ],
  "address": {
    "name": "John Doe",
    "streetAddress": "123 Main St",
    "city": "City",
    "country": "US",
    "phoneNumber": "+1234567890"
  },
  "deliveryPrice": 1500,
  "paymentToken": "uuid"
}
```

#### 获取用户订单列表
```
GET /api/orders?limit=50
Authorization: Bearer <access_token>
```

#### 获取订单详情
```
GET /api/orders/{order_id}
Authorization: Bearer <access_token>
```

#### 计算配送价格
```
POST /api/orders/delivery-pricing
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "products": [...],
  "address": {...}
}
```

### 仓库接口

需要warehouse或admin角色权限。

#### 获取待处理包装请求
```
GET /api/warehouse/packaging-requests?limit=50
Authorization: Bearer <access_token>
```

#### 获取包装请求详情
```
GET /api/warehouse/packaging-requests/{order_id}
Authorization: Bearer <access_token>
```

#### 开始包装
```
POST /api/warehouse/packaging-requests/{order_id}/start
Authorization: Bearer <access_token>
```

#### 更新商品数量
```
PUT /api/warehouse/packaging-requests/{order_id}/products
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "productId": "uuid",
  "quantity": 5
}
```

#### 完成包装
```
POST /api/warehouse/packaging-requests/{order_id}/complete
Authorization: Bearer <access_token>
```

### 配送接口

需要delivery或admin角色权限。

#### 获取待配送列表
```
GET /api/delivery/deliveries?limit=50
Authorization: Bearer <access_token>
```

#### 获取配送详情
```
GET /api/delivery/deliveries/{order_id}
Authorization: Bearer <access_token>
```

#### 开始配送
```
POST /api/delivery/deliveries/{order_id}/start
Authorization: Bearer <access_token>
```

#### 完成配送
```
POST /api/delivery/deliveries/{order_id}/complete
Authorization: Bearer <access_token>
```

#### 配送失败
```
POST /api/delivery/deliveries/{order_id}/fail
Authorization: Bearer <access_token>
```

### 第三方支付接口

模拟第三方支付系统，无需认证。

#### 预授权支付
```
POST /api/payment-3p/preauth
Content-Type: application/json

{
  "cardNumber": "1234567890123456",
  "amount": 10000
}

响应：
{
  "paymentToken": "uuid"
}
```

#### 检查支付令牌
```
POST /api/payment-3p/check
Content-Type: application/json

{
  "paymentToken": "uuid",
  "amount": 10000
}

响应：
{
  "ok": true
}
```

#### 处理支付
```
POST /api/payment-3p/processPayment
Content-Type: application/json

{
  "paymentToken": "uuid"
}
```

#### 取消支付
```
POST /api/payment-3p/cancelPayment
Content-Type: application/json

{
  "paymentToken": "uuid"
}
```

#### 更新支付金额
```
POST /api/payment-3p/updateAmount
Content-Type: application/json

{
  "paymentToken": "uuid",
  "amount": 8000
}
```

## 测试指南

### 使用示例数据测试

1. 初始化数据库并插入示例数据：
```bash
python init_dynamodb.py --with-samples
```

2. 使用示例用户登录：
- 管理员：`admin@example.com` / `admin123`
- 普通用户：`user@example.com` / `user123`
- 仓库人员：`warehouse@example.com` / `warehouse123`
- 配送人员：`delivery@example.com` / `delivery123`

### 完整购物流程测试

1. **用户注册/登录**：
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"user123"}'
```

保存返回的 `accessToken`。

2. **浏览商品**：
```bash
curl http://localhost:5000/api/products
```

3. **获取支付令牌**（模拟第三方支付）：
```bash
curl -X POST http://localhost:5000/api/payment-3p/preauth \
  -H "Content-Type: application/json" \
  -d '{"cardNumber":"1234567890123456","amount":15000}'
```

保存返回的 `paymentToken`。

4. **创建订单**：
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {
        "productId": "<product_id>",
        "name": "Product Name",
        "price": 10000,
        "quantity": 1,
        "package": {"width":100,"length":100,"height":100,"weight":500}
      }
    ],
    "address": {
      "name": "John Doe",
      "streetAddress": "123 Main St",
      "city": "New York",
      "country": "US",
      "phoneNumber": "+1234567890"
    },
    "deliveryPrice": 1500,
    "paymentToken": "<payment_token>"
  }'
```

5. **查看订单**：
```bash
curl http://localhost:5000/api/orders \
  -H "Authorization: Bearer <your_access_token>"
```

6. **仓库处理**（使用warehouse账号登录）：
```bash
# 获取待处理包装请求
curl http://localhost:5000/api/warehouse/packaging-requests \
  -H "Authorization: Bearer <warehouse_access_token>"

# 开始包装
curl -X POST http://localhost:5000/api/warehouse/packaging-requests/<order_id>/start \
  -H "Authorization: Bearer <warehouse_access_token>"

# 完成包装
curl -X POST http://localhost:5000/api/warehouse/packaging-requests/<order_id>/complete \
  -H "Authorization: Bearer <warehouse_access_token>"
```

7. **配送处理**（使用delivery账号登录）：
```bash
# 获取待配送列表
curl http://localhost:5000/api/delivery/deliveries \
  -H "Authorization: Bearer <delivery_access_token>"

# 开始配送
curl -X POST http://localhost:5000/api/delivery/deliveries/<order_id>/start \
  -H "Authorization: Bearer <delivery_access_token>"

# 完成配送
curl -X POST http://localhost:5000/api/delivery/deliveries/<order_id>/complete \
  -H "Authorization: Bearer <delivery_access_token>"
```

## 配置说明

### 环境变量

所有配置都可以通过环境变量进行设置：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `AWS_ACCESS_KEY_ID` | AWS 访问密钥 ID | （必需） |
| `AWS_SECRET_ACCESS_KEY` | AWS 访问密钥 | （必需） |
| `AWS_REGION` | AWS 区域 | us-east-1 |
| `TABLE_USERS_NAME` | 用户表名 | ecommerce-users |
| `TABLE_PRODUCTS_NAME` | 商品表名 | ecommerce-products |
| `TABLE_ORDERS_NAME` | 订单表名 | ecommerce-orders |
| `TABLE_PAYMENT_NAME` | 支付表名 | ecommerce-payment |
| `TABLE_DELIVERY_NAME` | 配送表名 | ecommerce-delivery |
| `TABLE_WAREHOUSE_NAME` | 仓库表名 | ecommerce-warehouse |
| `TABLE_PAYMENT_3P_NAME` | 第三方支付表名 | ecommerce-payment-3p |
| `SECRET_KEY` | Flask 密钥 | dev-secret-key-change-in-production |
| `JWT_SECRET_KEY` | JWT 签名密钥 | jwt-secret-key-change-in-production |
| `CORS_ORIGINS` | 允许的跨域来源 | * |
| `LOG_LEVEL` | 日志级别 | INFO |

### 生产环境配置

在生产环境部署时，请注意：

1. 设置强随机密钥：
```bash
export SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')
export JWT_SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')
```

2. 使用生产配置：
```bash
export FLASK_CONFIG=production
export FLASK_DEBUG=False
```

3. 配置CORS（只允许可信来源）：
```bash
export CORS_ORIGINS=https://yourdomain.com
```

4. 建议使用WSGI服务器（如Gunicorn）而非Flask开发服务器：
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 run:app
```

## 故障排查

### 常见问题

1. **DynamoDB 连接失败**
   - 检查 AWS 凭证是否正确配置
   - 验证 AWS_REGION 是否设置
   - 确认 IAM 用户有 DynamoDB 访问权限
   - 检查网络连接（可以访问 AWS 服务）

2. **表已存在错误**
   - 如果表已经创建，可以直接跳过初始化
   - 或者先删除现有表，然后重新运行 init_dynamodb.py

3. **JWT 令牌失效**
   - 令牌默认 1 小时过期
   - 使用 refresh token 刷新访问令牌
   - 检查系统时间是否正确

4. **权限被拒绝**
   - 确认用户角色正确
   - 检查 JWT 令牌是否有效
   - 验证 Authorization 头格式

5. **导入错误**
   - 确认已安装所有依赖：`pip install -r requirements.txt`
   - 检查 Python 版本（需要 3.8+）

6. **AWS 权限不足**
   - 确保 IAM 用户具有以下权限：
     - `dynamodb:CreateTable`
     - `dynamodb:PutItem`
     - `dynamodb:GetItem`
     - `dynamodb:Query`
     - `dynamodb:Scan`
     - `dynamodb:UpdateItem`
     - `dynamodb:DeleteItem`
