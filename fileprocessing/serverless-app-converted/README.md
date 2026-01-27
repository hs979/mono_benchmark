# 文件处理 Serverless 应用

## 项目简介

这是一个基于 AWS Serverless 架构的文件处理应用，由单体应用转换而来。它可以完成两个核心功能：

1. **格式转换**：将 Markdown (`.md`) 文件转换为 HTML (`.html`) 文件
2. **情感分析**：使用 AWS Comprehend 分析文本内容的情感倾向（积极、消极或中性），并将结果保存到 DynamoDB 数据库

## 架构说明

### Serverless 架构组件

本应用采用完全 Serverless 的架构，主要包括以下 AWS 服务：

1. **Amazon S3**
   - 输入桶：存储上传的 Markdown 文件
   - 输出桶：存储生成的 HTML 文件
   - S3 事件触发 Lambda 函数自动处理文件

2. **AWS Lambda**
   - `ProcessFileFunction`: 主要的文件处理函数，负责 Markdown 转 HTML 和情感分析
   - `UploadFileFunction`: 处理 API 上传请求，将文件保存到 S3
   - `GetResultFunction`: 从 DynamoDB 查询情感分析结果

3. **Amazon API Gateway**
   - 提供 REST API 接口
   - `/upload` (POST): 上传文件接口
   - `/result/{filename}` (GET): 查询结果接口

4. **Amazon DynamoDB**
   - 存储情感分析结果
   - 按需付费模式（PAY_PER_REQUEST）

5. **AWS Comprehend**
   - 机器学习服务，用于情感分析

### 工作流程

```
用户上传文件
    ↓
API Gateway (/upload)
    ↓
UploadFileFunction (Lambda)
    ↓
S3 输入桶 (存储文件)
    ↓
S3 事件触发
    ↓
ProcessFileFunction (Lambda)
    ├── Markdown → HTML (保存到 S3 输出桶)
    └── 情感分析 (AWS Comprehend)
        ↓
    DynamoDB (保存结果)
    ↓
API Gateway (/result/{filename})
    ↓
GetResultFunction (Lambda)
    ↓
返回情感分析结果
```

## 项目结构

```
serverless-app-converted/
├── template.yaml                    # SAM 配置文件
├── README.md                        # 本说明文件
├── src/
│   ├── process_file/                # 文件处理 Lambda 函数
│   │   ├── app.py                   # Lambda 处理器
│   │   ├── processing.py            # 格式转换和情感分析模块
│   │   ├── database.py              # DynamoDB 交互模块
│   │   └── requirements.txt         # Python 依赖
│   ├── upload_file/                 # 文件上传 Lambda 函数
│   │   ├── app.py                   # Lambda 处理器
│   │   └── requirements.txt         # Python 依赖
│   └── get_result/                  # 获取结果 Lambda 函数
│       ├── app.py                   # Lambda 处理器
│       └── requirements.txt         # Python 依赖
└── samconfig.toml                   # SAM 部署配置（可选）
```

## 前置条件

### 必需工具
- **AWS CLI**: AWS 命令行工具
- **AWS SAM CLI**: Serverless Application Model 命令行工具
- **Python 3.9** 或更高版本
- **Docker**: 用于本地测试（可选）

### 安装工具

#### 1. 安装 AWS CLI

**Windows:**
```powershell
# 下载并安装 AWS CLI MSI 安装程序
# https://aws.amazon.com/cli/
```

**Linux/Mac:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

#### 2. 安装 AWS SAM CLI

**Windows:**
```powershell
# 下载并安装 SAM CLI MSI 安装程序
# https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
```

**Linux/Mac:**
```bash
# 使用 Homebrew (Mac)
brew install aws-sam-cli

# 或使用 pip
pip install aws-sam-cli
```

#### 3. 配置 AWS 凭证

```bash
aws configure
```

输入您的：
- AWS Access Key ID
- AWS Secret Access Key
- Default region name (例如: `us-east-1`)
- Default output format (可以直接回车，默认 `json`)

### AWS IAM 权限要求

部署此应用需要以下 AWS IAM 权限：
- Lambda: 创建和管理 Lambda 函数
- S3: 创建和管理 S3 存储桶
- DynamoDB: 创建和管理表
- API Gateway: 创建和管理 API
- CloudFormation: 创建和管理堆栈
- IAM: 创建 Lambda 执行角色
- Comprehend: 执行情感分析

