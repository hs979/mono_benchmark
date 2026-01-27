# 图片识别与处理单体应用

这是一个完整的全栈单体Web应用，包含前端界面和后端服务。提供用户认证、相册管理、图片上传、元数据提取、AI物体识别和缩略图生成功能。

## 功能特性

### 用户功能
- **用户注册/登录**: 基于JWT的本地认证系统
- **相册管理**: 创建、查看、管理个人相册
- **图片上传**: 通过Web界面上传JPG/PNG格式图片
- **图片展示**: 美观的卡片式照片展示，包含检测标签和元数据

### 后端功能
- **用户认证**: JWT Token认证，密码BCrypt加密
- **元数据提取**: 自动提取EXIF信息、尺寸、格式、地理位置等
- **缩略图生成**: 自动生成250x250px的缩略图
- **物体识别**: 使用AWS Rekognition识别图片中的物体（可选）
- **数据存储**: 使用 Amazon DynamoDB 数据库

## 技术栈

### 后端
- **Node.js** - 运行环境
- **Express.js** - Web框架
- **Amazon DynamoDB** - NoSQL 数据库
- **JWT** - 身份认证
- **BCrypt** - 密码加密
- **ImageMagick** - 图片处理
- **Multer** - 文件上传
- **AWS SDK** - Rekognition 和 DynamoDB 服务

### 前端
- **React** - UI框架
- **React Router** - 路由管理
- **Axios** - HTTP客户端
- **Semantic UI React** - UI组件库

## 系统要求

### 必需
- Node.js >= 14.0.0
- npm 或 yarn
- ImageMagick（图片处理库）
- AWS 账号和凭证（用于 DynamoDB 和 Rekognition 服务）

## 安装与启动

### 1. 配置 AWS 凭证

在安装依赖之前，请先配置 AWS 凭证。有两种方式：

**方法 1: 使用 AWS CLI（推荐）**
```bash
aws configure
# 输入你的 AWS Access Key ID
# 输入你的 AWS Secret Access Key
# 输入默认区域（如 us-east-1）
```

**方法 2: 设置环境变量**
```bash
export AWS_ACCESS_KEY_ID=your_access_key_id
export AWS_SECRET_ACCESS_KEY=your_secret_access_key
export AWS_REGION=us-east-1
```

### 2. 安装后端依赖

```bash
# 在项目根目录
npm install
```

### 3. 安装前端依赖

```bash
# 进入前端目录
cd client
npm install
```

### 4. 构建前端

```bash
# 在client目录下
npm run build
```

构建完成后，前端文件会输出到 `client/build/` 目录。

### 5. 启动应用

```bash
# 返回项目根目录
cd ..

# 开发模式（自动重启）
npm run dev

# 或生产模式
npm start
```

应用将在 http://localhost:3000 启动。

**首次启动时**，应用会自动创建所需的 DynamoDB 表：
- `ImageRecognition-Users` - 用户表
- `ImageRecognition-Albums` - 相册表
- `ImageRecognition-Photos` - 照片表

启动成功后，打开浏览器访问 http://localhost:3000 即可使用。

### 6. 使用应用

1. **注册账号**: 首次访问时，点击"注册"标签，填写用户名、邮箱和密码
2. **登录**: 使用注册的账号登录
3. **创建相册**: 在主页输入相册名称并点击"创建"
4. **上传照片**: 点击相册进入相册详情页，点击"添加图片"上传照片
5. **查看照片**: 上传后可以看到照片的缩略图、检测标签、EXIF信息等

## 配置说明

### DynamoDB 表名配置（可选）

默认情况下，应用会使用以下表名：
- `ImageRecognition-Users` - 用户表
- `ImageRecognition-Albums` - 相册表
- `ImageRecognition-Photos` - 照片表

如果需要自定义表名，可以通过环境变量设置：

```bash
export DYNAMODB_USERS_TABLE=MyApp-Users
export DYNAMODB_ALBUMS_TABLE=MyApp-Albums
export DYNAMODB_PHOTOS_TABLE=MyApp-Photos
```

### JWT 密钥配置（生产环境推荐）

默认使用内置的JWT密钥。生产环境建议通过环境变量设置：

```bash
export JWT_SECRET=your-very-secure-secret-key
```

### AWS 区域配置

默认使用 `us-east-1` 区域。如果需要使用其他区域：

```bash
export AWS_REGION=ap-northeast-1  # 例如：东京区域
```

**注意**：更改区域后，DynamoDB 表会在新区域创建。

## 前端开发模式

如果需要单独开发前端（支持热重载）：

```bash
# 终端1: 启动后端服务器
npm run dev

# 终端2: 启动前端开发服务器
cd client
npm start
```

前端开发服务器会在 http://localhost:3001 启动，并自动代理API请求到后端。

## API接口文档

所有需要认证的接口都需要在请求头中包含JWT Token：
```
Authorization: Bearer <your-jwt-token>
```

### 认证接口

#### 1. 用户注册
```
POST /api/auth/register
Content-Type: application/json
```

**请求体:**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 2. 用户登录
```
POST /api/auth/login
Content-Type: application/json
```

