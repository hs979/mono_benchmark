# Serverless 图像识别与处理后端应用

这是一个纯后端Serverless应用，演示如何使用 [AWS Step Functions](https://aws.amazon.com/step-functions/) 编排无服务器处理工作流，结合 [AWS Lambda](http://aws.amazon.com/lambda/)、[Amazon S3](http://aws.amazon.com/s3/)、[Amazon DynamoDB](http://aws.amazon.com/dynamodb/) 和 [Amazon Rekognition](https://aws.amazon.com/rekognition/) 实现智能图像处理。

## 功能特性

当图片上传到 Amazon S3 后，该应用会自动：
- 提取图片元数据（地理位置、尺寸、格式、EXIF信息等）
- 使用 Amazon Rekognition 识别图片中的物体并打标签
- 并行生成缩略图
- 将所有处理结果存储到 DynamoDB

## 技术架构

本应用采用完全Serverless架构，无需管理服务器：
- **AWS Step Functions** - 编排图像处理工作流
- **AWS Lambda** - 执行图像处理逻辑
- **Amazon S3** - 存储原图和缩略图
- **Amazon Rekognition** - AI图像识别
- **Amazon DynamoDB** - 存储元数据
- **AWS AppSync (GraphQL)** - 提供API接口层

## 工作流程说明

### 1. 图片上传触发
- 图片上传到 S3 存储桶的 `private/{userid}/uploads` 目录
- S3 事件自动触发 `S3Trigger` Lambda 函数

### 2. 启动 Step Functions 状态机
- S3Trigger 通过 AppSync GraphQL 接口启动 `ImageProcStateMachine`
- 传递 S3 bucket 和 object key 作为输入参数

### 3. 图像处理工作流 (State Machine 步骤)

**步骤1: ExtractImageMetadata**
- 从 S3 读取图片文件
- 使用 ImageMagick 提取元数据：格式、EXIF信息、尺寸、地理位置等

**步骤2: ImageTypeCheck**  
- 验证文件格式是否为支持的类型 (PNG 或 JPG)
- 如果不支持，抛出 `NotSupportedImageType` 错误并结束执行

**步骤3: TransformMetadata**
- 转换和规范化提取的元数据格式

**步骤4: ParallelProcessing (并行处理)**
- **分支A - Rekognition**: 调用 Amazon Rekognition 检测图片中的物体，提取标签
- **分支B - Thumbnail**: 生成缩略图并存储到 S3 的 `private/{userid}/resized` 目录

**步骤5: StoreImageMetadata**
- 通过 AppSync GraphQL 接口将所有处理结果写入 DynamoDB
- 包括：元数据、Rekognition标签、缩略图信息等 


## 项目结构

```
├── cloudformation/                    # 基础设施定义
│   ├── image-processing.serverless.yaml    # SAM模板：定义Lambda和Step Functions
│   └── state-machine.asl.json             # Step Functions状态机定义
│
├── lambda-functions/                  # Lambda函数源代码
│   ├── extract-image-metadata/        # 提取图片元数据
│   ├── transform-metadata/            # 转换元数据格式  
│   ├── rekognition/                   # 调用Rekognition识别
│   ├── thumbnail/                     # 生成缩略图
│   └── store-image-metadata/          # 存储元数据到DynamoDB
│
└── amplify/backend/                   # Amplify后端配置
    ├── api/photoshare/                # AppSync GraphQL API
    ├── function/S3Trigger*/           # S3上传触发器Lambda
    └── storage/photostorage/          # S3存储配置
```

## 核心组件说明

### Lambda 函数

| 函数名 | 用途 | 触发方式 |
|-------|------|---------|
| **S3Trigger** | 监听S3上传事件，启动处理流程 | S3事件触发 |
| **ExtractImageMetadata** | 提取图片元数据(EXIF、尺寸等) | Step Functions调用 |
| **TransformMetadata** | 转换元数据格式 | Step Functions调用 |
| **RekognitionFunction** | 使用AI识别图片内容 | Step Functions调用(并行) |
| **GenerateThumbnail** | 生成缩略图 | Step Functions调用(并行) |
| **StoreImageMetadata** | 存储处理结果到数据库 | Step Functions调用 |

### 认证方式

所有后端Lambda函数使用 **IAM角色认证**，无需Cognito用户池：
- Lambda通过IAM角色访问AppSync GraphQL API
- AppSync配置支持 `@aws_iam` 认证类型
- 后端之间通过AWS服务IAM权限通信

## 部署说明

### 前提条件
- AWS账号
- AWS CLI 已配置
- Amplify CLI: `npm install -g @aws-amplify/cli`
- SAM CLI: [安装指南](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

### 部署步骤

1. **初始化Amplify后端**
```bash
amplify init
amplify push
```

2. **部署Step Functions和Lambda**
```bash
cd cloudformation
sam build
sam deploy --guided
```

3. **配置参数**
部署时需要提供：
- PhotoRepoS3Bucket: S3存储桶名称（由Amplify创建）
- GraphQLEndPoint: AppSync API端点
- GraphQLAPIId: AppSync API ID
- Stage: 环境名称（如dev/prod）

## 使用方式

### 1. 上传图片测试

部署完成后，可以通过以下方式触发图像处理：

**方法A：通过AWS控制台上传**
```
1. 进入 S3 控制台
2. 找到 PhotoRepo 存储桶
3. 上传图片到 private/{userid}/uploads/ 目录
4. 自动触发处理流程
```

**方法B：通过AWS CLI上传**
```bash
aws s3 cp your-image.jpg s3://your-bucket-name/private/user123/uploads/
```

### 2. 监控执行

**查看Step Functions执行**
1. 进入 [Step Functions控制台](https://console.aws.amazon.com/states/home)
2. 选择 `PhotoProcessingWorkflow-{Stage}` 状态机
3. 查看执行历史和每个步骤的详细信息

**查看Lambda日志**
```bash
# 使用 SAM CLI 查看日志
sam logs -n ExtractImageMetadataFunction --stack-name your-stack-name --tail
```

### 3. 查询处理结果

**通过AppSync GraphQL API查询**
```graphql
query ListPhotos {
  listPhotos {
    items {
      id
      fullsize { key width height }
      thumbnail { key width height }
      format
      objectDetected
      ProcessingStatus
    }
  }
}
```

**通过DynamoDB控制台**
1. 进入 DynamoDB 控制台
2. 找到 Photo 表
3. 查看图片处理结果记录 

## 技术细节

### 支持的图片格式
- JPEG (.jpg, .jpeg)
- PNG (.png)

### 并行处理优化
使用Step Functions的Parallel状态，同时执行Rekognition识别和缩略图生成，提高处理速度。

### 错误处理
- 自动重试机制：失败的步骤会自动重试（最多2次）
- 格式验证：不支持的图片格式会返回明确的错误信息
- 日志记录：所有Lambda函数都记录详细日志到CloudWatch

### 性能参数
- ExtractImageMetadata: 1024MB内存, 200秒超时
- GenerateThumbnail: 1536MB内存, 300秒超时  
- RekognitionFunction: 256MB内存, 30秒超时
- 缩略图最大尺寸: 250x250px

## 清理资源

删除应用创建的所有资源：

1. **删除SAM部署的资源**
```bash
sam delete --stack-name your-stack-name
```

2. **删除Amplify后端**
```bash
amplify delete
```

3. **手动清理**（如果需要）
- S3存储桶中的图片文件
- CloudWatch日志组
- 进入 [CloudFormation控制台](https://console.aws.amazon.com/cloudformation/home) 确认所有栈已删除

## 项目改造说明

本项目已从原始的全栈应用（前端+后端）改造为**纯后端Serverless应用**：

### 已删除的组件
- ❌ React前端应用 (`src/react-frontend/`)
- ❌ Cognito用户认证 (`amplify/backend/auth/`)
- ❌ 前端相关文档和图片
- ❌ Amplify Console部署配置

### 保留的核心后端
- ✅ 5个Lambda图像处理函数
- ✅ Step Functions工作流编排
- ✅ AppSync GraphQL API（作为后端数据层）
- ✅ S3事件触发器
- ✅ DynamoDB数据存储

### 认证方式变更
- 原方案：前端使用Cognito用户池认证
- 现方案：后端Lambda使用IAM角色认证，无需用户登录

## 扩展建议

1. **添加更多图像处理功能**
   - 人脸检测和识别
   - 图像内容审核
   - 水印添加

2. **集成其他服务**
   - SNS通知处理结果
   - SQS队列实现批处理
   - EventBridge触发定时任务

3. **API接口**
   - 添加REST API (API Gateway)
   - 实现图片上传签名URL
   - 提供批量处理接口

## License

This reference architecture sample is licensed under Apache 2.0.

---

**原项目来源**: [AWS Samples - Lambda Image Recognition](https://github.com/aws-samples/lambda-refarch-imagerecognition)  
**改造版本**: 纯后端Serverless架构