## 部署指南

### 方式 1: 使用 SAM CLI 部署（推荐）

#### 步骤 1: 构建应用

```bash
cd serverless-app-converted
sam build
```

这将：
- 安装所有 Python 依赖
- 准备部署包
- 验证模板

#### 步骤 2: 部署应用

**首次部署（交互式）：**
```bash
sam deploy --guided
```

您需要回答以下问题：
- Stack Name: 堆栈名称，例如 `fileprocessing-app`
- AWS Region: 部署区域，例如 `us-east-1`
- Parameter InputBucketName: 输入桶名称前缀（默认: `fileprocessing-input-bucket`）
- Parameter OutputBucketName: 输出桶名称前缀（默认: `fileprocessing-output-bucket`）
- Confirm changes before deploy: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Disable rollback: `N`
- Save arguments to configuration file: `Y`
- SAM configuration file: 保持默认 `samconfig.toml`
- SAM configuration environment: 保持默认 `default`

**后续部署（使用保存的配置）：**
```bash
sam deploy
```

#### 步骤 3: 查看输出

部署完成后，会显示以下输出：
- `InputBucketName`: S3 输入存储桶名称
- `OutputBucketName`: S3 输出存储桶名称
- `SentimentTableName`: DynamoDB 表名称
- `UploadFileUrl`: 文件上传 API URL
- `GetResultUrl`: 获取结果 API URL

### 方式 2: 手动部署（不推荐）

如果不想使用 SAM CLI，也可以通过 AWS CloudFormation 控制台手动部署：

1. 将 `template.yaml` 上传到 AWS CloudFormation 控制台
2. 创建新堆栈
3. 手动上传 Lambda 函数代码到 S3
4. 配置参数

## 使用方法

### 方法 1: 使用 API 接口（推荐）

#### 1. 上传文件

使用 API 上传 Markdown 文件：

```bash
# 使用 curl 上传
curl -X POST "https://<API_ID>.execute-api.us-east-1.amazonaws.com/prod/upload" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "sample.md",
    "content": "# Hello World\n\nThis is a **great** day!",
    "isBase64": false
  }'
```

或使用 Python 脚本：

```python
import requests
import json

url = "https://<API_ID>.execute-api.us-east-1.amazonaws.com/prod/upload"

data = {
    "filename": "sample.md",
    "content": "# Hello World\n\nThis is a **great** day!",
    "isBase64": False
}

response = requests.post(url, json=data)
print(response.json())
```

#### 2. 查询结果

等待几秒钟后，查询情感分析结果：

```bash
# 使用 curl 查询
curl "https://<API_ID>.execute-api.us-east-1.amazonaws.com/prod/result/sample.md"
```

或使用 Python 脚本：

```python
import requests

url = "https://<API_ID>.execute-api.us-east-1.amazonaws.com/prod/result/sample.md"

response = requests.get(url)
print(response.json())
```

### 方法 2: 直接上传到 S3

也可以直接将文件上传到 S3 输入桶，Lambda 会自动触发处理：

```bash
# 使用 AWS CLI 上传
aws s3 cp sample.md s3://<INPUT_BUCKET_NAME>/uploads/sample.md
```

### 方法 3: 使用测试脚本

创建一个简单的测试脚本 `test_upload.py`：

```python
import requests
import json
import time
import sys

if len(sys.argv) < 3:
    print("用法: python test_upload.py <API_ENDPOINT> <FILE_PATH>")
    sys.exit(1)

api_endpoint = sys.argv[1]
file_path = sys.argv[2]

# 读取文件内容
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

filename = file_path.split('/')[-1]

# 上传文件
print(f"上传文件: {filename}")
upload_url = f"{api_endpoint}/upload"
data = {
    "filename": filename,
    "content": content,
    "isBase64": False
}

response = requests.post(upload_url, json=data)
print("上传响应:", response.json())

if response.status_code == 200:
    # 等待处理
    print("\n等待处理...")
    time.sleep(5)
    
    # 查询结果
    print(f"\n查询结果: {filename}")
    result_url = f"{api_endpoint}/result/{filename}"
    response = requests.get(result_url)
    print("结果:", json.dumps(response.json(), indent=2, ensure_ascii=False))
else:
    print("上传失败")
```

运行测试：

