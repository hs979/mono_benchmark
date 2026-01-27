# 快速入门指南

## 5 分钟快速部署

### 前提条件
- 已安装 AWS CLI 和 SAM CLI
- 已配置 AWS 凭证（`aws configure`）
- Python 3.9+

### 步骤 1: 构建应用

```bash
cd serverless-app-converted
sam build
```

### 步骤 2: 部署应用

```bash
sam deploy --guided
```

回答部署问题：
- Stack Name: `fileprocessing-app`
- AWS Region: `us-east-1`
- 其他选项：按 Enter 使用默认值

### 步骤 3: 获取 API 端点

部署完成后，记下输出中的 `UploadFileUrl`。

### 步骤 4: 测试应用

使用提供的测试脚本：

```bash
python test_upload.py "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod" sample.md
```

## 使用 PowerShell 部署（Windows）

```powershell
# 运行部署脚本
.\deploy.ps1
```

## 使用 Bash 部署（Linux/Mac）

```bash
# 添加执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

## 手动测试 API

### 上传文件

```bash
curl -X POST "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/upload" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.md",
    "content": "# Hello World\n\nThis is a **wonderful** day!",
    "isBase64": false
  }'
```

### 查询结果（等待 5-10 秒后）

```bash
curl "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/result/test.md"
```

## 常见问题

### Q: 部署失败，提示权限不足
A: 确保您的 AWS 用户/角色具有以下权限：
- Lambda
- S3
- DynamoDB
- API Gateway
- CloudFormation
- IAM

### Q: 查询结果返回 404
A: 等待几秒钟让 Lambda 函数处理完文件，然后重试。

### Q: 如何查看日志？
A: 使用以下命令查看 Lambda 日志：
```bash
sam logs -n ProcessFileFunction --stack-name fileprocessing-app --tail
```

### Q: 如何删除所有资源？
A: 先清空 S3 存储桶，然后删除堆栈：
```bash
# 获取桶名称
aws cloudformation describe-stacks --stack-name fileprocessing-app \
  --query 'Stacks[0].Outputs[?OutputKey==`InputBucketName`].OutputValue' \
  --output text

# 清空桶
aws s3 rm s3://YOUR_INPUT_BUCKET --recursive
aws s3 rm s3://YOUR_OUTPUT_BUCKET --recursive

# 删除堆栈
sam delete
```

## 下一步

- 阅读 [README.md](README.md) 了解详细功能
- 阅读 [ARCHITECTURE.md](ARCHITECTURE.md) 了解架构设计
- 查看 [template.yaml](template.yaml) 了解资源定义

## 帮助

遇到问题？请查看：
1. CloudWatch 日志（Lambda 函数执行日志）
2. CloudFormation 事件（部署问题）
3. README.md 中的故障排查章节








