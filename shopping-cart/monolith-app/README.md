# 购物车全栈应用

一个完整的购物车Web应用，包含现代化的Vue.js前端界面和Flask后端API。支持用户认证、商品浏览、购物车管理等完整功能。

## 功能特性

### 核心功能

- **用户认证** - 注册、登录、会话管理
- **商品浏览** - 展示商品列表，查看商品详情
- **匿名购物车** - 无需登录即可添加商品
- **购物车管理** - 添加、修改、删除购物车商品
- **购物车迁移** - 登录后自动合并匿名购物车
- **商品统计** - 实时统计商品在所有购物车中的数量

### 技术特性

- 响应式Material Design界面
- JWT token认证
- Cookie持久化购物车
- 实时购物车同步
- 单页应用（SPA）体验

## 技术栈

### 后端
- **Flask 3.0.0** - Python Web框架
- **DynamoDB** - AWS NoSQL 数据库
- **JWT** - 用户认证
- **PBKDF2-SHA256** - 密码加密
- **Boto3** - AWS SDK for Python

### 前端
- **Vue.js 2.6** - 渐进式JavaScript框架
- **Vuetify 2.1** - Material Design组件库
- **Vuex** - 状态管理
- **Vue Router** - 路由管理
- **Axios** - HTTP客户端

## 快速开始

### 环境要求

- Python >= 3.8
- Node.js >= 12.0
- npm 或 yarn
- AWS账户（用于DynamoDB）或本地DynamoDB（用于开发）

### 安装和运行

#### 方式一：生产模式（推荐）

为了避免依赖冲突，建议始终在Python虚拟环境内运行本项目。

1. **创建并激活虚拟环境**
```bash
# 在项目根目录 (monolith-app) 创建一个名为 venv 的虚拟环境
python -m venv venv

# 激活虚拟环境 (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# (如果使用 Command Prompt, 运行: venv\Scripts\activate.bat)
# (如果使用 anix/macOS, 运行: source venv/bin/activate)
```
> 激活后，您会看到命令行提示符前面有 `(venv)` 字样。

2. **配置AWS凭证**
```bash
# 配置AWS CLI（如果使用AWS DynamoDB）
aws configure

# 或者设置环境变量
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

3. **安装后端依赖**
```bash
# 确保您在(venv)虚拟环境中
pip install -r requirements.txt
```

4. **安装前端依赖并构建**
```bash
cd frontend
npm install
npm run build
cd ..
```

5. **启动应用**
```bash
# 初始化数据库并启动应用
python init_dynamodb.py
python app.py
```

6. **访问应用**  
打开浏览器访问：http://localhost:5000

#### 使用Makefile（快捷方式）

```bash
# 查看所有可用命令
make help

# 生产模式运行
make run

# 仅构建前端
make frontend-build

# 清理生成文件
make clean
```

## 使用说明

### 用户操作流程

1. **浏览商品**
   - 首页自动展示所有商品
   - 查看商品图片、名称、价格和描述

2. **添加到购物车**
   - 无需登录，点击"Add to Cart"即可添加
   - 右上角购物车图标显示商品数量

3. **管理购物车**
   - 点击购物车图标打开侧边栏
   - 修改商品数量或删除商品
   - 查看购物车总价

4. **用户注册/登录**
   - 点击右上角"登录/注册"按钮
   - 填写用户名和密码完成注册
   - 登录后匿名购物车自动合并

5. **结算购物车**
   - 登录后可以进行结算
   - 结算后购物车清空

## REST API 接口

### 用户认证

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/auth/register` | 用户注册 | 否 |
| POST | `/auth/login` | 用户登录 | 否 |

### 产品服务

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/product` | 获取产品列表 | 否 |
| GET | `/product/{id}` | 获取产品详情 | 否 |

### 购物车管理

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/cart` | 查看购物车 | 否 |
| POST | `/cart` | 添加商品 | 否 |
| PUT | `/cart/{id}` | 更新数量 | 否 |
| POST | `/cart/migrate` | 迁移购物车 | 是 |
| POST | `/cart/checkout` | 结算购物车 | 是 |
| GET | `/cart/{id}/total` | 商品统计 | 否 |

## 项目结构

```
monolith-app/
├── app.py                         # Flask主应用（API + 静态文件服务）
├── auth.py                        # JWT认证模块
├── dynamodb.py                    # DynamoDB连接和初始化管理
├── models.py                      # 数据模型和业务逻辑
├── requirements.txt               # Python依赖
├── product_list.json              # 商品数据
├── load_products.py               # 产品数据加载脚本（可选）
├── test_dynamodb_connection.py   # DynamoDB连接测试脚本
├── Makefile                       # 构建脚本
├── README.md                      # 项目说明
├── DYNAMODB_SETUP.md              # DynamoDB配置指南
├── frontend/                      # 前端应用
│   ├── src/
│   │   ├── views/                 # 页面视图
│   │   │   ├── Home.vue           # 商品列表页
│   │   │   ├── Auth.vue           # 登录注册页
│   │   │   └── Payment.vue        # 支付页
│   │   ├── components/            # Vue组件
│   │   ├── store/                 # Vuex状态管理
│   │   ├── backend/
│   │   │   └── api.js             # API封装
│   │   ├── App.vue                # 根组件
│   │   └── main.js                # 入口文件
│   ├── public/
│   │   └── index.html
│   ├── package.json               # 前端依赖
│   └── vue.config.js              # Vue配置
└── .gitignore
```