```bash
python test_upload.py "https://<API_ID>.execute-api.us-east-1.amazonaws.com/prod" sample.md
```

## 查看结果

### 1. 查看 HTML 输出

从 S3 输出桶下载生成的 HTML 文件：

```bash
aws s3 ls s3://<OUTPUT_BUCKET_NAME>/output/html/
aws s3 cp s3://<OUTPUT_BUCKET_NAME>/output/html/sample.html ./
```

### 2. 查看情感分析结果

#### 使用 API 查询
```bash
curl "https://<API_ID>.execute-api.us-east-1.amazonaws.com/prod/result/sample.md"
```

#### 使用 AWS CLI 查询 DynamoDB
```bash
aws dynamodb get-item \
  --table-name ref-arch-fileprocessing-sentiment \
  --key '{"filename": {"S": "sample.md"}}'
```

#### 使用 AWS 管理控制台
1. 登录 AWS 管理控制台
2. 进入 DynamoDB 服务
3. 选择表 `ref-arch-fileprocessing-sentiment`
4. 点击"浏览项目"查看所有记录

## 本地测试

### 使用 SAM CLI 本地测试

#### 1. 本地调用 Lambda 函数

测试文件处理函数：

```bash
# 创建测试事件文件 event.json
cat > event.json << EOF
{
  "Records": [
    {
      "s3": {
        "bucket": {
          "name": "test-bucket"
        },
        "object": {
          "key": "test.md"
        }
      }
    }
  ]
}
EOF

# 本地调用
sam local invoke ProcessFileFunction -e event.json
```

#### 2. 本地启动 API

```bash
sam local start-api
```

然后可以访问本地 API：
```bash
curl -X POST "http://localhost:3000/upload" \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.md", "content": "# Test", "isBase64": false}'
```

## 监控和日志

### 查看 Lambda 日志

使用 AWS CLI：
```bash
# 查看 ProcessFileFunction 日志
sam logs -n ProcessFileFunction --stack-name fileprocessing-app --tail

# 查看最近的日志
aws logs tail /aws/lambda/FileProcessing-ProcessFile --follow
```

使用 AWS 控制台：
1. 进入 Lambda 服务
2. 选择相应的函数
3. 点击"Monitor"标签
4. 点击"View logs in CloudWatch"

### 配置告警

可以为以下指标配置 CloudWatch 告警：
- Lambda 错误率
- Lambda 调用次数
- Lambda 执行时间
- API Gateway 4xx/5xx 错误
- DynamoDB 读写容量

## 成本估算

本应用使用按需付费的 Serverless 服务，成本取决于实际使用量：

- **Lambda**: 按调用次数和执行时间计费
  - 前 100 万次请求/月免费
  - 前 40 万 GB-秒计算时间免费

- **S3**: 按存储量和请求次数计费
  - 前 5 GB 存储免费（12 个月）
  - 前 20,000 GET 请求和 2,000 PUT 请求免费

- **DynamoDB**: 按需付费模式
  - 前 25 GB 存储免费
  - 每月前 200 万次读取免费

- **API Gateway**: 按 API 调用次数计费
  - 前 100 万次 API 调用免费（12 个月）

- **Comprehend**: 按分析的文本单位计费
  - 前 5 万个单位/月免费（12 个月）

## 清理资源

删除所有创建的资源：

```bash
# 删除 CloudFormation 堆栈
sam delete

# 或使用 AWS CLI
aws cloudformation delete-stack --stack-name fileprocessing-app
```

**注意**：删除堆栈前，需要手动清空 S3 存储桶：

```bash
# 清空输入桶
aws s3 rm s3://<INPUT_BUCKET_NAME> --recursive

# 清空输出桶
aws s3 rm s3://<OUTPUT_BUCKET_NAME> --recursive
```

## 与单体应用的对比

| 特性 | 单体应用 | Serverless 应用 |
|------|---------|----------------|
| **部署方式** | 需要服务器（EC2、本地等） | 无需服务器管理 |
| **扩展性** | 手动扩展 | 自动扩展 |
| **成本** | 固定成本（即使空闲） | 按使用量付费 |
| **维护** | 需要维护服务器和运行时 | AWS 负责维护 |
| **可用性** | 单点故障 | 高可用性（跨 AZ） |
| **文件存储** | 本地文件系统 | S3 对象存储 |
| **触发方式** | 命令行手动执行 | S3 事件自动触发 + API 接口 |
| **数据库初始化** | 手动初始化 | CloudFormation 自动创建 |

