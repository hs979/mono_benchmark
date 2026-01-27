# API参考文档

本文档提供完整的REST API端点参考。所有请求和响应都使用JSON格式。

## 基础信息

- **Base URL**: `http://localhost:5000/api`
- **Content-Type**: `application/json`
- **认证方式**: JWT Bearer Token

## 认证流程

### 1. 用户注册

创建新用户账号。

**端点**: `POST /auth/register`

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "user"
}
```

**参数说明**:
- `email` (必需): 用户邮箱
- `password` (必需): 用户密码
- `role` (可选): 用户角色，默认为"user"。可选值：
  - `user`: 普通用户
  - `admin`: 管理员
  - `warehouse`: 仓库人员
  - `delivery`: 配送人员

**响应 (201 Created)**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**错误响应**:
- `400 Bad Request`: 缺少必需字段或邮箱已注册
- `500 Internal Server Error`: 服务器错误

---

### 2. 用户登录

使用邮箱和密码登录，获取访问令牌。

**端点**: `POST /auth/login`

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应 (200 OK)**:
```json
{
  "success": true,
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "user",
    "createdDate": "2024-01-01T00:00:00",
    "modifiedDate": "2024-01-01T00:00:00"
  }
}
```

**说明**:
- `accessToken`: 访问令牌，有效期1小时
- `refreshToken`: 刷新令牌，有效期30天

**错误响应**:
- `401 Unauthorized`: 邮箱或密码错误

---

### 3. 刷新令牌

使用刷新令牌获取新的访问令牌。

**端点**: `POST /auth/refresh`

**请求头**:
```
Authorization: Bearer <refresh_token>
```

**响应 (200 OK)**:
```json
{
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

---

### 4. 获取当前用户信息

获取当前登录用户的详细信息。

**端点**: `GET /auth/me`

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应 (200 OK)**:
```json
{
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "user",
    "createdDate": "2024-01-01T00:00:00",
    "modifiedDate": "2024-01-01T00:00:00"
  }
}
```

---

## 商品管理

### 1. 获取商品列表

获取所有商品的列表（无需认证）。

**端点**: `GET /products`

**查询参数**:
- `limit` (可选): 返回数量限制，默认100

**示例**: `GET /products?limit=50`

**响应 (200 OK)**:
```json
{
  "products": [
    {
      "productId": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Laptop Computer",
      "category": "Electronics",
      "price": 99900,
      "package": {
        "width": 400,
        "length": 300,
        "height": 50,
        "weight": 2000
      },
      "tags": ["electronics", "computer", "laptop"],
      "pictures": [],
      "createdDate": "2024-01-01T00:00:00",
      "modifiedDate": "2024-01-01T00:00:00"
    }
  ]
}
```

**价格说明**: 价格单位为分（美分），99900表示$999.00

---

### 2. 获取单个商品

根据商品ID获取商品详情。

**端点**: `GET /products/{product_id}`

**响应 (200 OK)**:
```json
{
  "product": {
    "productId": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Laptop Computer",
    ...
  }
}
```

**错误响应**:
- `404 Not Found`: 商品不存在

---

### 3. 按类别获取商品

获取指定类别的商品列表。

**端点**: `GET /products/category/{category}`

**查询参数**:
- `limit` (可选): 返回数量限制，默认100

**示例**: `GET /products/category/Electronics?limit=20`

**响应**: 与获取商品列表相同

---

## 订单管理

所有订单接口都需要JWT认证。

### 1. 计算配送价格

在创建订单前，计算配送费用。

**端点**: `POST /orders/delivery-pricing`

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求体**:
```json
{
  "products": [
    {
      "productId": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Laptop Computer",
      "price": 99900,
      "quantity": 1,
      "package": {
        "width": 400,
        "length": 300,
        "height": 50,
        "weight": 2000
      }
    }
  ],
  "address": {
    "name": "John Doe",
    "streetAddress": "123 Main St",
    "city": "New York",
    "country": "US",
    "phoneNumber": "+1234567890"
  }
}
```

**响应 (200 OK)**:
```json
{
  "pricing": 1500
}
```

**配送定价规则**:
- 北欧国家(DK, FI, NO, SE): 免费
- 其他欧盟国家: 1000分/箱
- 北美(US, CA): 1500分/箱
- 其他地区: 2500分/箱

---

### 2. 创建订单

创建新订单（需要先获取支付令牌）。

**端点**: `POST /orders`

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求体**:
```json
{
  "products": [
    {
      "productId": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Laptop Computer",
      "price": 99900,
      "quantity": 1,
      "package": {
        "width": 400,
        "length": 300,
        "height": 50,
        "weight": 2000
      }
    }
  ],
  "address": {
    "name": "John Doe",
    "companyName": "Acme Corp",
    "streetAddress": "123 Main St",
    "postCode": "10001",
    "city": "New York",
    "state": "NY",
    "country": "US",
    "phoneNumber": "+1234567890"
  },
  "deliveryPrice": 1500,
  "paymentToken": "770e8400-e29b-41d4-a716-446655440000"
}
```

**地址字段说明**:
- 必需: `name`, `streetAddress`, `city`, `country`, `phoneNumber`
- 可选: `companyName`, `postCode`, `state`
- `country`: 必须是2字母ISO国家代码

**响应 (201 Created)**:
```json
{
  "success": true,
  "message": "Order created",
  "order": {
    "orderId": "880e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "NEW",
    "products": [...],
    "address": {...},
    "deliveryPrice": 1500,
    "total": 101400,
    "paymentToken": "770e8400-e29b-41d4-a716-446655440000",
    "createdDate": "2024-01-01T12:00:00",
    "modifiedDate": "2024-01-01T12:00:00"
  }
}
```

**订单状态说明**:
- `NEW`: 新订单
- `IN_TRANSIT`: 配送中
- `COMPLETED`: 已完成
- `DELIVERY_FAILED`: 配送失败

**错误响应**:
- `400 Bad Request`: 验证失败（商品不存在、配送价格错误、支付令牌无效等）

---

### 3. 获取订单列表

获取当前用户的所有订单。

**端点**: `GET /orders`

**请求头**:
```
Authorization: Bearer <access_token>
```

**查询参数**:
- `limit` (可选): 返回数量限制，默认50

**响应 (200 OK)**:
```json
{
  "orders": [
    {
      "orderId": "880e8400-e29b-41d4-a716-446655440000",
      ...
    }
  ]
}
```

---

### 4. 获取订单详情

根据订单ID获取订单详情。

**端点**: `GET /orders/{order_id}`

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应 (200 OK)**:
```json
{
  "order": {
    "orderId": "880e8400-e29b-41d4-a716-446655440000",
    ...
  }
}
```

**错误响应**:
- `403 Forbidden`: 无权访问此订单
- `404 Not Found`: 订单不存在

---

### 5. 更新订单

更新订单信息（仅限状态为 NEW 的订单）。

**端点**: `PUT /orders/{order_id}`

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求体**:
```json
{
  "products": [
    {
      "productId": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Laptop Computer",
      "price": 99900,
      "quantity": 2,
      "package": {
        "width": 400,
        "length": 300,
        "height": 50,
        "weight": 2000
      }
    }
  ],
  "deliveryPrice": 1500
}
```

**参数说明**:
- `products` (可选): 新的商品列表
- `deliveryPrice` (可选): 新的配送价格

**响应 (200 OK)**:
```json
{
  "success": true,
  "message": "Order updated",
  "order": {
    "orderId": "880e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "NEW",
    "products": [...],
    "address": {...},
    "deliveryPrice": 1500,
    "total": 201300,
    "paymentToken": "770e8400-e29b-41d4-a716-446655440000",
    "createdDate": "2024-01-01T12:00:00",
    "modifiedDate": "2024-01-01T12:05:00"
  }
}
```

**业务逻辑**:
1. 验证订单状态（必须为 NEW）
2. 验证商品信息（如果修改商品）
3. 验证配送价格（如果修改配送价格）
4. 重新计算订单总价
5. 如果商品变化：自动更新仓库打包请求（仅 NEW 状态）
6. 如果总价变化：自动更新支付授权金额（仅允许减少）

**限制**:
- 只有 `NEW` 状态的订单可以修改
- 支付授权金额只能减少，不能增加
- 打包请求也必须是 `NEW` 状态才能更新商品

**错误响应**:
- `400 Bad Request`: 订单状态不允许修改、验证失败等
- `403 Forbidden`: 无权访问此订单
- `404 Not Found`: 订单不存在

---

### 6. 删除订单

删除订单（仅限状态为 NEW 的订单）。

**端点**: `DELETE /orders/{order_id}`

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应 (200 OK)**:
```json
{
  "success": true,
  "message": "Order deleted"
}
```

**业务逻辑**:
1. 验证订单状态（必须为 NEW）
2. 删除仓库打包请求（包括元数据和所有商品记录）
3. 取消支付授权（释放预授权金额）
4. 删除订单记录

**限制**:
- 只有 `NEW` 状态的订单可以删除
- 一旦订单开始处理（状态变为 IN_PROGRESS 或其他），无法删除

**使用场景**:
- 用户下单后立即取消
- 系统检测到订单异常，需要清理
- 测试环境清理测试数据

**错误响应**:
- `400 Bad Request`: 订单状态不允许删除
- `403 Forbidden`: 无权访问此订单
- `404 Not Found`: 订单不存在

---

## 仓库管理

需要`warehouse`或`admin`角色权限。

### 1. 获取待处理包装请求

获取所有待包装的订单ID列表。

**端点**: `GET /warehouse/packaging-requests`

**请求头**:
```
Authorization: Bearer <access_token>
```

**查询参数**:
- `limit` (可选): 返回数量限制，默认50

**响应 (200 OK)**:
```json
{
  "packagingRequestIds": [
    "880e8400-e29b-41d4-a716-446655440000",
    "990e8400-e29b-41d4-a716-446655440000"
  ]
}
```

---

### 2. 获取包装请求详情

根据订单ID获取包装请求详情。

**端点**: `GET /warehouse/packaging-requests/{order_id}`

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应 (200 OK)**:
```json
{
  "packagingRequest": {
    "orderId": "880e8400-e29b-41d4-a716-446655440000",
    "status": "NEW",
    "products": [
      {
        "productId": "660e8400-e29b-41d4-a716-446655440000",
        "quantity": 1
      }
    ],
    "createdDate": "2024-01-01T12:00:00",
    "modifiedDate": "2024-01-01T12:00:00"
  }
}
```

**包装请求状态**:
- `NEW`: 待处理
- `IN_PROGRESS`: 处理中
- `COMPLETED`: 已完成

---

### 3. 开始包装

将包装请求状态更改为"处理中"。

**端点**: `POST /warehouse/packaging-requests/{order_id}/start`

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应 (200 OK)**:
```json
{
  "success": true,
  "message": "Packaging started"
}
```

---

### 4. 更新商品数量

在包装过程中更新商品数量。

**端点**: `PUT /warehouse/packaging-requests/{order_id}/products`

**请求头**:
```
Authorization: Bearer <access_token>
```

**请求体**:
```json
{
  "productId": "660e8400-e29b-41d4-a716-446655440000",
  "quantity": 2
}
```

**响应 (200 OK)**:
```json
{
  "success": true,
  "message": "Product quantity updated"
}
```

---

### 5. 完成包装

标记包装完成并触发配送流程。

**端点**: `POST /warehouse/packaging-requests/{order_id}/complete`

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应 (200 OK)**:
```json
{
  "success": true,
  "message": "Packaging completed"
}
```

---

## 配送管理

需要`delivery`或`admin`角色权限。

### 1. 获取待配送列表

获取所有待配送的订单列表。

**端点**: `GET /delivery/deliveries`

**请求头**:
```
Authorization: Bearer <access_token>
```

**查询参数**:
- `limit` (可选): 返回数量限制，默认50

**响应 (200 OK)**:
```json
{
  "deliveries": [
    {
      "orderId": "880e8400-e29b-41d4-a716-446655440000",
      "status": "NEW",
      "address": {
        "name": "John Doe",
        ...
      },
      "createdDate": "2024-01-01T12:00:00",
      "modifiedDate": "2024-01-01T12:00:00"
    }
  ]
}
```

**配送状态**:
- `NEW`: 待配送
- `IN_PROGRESS`: 配送中
- `COMPLETED`: 已完成
- `FAILED`: 配送失败

---

### 2. 获取配送详情

根据订单ID获取配送详情。

**端点**: `GET /delivery/deliveries/{order_id}`

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应**: 与获取待配送列表中的单个配送项相同

---

### 3. 开始配送

开始配送订单。

**端点**: `POST /delivery/deliveries/{order_id}/start`

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应 (200 OK)**:
```json
{
  "success": true,
  "message": "Delivery started"
}
```

---

### 4. 完成配送

标记配送完成。

**端点**: `POST /delivery/deliveries/{order_id}/complete`

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应 (200 OK)**:
```json
{
  "success": true,
  "message": "Delivery completed"
}
```

---

### 5. 配送失败

标记配送失败。

**端点**: `POST /delivery/deliveries/{order_id}/fail`

**请求头**:
```
Authorization: Bearer <access_token>
```

**响应 (200 OK)**:
```json
{
  "success": true,
  "message": "Delivery marked as failed"
}
```

---

## 第三方支付系统

模拟第三方支付系统，无需认证。

### 1. 预授权支付

为支付预授权并获取支付令牌。

**端点**: `POST /payment-3p/preauth`

**请求体**:
```json
{
  "cardNumber": "1234567890123456",
  "amount": 101400
}
```

**参数说明**:
- `cardNumber`: 16位信用卡号
- `amount`: 授权金额（单位：分）

**响应 (200 OK)**:
```json
{
  "paymentToken": "770e8400-e29b-41d4-a716-446655440000"
}
```

**说明**: 在实际应用中，卡号会被脱敏存储。

---

### 2. 检查支付令牌

验证支付令牌是否有效以及授权金额是否足够。

**端点**: `POST /payment-3p/check`

**请求体**:
```json
{
  "paymentToken": "770e8400-e29b-41d4-a716-446655440000",
  "amount": 101400
}
```

**响应 (200 OK)**:
```json
{
  "ok": true
}
```

或

```json
{
  "ok": false,
  "message": "Insufficient authorized amount"
}
```

---

### 3. 处理支付

执行实际扣款。

**端点**: `POST /payment-3p/processPayment`

**请求体**:
```json
{
  "paymentToken": "770e8400-e29b-41d4-a716-446655440000"
}
```

**响应 (200 OK)**:
```json
{
  "ok": true
}
```

---

### 4. 取消支付

取消支付授权（退款）。

**端点**: `POST /payment-3p/cancelPayment`

**请求体**:
```json
{
  "paymentToken": "770e8400-e29b-41d4-a716-446655440000"
}
```

**响应 (200 OK)**:
```json
{
  "ok": true
}
```

---

### 5. 更新支付金额

更新授权金额（只能减少，不能增加）。

**端点**: `POST /payment-3p/updateAmount`

**请求体**:
```json
{
  "paymentToken": "770e8400-e29b-41d4-a716-446655440000",
  "amount": 90000
}
```

**响应 (200 OK)**:
```json
{
  "ok": true
}
```

**错误响应**:
```json
{
  "ok": false,
  "message": "New amount exceeds authorized amount"
}
```

---

## 错误处理

### 通用错误格式

所有错误响应都遵循以下格式：

```json
{
  "message": "Error description"
}
```

或

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
```

### HTTP状态码

- `200 OK`: 请求成功
- `201 Created`: 资源创建成功
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未认证或认证失败
- `403 Forbidden`: 无权限访问
- `404 Not Found`: 资源不存在
- `500 Internal Server Error`: 服务器内部错误

---

## 示例工作流程

### 完整的购物流程

```bash
# 1. 用户登录
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"user123"}'

# 保存返回的accessToken

# 2. 浏览商品
curl http://localhost:5000/api/products

# 3. 计算配送价格
curl -X POST http://localhost:5000/api/orders/delivery-pricing \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'

# 4. 获取支付令牌
curl -X POST http://localhost:5000/api/payment-3p/preauth \
  -H "Content-Type: application/json" \
  -d '{"cardNumber":"1234567890123456","amount":101400}'

# 5. 创建订单
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'

# 6. 查看订单
curl http://localhost:5000/api/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 速率限制

当前版本没有实施速率限制，但在生产环境中建议添加。

## API版本

当前版本: v1

Base URL可能在未来版本中包含版本号：`/api/v1/...`

## 支持

如有问题，请参考主文档或联系技术支持。