## 配置说明

### 后端配置

支持以下环境变量：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | 5000 |
| `DEBUG` | 调试模式 | True |
| `SECRET_KEY` | JWT密钥 | dev-secret-key-change-in-production |
| `AWS_REGION` | AWS区域 | us-east-1 |
| `DYNAMODB_TABLE_NAME` | DynamoDB表名 | shopping-cart-monolith |
| `AWS_ACCESS_KEY_ID` | AWS访问密钥 | - |
| `AWS_SECRET_ACCESS_KEY` | AWS秘密密钥 | - |

**生产环境示例：**
```bash
export DEBUG=False
export SECRET_KEY=your-secure-random-key-here
export AWS_REGION=us-east-1
export DYNAMODB_TABLE_NAME=shopping-cart-prod

# 初始化数据库
python init_dynamodb.py

# 启动应用
python app.py
```

### 前端配置

开发环境下，前端自动代理API请求到 `http://localhost:5000`。

如需修改后端地址，编辑 `frontend/vue.config.js`：
```javascript
devServer: {
  proxy: {
    '^/(auth|cart|product)': {
      target: 'http://your-backend-url',
      changeOrigin: true
    }
  }
}
```

## 数据库

应用使用AWS DynamoDB作为数据存储，采用单表设计模式：

### 表结构

**主表**: `shopping-cart-monolith` (可通过环境变量配置)

- **主键**: `pk` (分区键) + `sk` (排序键)
- **TTL**: `expirationTime` (自动清理过期的购物车项)

### 数据模型

| 数据类型 | pk | sk | 说明 |
|---------|----|----|------|
| 用户信息 | `USER#{username}` | `PROFILE` | 用户账户数据 |
| 购物车项 | `user#{userId}` 或 `cart#{cartId}` | `product#{productId}` | 购物车商品 |
| 商品统计 | `PRODUCT#{productId}` | `TOTAL` | 商品在所有购物车中的总数量 |

### 全局二级索引（GSI）

- **username-index**: 用于通过用户名快速查询用户

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `AWS_REGION` | AWS区域 | us-east-1 |
| `DYNAMODB_TABLE_NAME` | DynamoDB表名 | shopping-cart-monolith |
| `AWS_ACCESS_KEY_ID` | AWS访问密钥 | - |
| `AWS_SECRET_ACCESS_KEY` | AWS秘密密钥 | - |

### 首次运行

首次运行前需要初始化DynamoDB表：
```bash
python init_dynamodb.py
python app.py
```

### 清空数据库

如需重置数据库，可以通过AWS控制台或CLI删除表：
```bash
aws dynamodb delete-table --table-name shopping-cart-monolith --region us-east-1
# 重新启动应用会自动创建新表
python app.py
```

## 测试

### DynamoDB连接测试
在运行应用之前，可以先测试DynamoDB连接：
```bash
python test_dynamodb_connection.py
```

### 运行后端测试
```bash
python run_complete_test.py
```

### 手动测试API
```bash
# 获取产品列表
curl http://localhost:5000/product

# 注册用户
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test123"}'

# 登录
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test123"}'
```

## 常见问题

**Q: 前端构建失败？**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Q: 端口被占用？**
```bash
export PORT=8000
python app.py
```

**Q: 前端开发服务器无法连接后端？**  
确保后端运行在 `http://localhost:5000`，检查 `frontend/vue.config.js` 中的代理配置。

**Q: DynamoDB连接错误？**
```bash
# 检查AWS凭证配置
aws sts get-caller-identity

# 检查区域配置
echo $AWS_REGION

# 确保已初始化数据库
python init_dynamodb.py
```

**Q: 表不存在错误？**  
请先运行初始化脚本：
```bash
python init_dynamodb.py
```

## 部署建议

### 生产环境部署

1. **使用专业WSGI服务器**
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

2. **配置Nginx反向代理**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

3. **安全配置**
   - 设置强随机的 `SECRET_KEY`
   - 启用HTTPS
   - 配置CORS白名单
   - 启用请求速率限制

4. **性能优化**
   - 配置DynamoDB的按需容量或预配置吞吐量
   - 添加Redis缓存层
   - 启用Gzip压缩
   - 配置CDN加速静态资源

5. **DynamoDB最佳实践**
   - 使用IAM角色而非硬编码凭证
   - 启用DynamoDB的自动备份
   - 配置CloudWatch告警监控
   - 定期审查访问模式和索引使用

## 许可证

MIT License
