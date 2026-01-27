# 脚本工具说明

这个目录包含了一些实用脚本,用于初始化和测试应用。

## init-db.js

数据库初始化脚本,用于创建DynamoDB表和添加示例数据。

### 使用方法

```bash
node scripts/init-db.js
```

### 功能

1. 创建三个DynamoDB表:
   - Books (书籍表)
   - Cart (购物车表)
   - Orders (订单表)

2. 初始化示例书籍数据(5本示例书籍)

### 前置要求

- 已配置AWS凭证
- 已安装项目依赖

### 注意事项

- 如果表已存在,脚本会跳过创建步骤
- 建议在首次部署时运行此脚本
- 可以根据需要修改sampleBooks数组来添加更多示例数据

## test-api.sh

API端点测试脚本,用于验证所有API是否正常工作。

### 使用方法

```bash
chmod +x scripts/test-api.sh  # 首次使用需要添加执行权限
./scripts/test-api.sh
```

### 功能

测试以下API端点:
- GET / (根路径)
- GET /books (获取所有书籍)
- GET /books?category=X (按分类获取)
- GET /books/:id (获取单本书)
- POST /cart (添加到购物车)
- GET /cart (获取购物车)
- GET /cart/:bookId (获取购物车项)
- PUT /cart (更新购物车)
- DELETE /cart (删除购物车项)
- POST /orders (创建订单)
- GET /orders (获取订单)
- GET /bestsellers (获取畅销书)
- GET /recommendations (获取推荐)
- GET /search?q=keyword (搜索)

### 前置要求

- 应用已启动(默认在localhost:3000)
- 已有测试数据(运行过init-db.js)

### 自定义配置

可以修改脚本中的变量:
```bash
API_URL="http://localhost:3000"  # API地址
CUSTOMER_ID="test-customer-123"  # 测试用户ID
```

## 其他建议

### 数据备份脚本

可以创建一个备份脚本来导出DynamoDB数据:

```javascript
// backup-data.js
const AWS = require('aws-sdk');
const fs = require('fs');

// 实现备份逻辑
```

### 数据恢复脚本

可以创建一个恢复脚本来导入备份的数据:

```javascript
// restore-data.js
const AWS = require('aws-sdk');
const fs = require('fs');

// 实现恢复逻辑
```