**请求体:**
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**响应示例:** 同注册接口

#### 3. 获取当前用户信息
```
GET /api/auth/me
Authorization: Bearer <token>
```

#### 4. 用户登出
```
POST /api/auth/logout
Authorization: Bearer <token>
```

### 相册接口

#### 5. 创建相册
```
POST /api/albums
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体:**
```json
{
  "name": "我的相册"
}
```

#### 6. 获取所有相册
```
GET /api/albums?limit=999
Authorization: Bearer <token>
```

#### 7. 获取相册详情
```
GET /api/albums/:albumId
Authorization: Bearer <token>
```

#### 8. 获取相册的照片列表
```
GET /api/albums/:albumId/photos?limit=20&offset=0
Authorization: Bearer <token>
```

#### 9. 删除相册
```
DELETE /api/albums/:albumId
Authorization: Bearer <token>
```

### 照片接口

#### 10. 上传并处理图片
```
POST /api/photos
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**参数:**
- `image` (必需): 图片文件（JPG或PNG格式，最大10MB）
- `albumId` (必需): 相册ID

**示例（使用curl）:**
```bash
curl -X POST http://localhost:3000/api/photos \
  -H "Authorization: Bearer <your-token>" \
  -F "image=@/path/to/your/photo.jpg" \
  -F "albumId=album-uuid"
```

**响应示例:**
```json
{
  "success": true,
  "message": "图片上传并处理成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fileName": "550e8400-e29b-41d4-a716-446655440000.jpg",
    "metadata": {
      "format": "JPEG",
      "dimensions": {
        "width": 1920,
        "height": 1080
      },
      "fileSize": 245678,
      "exifMake": "Canon",
      "exifModel": "Canon EOS 5D",
      "creationTime": "2023:10:15 14:30:00"
    },
    "thumbnailInfo": {
      "fileName": "thumb_550e8400-e29b-41d4-a716-446655440000.jpg",
      "width": 250,
      "height": 140
    },
    "rekognitionLabels": [
      { "Name": "Landscape", "Confidence": 98.5 },
      { "Name": "Nature", "Confidence": 95.3 }
    ],
    "processingStatus": "SUCCEEDED"
  }
}
```

#### 11. 列出所有图片
```
GET /api/photos?limit=50&offset=0
Authorization: Bearer <token>
```

**参数:**
- `limit` (可选): 返回数量，默认50
- `offset` (可选): 偏移量，默认0

#### 12. 获取图片详情
```
GET /api/photos/:id
Authorization: Bearer <token>
```

## 访问上传的文件

上传的原图和缩略图可以通过以下URL访问：

- **原图**: `http://localhost:3000/uploads/{fileName}`
- **缩略图**: `http://localhost:3000/uploads/thumbnails/thumb_{fileName}`

## 项目结构

```
monolith-app/
├── server.js                    # Express服务器主文件
├── package.json                 # 后端依赖配置
├── init-db.js                  # 数据库初始化脚本
├── README.md                   # 本文档
│
├── client/                     # 前端React应用
│   ├── package.json            # 前端依赖配置
│   ├── public/                 # 静态资源
│   ├── src/                    # React源代码
│   │   ├── App.js             # 主应用组件
│   │   ├── index.js           # 入口文件
│   │   ├── components/        # React组件
│   │   │   ├── Album.js       # 相册列表和创建
│   │   │   ├── AlbumDetail.js # 相册详情
│   │   │   ├── PhotoList.js   # 照片列表和上传
│   │   │   └── AuthForm.js    # 登录注册表单
│   │   └── services/          # API服务
│   │       ├── authService.js # 认证服务
│   │       └── apiService.js  # API调用
│   └── build/                  # 构建输出目录（npm run build后生成）
│
├── database/                   # 数据库模块
│   ├── index.js               # 数据库入口
│   └── dynamodb.js            # DynamoDB 数据访问层
│
├── middleware/                 # Express中间件
│   └── auth.js                # JWT认证中间件
│
├── routes/                     # API路由
│   ├── auth.js                # 认证路由
│   └── albums.js              # 相册路由
│
├── services/
│   └── image-processor.js     # 图片处理工作流服务
│
├── modules/                    # 业务处理模块
│   ├── extract-metadata.js    # 提取元数据
│   ├── transform-metadata.js  # 转换元数据
│   ├── generate-thumbnail.js  # 生成缩略图
│   └── detect-labels.js       # 物体识别
│
└── uploads/                    # 图片存储目录（自动创建）
    └── thumbnails/            # 缩略图目录
```

## 工作流程

应用的图片处理流程如下：

1. **接收上传** - 用户通过API上传图片
2. **提取元数据** - 提取EXIF、尺寸等信息
3. **格式验证** - 验证是否为支持的格式（JPEG/PNG）
4. **转换元数据** - 解析和规范化元数据格式
5. **并行处理**:
   - **生成缩略图** - 创建250x250px的缩略图
   - **物体识别** - 使用 AWS Rekognition 识别物体
6. **存储结果** - 将所有信息保存到 DynamoDB 数据库