## 架构优势

1. **完全 Serverless**：无需管理服务器，AWS 负责底层基础设施
2. **自动扩展**：根据负载自动扩展，可处理突发流量
3. **高可用性**：跨多个可用区部署，99.9% 以上可用性
4. **按需付费**：只为实际使用付费，空闲时成本接近零
5. **事件驱动**：S3 上传自动触发处理，无需轮询
6. **API 接口**：提供 REST API，便于集成到其他系统
7. **安全性**：IAM 角色和策略，最小权限原则
8. **监控和日志**：CloudWatch 自动收集日志和指标

## 故障排查

### 常见问题

#### 1. 部署失败

**问题**: `CREATE_FAILED` 错误

**解决方案**:
- 检查 AWS CLI 凭证是否配置正确
- 确保 IAM 用户/角色具有足够的权限
- 查看 CloudFormation 事件日志获取详细错误信息

#### 2. Lambda 函数超时

**问题**: Lambda 执行超过 5 分钟

**解决方案**:
- 增加 Lambda 超时时间（在 `template.yaml` 中修改 `Timeout` 参数）
- 优化代码，减少执行时间
- 考虑使用 AWS Step Functions 处理长时间运行的任务

#### 3. S3 事件未触发 Lambda

**问题**: 上传文件后 Lambda 未执行

**解决方案**:
- 检查 S3 事件通知配置是否正确
- 确保文件扩展名为 `.md`
- 查看 Lambda 函数的 CloudWatch 日志

#### 4. Comprehend 限流

**问题**: `ThrottlingException` 错误

**解决方案**:
- 实现重试逻辑（指数退避）
- 请求提高 Comprehend 服务限制
- 使用批处理减少 API 调用次数

#### 5. DynamoDB 表不存在

**问题**: `ResourceNotFoundException`

**解决方案**:
- 确保 CloudFormation 堆栈部署成功
- 检查环境变量 `DYNAMODB_TABLE_NAME` 是否正确
- 确认表名为 `ref-arch-fileprocessing-sentiment`

## 扩展功能

以下是一些可以添加的扩展功能：

1. **支持更多文件格式**
   - PDF, DOCX, TXT 等
   - 使用 Lambda Layer 添加文件转换库

2. **批处理支持**
   - 支持一次上传多个文件
   - 使用 SQS 队列管理批处理任务

3. **用户认证**
   - 集成 Amazon Cognito
   - API Gateway 授权器

4. **Web 界面**
   - 使用 S3 + CloudFront 托管静态网站
   - React/Vue.js 前端

5. **通知功能**
   - 处理完成后发送邮件通知（SNS + SES）
   - WebSocket 实时通知（API Gateway WebSocket）

6. **更多分析功能**
   - 关键词提取（Comprehend Key Phrases）
   - 实体识别（Comprehend Entity Recognition）
   - 语言检测（Comprehend Language Detection）

7. **数据分析**
   - 使用 Athena 查询 S3 中的数据
   - 使用 QuickSight 可视化分析结果

## 安全最佳实践

1. **最小权限原则**: Lambda 函数仅授予必要的权限
2. **加密**: S3 存储桶启用服务器端加密
3. **访问控制**: S3 存储桶阻止公共访问
4. **日志记录**: CloudWatch 记录所有 Lambda 执行日志
5. **密钥管理**: 使用 AWS Secrets Manager 存储敏感信息
6. **VPC**: 将 Lambda 函数放入 VPC（如需访问私有资源）
7. **API 限流**: API Gateway 设置速率限制和配额

## 参考资料

- [AWS SAM 文档](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS Lambda 文档](https://docs.aws.amazon.com/lambda/)
- [Amazon S3 文档](https://docs.aws.amazon.com/s3/)
- [Amazon DynamoDB 文档](https://docs.aws.amazon.com/dynamodb/)
- [AWS Comprehend 文档](https://docs.aws.amazon.com/comprehend/)
- [Amazon API Gateway 文档](https://docs.aws.amazon.com/apigateway/)

## 支持

如有问题或建议，请通过以下方式联系：
- 创建 GitHub Issue
- 发送邮件到：support@example.com

## 许可证

本项目基于 MIT 许可证开源。








