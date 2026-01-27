# 架构转换说明文档

## 概述

本文档详细说明了如何将 Python 单体应用转换为基于 AWS Serverless 架构的应用，以及转换过程中的设计决策和架构变化。

## 原始单体应用架构

### 组件

```
单体应用
├── main.py           # 命令行入口，orchestrator
├── processing.py     # 业务逻辑（转换、分析）
├── database.py       # 数据库操作（DynamoDB）
└── requirements.txt  # 依赖
```

### 执行流程

```
用户执行命令
    ↓
main.py 解析参数
    ↓
初始化数据库 (database.py)
    ↓
读取本地文件
    ↓
转换为 HTML (processing.py)
    ↓
保存到本地文件系统
    ↓
情感分析 (processing.py + AWS Comprehend)
    ↓
保存到 DynamoDB (database.py)
    ↓
完成
```

### 特点

- **执行方式**: 命令行手动执行
- **文件存储**: 本地文件系统
- **触发方式**: 手动触发
- **扩展性**: 单机，手动扩展
- **部署**: 需要服务器（EC2/本地）
- **成本模型**: 固定成本（服务器运行成本）

## Serverless 架构

### 组件

```
Serverless 应用
├── template.yaml              # SAM/CloudFormation 模板
├── src/
│   ├── process_file/          # 文件处理 Lambda
│   │   ├── app.py            # Lambda 处理器
│   │   ├── processing.py     # 业务逻辑（复用）
│   │   ├── database.py       # 数据库操作（复用）
│   │   └── requirements.txt
│   ├── upload_file/           # 上传 API Lambda
│   │   ├── app.py
│   │   └── requirements.txt
│   └── get_result/            # 查询 API Lambda
│       ├── app.py
│       └── requirements.txt
├── test_upload.py             # 测试脚本
├── deploy.sh / deploy.ps1     # 部署脚本
└── README.md
```

### 执行流程

#### 方式 1: API 上传

```
用户调用 API
    ↓
API Gateway (/upload)
    ↓
UploadFileFunction (Lambda)
    ↓
上传文件到 S3 输入桶
    ↓
S3 事件触发
    ↓
ProcessFileFunction (Lambda)
    ├── 从 S3 读取文件
    ├── 转换为 HTML
    ├── 上传 HTML 到 S3 输出桶
    ├── 情感分析 (AWS Comprehend)
    └── 保存到 DynamoDB
    ↓
用户调用 API Gateway (/result/{filename})
    ↓
GetResultFunction (Lambda)
    ↓
从 DynamoDB 查询结果
    ↓
返回结果
```

#### 方式 2: 直接上传 S3

```
用户上传文件到 S3
    ↓
S3 事件自动触发
    ↓
ProcessFileFunction (Lambda)
    ↓
（后续流程同上）
```

### 特点

- **执行方式**: 事件驱动 + API 调用
- **文件存储**: S3 对象存储
- **触发方式**: 自动触发（S3 事件）
- **扩展性**: 自动扩展，无限并发
- **部署**: 无需服务器管理
- **成本模型**: 按使用量付费

## 架构转换详细说明

### 1. 主程序入口转换

**单体应用 (main.py)**:
```python
def main():
    parser = argparse.ArgumentParser(...)
    args = parser.parse_args()
    input_file = args.file
    
    # 处理文件...
    convert_to_html(input_file)
    analyze_sentiment(input_file)
```

**Serverless (process_file/app.py)**:
```python
def lambda_handler(event, context):
    # 从 S3 事件获取文件信息
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']
        
        # 下载文件到 /tmp
        local_file_path = f"/tmp/{os.path.basename(key)}"
        s3_client.download_file(bucket, key, local_file_path)
        
        # 处理文件...
        convert_to_html(local_file_path)
        analyze_sentiment(local_file_path)
```

**转换要点**:
- 命令行参数 → S3 事件参数
- 本地文件路径 → S3 对象键
- 同步执行 → 异步事件驱动
- 添加错误处理和日志记录

### 2. 文件存储转换

**单体应用**:
```python
# 保存到本地文件系统
output_dir = 'output/html'
os.makedirs(output_dir, exist_ok=True)
with open(output_filepath, 'w') as f:
    f.write(html_content)
```

**Serverless**:
```python
# 上传到 S3
s3_client.put_object(
    Bucket=OUTPUT_BUCKET,
    Key=html_key,
    Body=html_content,
    ContentType='text/html'
)
```

**转换要点**:
- 本地文件系统 → S3 对象存储
- 文件路径 → S3 URI (s3://bucket/key)
- Lambda /tmp 目录用于临时存储（最大 10GB，生命周期与函数执行时间相同）

### 3. 数据库初始化转换

**单体应用**:
```python
def init_db():
    try:
        table = dynamodb.Table(TABLE_NAME)
        table.load()  # 检查表是否存在
    except ClientError as e:
        # 表不存在，创建新表
        table = dynamodb.create_table(...)
        table.wait_until_exists()
```

**Serverless (CloudFormation)**:
```yaml
Resources:
  SentimentTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: ref-arch-fileprocessing-sentiment
      AttributeDefinitions:
        - AttributeName: filename
          AttributeType: S
      KeySchema:
        - AttributeName: filename
          KeyType: HASH
      BillingMode: PAY_PER_REQUEST
```

**转换要点**:
- 运行时创建 → 部署时创建（Infrastructure as Code）
- 手动初始化 → CloudFormation 自动管理
- 更安全：避免 Lambda 函数拥有创建表的权限（最小权限原则）

### 4. 添加 API 层

**新增组件**:

1. **上传 API (upload_file/app.py)**:
   - 接收 HTTP POST 请求
   - 解析 JSON 请求体（文件名、内容）
   - 上传到 S3
   - 返回成功响应

2. **查询 API (get_result/app.py)**:
   - 接收 HTTP GET 请求
   - 从 DynamoDB 查询结果
   - 返回 JSON 响应

3. **API Gateway 配置**:
   - REST API
   - CORS 支持
   - 与 Lambda 函数集成

### 5. IAM 权限管理

**单体应用**:
- 使用 AWS CLI 配置的凭证
- 通常具有较广泛的权限

**Serverless**:
```yaml
ProcessFileFunction:
  Policies:
    - S3ReadPolicy:
        BucketName: !Sub '${InputBucketName}-${AWS::AccountId}'
    - S3CrudPolicy:
        BucketName: !Sub '${OutputBucketName}-${AWS::AccountId}'
    - DynamoDBCrudPolicy:
        TableName: !Ref SentimentTable
    - Statement:
        - Effect: Allow
          Action:
            - comprehend:DetectSentiment
          Resource: '*'
```

**转换要点**:
- 每个 Lambda 函数独立的 IAM 角色
- 最小权限原则
- 资源级权限（仅访问特定的 S3 桶和 DynamoDB 表）

## 核心代码对比

### 业务逻辑代码

好消息是，**业务逻辑代码几乎不需要修改**！

#### processing.py 对比

**单体应用**:
```python
def convert_to_html(input_filepath, output_dir='output/html'):
    # 读取 Markdown
    with open(input_filepath, 'r', encoding='utf-8') as f:
        markdown_text = f.read()
    
    # 转换为 HTML
    html_content = markdown.markdown(markdown_text)
    
    # 保存到本地
    os.makedirs(output_dir, exist_ok=True)
    with open(output_filepath, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    return output_filepath
```

**Serverless**:
```python
def convert_to_html(input_filepath):
    # 读取 Markdown
    with open(input_filepath, 'r', encoding='utf-8') as f:
        markdown_text = f.read()
    
    # 转换为 HTML
    html_content = markdown.markdown(markdown_text)
    
    # 返回内容（由调用者上传到 S3）
    return html_content
```

**变化**:
- 去除文件写入逻辑
- 返回内容字符串而不是文件路径
- 其余逻辑完全相同

#### database.py 对比

**单体应用** vs **Serverless**: 

```python
# 完全相同！
def save_sentiment(filename, sentiment_data):
    table = dynamodb.Table(TABLE_NAME)
    response = table.put_item(Item={...})
```

**无需修改**！DynamoDB 操作在单体和 Serverless 中完全相同。

## 架构优势对比

| 维度 | 单体应用 | Serverless 应用 |
|------|---------|----------------|
| **部署复杂度** | 简单（单个应用） | 中等（多个组件） |
| **运维复杂度** | 高（需要管理服务器） | 低（AWS 管理基础设施） |
| **扩展性** | 手动扩展，有上限 | 自动扩展，无上限 |
| **成本（低负载）** | 高（固定成本） | 低（按使用付费） |
| **成本（高负载）** | 中等 | 可能较高 |
| **启动时间** | 即时 | 冷启动延迟（首次调用） |
| **开发复杂度** | 低 | 中等（需要理解事件驱动） |
| **测试** | 简单（本地运行） | 复杂（需要模拟 AWS 服务） |
| **监控** | 需要自行配置 | CloudWatch 自动集成 |
| **高可用性** | 需要自行配置 | 内置（跨多个 AZ） |
| **安全性** | 需要自行配置 | IAM 细粒度权限控制 |
| **版本管理** | 手动 | Lambda 版本和别名 |
| **并发处理** | 受限于服务器资源 | 自动并发（默认 1000） |

## 成本分析示例

### 场景: 每天处理 100 个文件

**单体应用成本（EC2）**:
- t3.small 实例: $0.0208/小时 × 730 小时/月 = **$15.18/月**
- EBS 存储: $0.10/GB × 20GB = **$2.00/月**
- 数据传输: ~$0.50/月
- **总计: ~$17.68/月**

**Serverless 成本**:
- Lambda 调用: 100 × 30 = 3,000 次/月 → **免费**（在免费额度内）
- Lambda 计算: 3,000 × 10 秒 × 512MB = 15,000 GB-秒 → **免费**（在免费额度内）
- S3 存储: $0.023/GB × 1GB = **$0.023/月**
- S3 请求: 6,000 次 → **免费**（在免费额度内）
- DynamoDB: 6,000 次写入，6,000 次读取 → **免费**（在免费额度内）
- API Gateway: 3,000 次调用 → **免费**（在免费额度内）
- Comprehend: 3,000 单位 → **免费**（在免费额度内）
- **总计: ~$0.02/月**

**结论**: 对于低频率使用，Serverless 成本显著降低。

### 场景: 每天处理 10,000 个文件

**单体应用成本（EC2）**:
- c5.large 实例: $0.085/小时 × 730 小时/月 = **$62.05/月**
- EBS 存储: $0.10/GB × 100GB = **$10.00/月**
- 数据传输: ~$5.00/月
- **总计: ~$77.05/月**

**Serverless 成本**:
- Lambda 调用: 10,000 × 30 = 300,000 次/月 → **$0.20/月**（超出免费额度）
- Lambda 计算: 300,000 × 10 秒 × 512MB = 1,500,000 GB-秒 → **$23.00/月**
- S3 存储: $0.023/GB × 50GB = **$1.15/月**
- S3 请求: 600,000 次 → **$2.40/月**
- DynamoDB: 600,000 次写入，600,000 次读取 → **$6.00/月**
- API Gateway: 300,000 次调用 → **$1.05/月**
- Comprehend: 300,000 单位 → **$3.00/月**
- **总计: ~$36.80/月**

**结论**: 即使在较高负载下，Serverless 仍然具有成本优势。

## 转换步骤总结

### 1. 分析原有应用
- 识别组件和依赖
- 理解业务逻辑
- 识别状态和持久化需求

### 2. 设计 Serverless 架构
- 确定事件源（S3、API Gateway 等）
- 设计 Lambda 函数（职责分离）
- 选择存储服务（S3、DynamoDB 等）
- 设计 API 接口

### 3. 重构代码
- 创建 Lambda 处理器
- 调整业务逻辑（文件 I/O → S3 操作）
- 移除数据库初始化逻辑（移至 IaC）
- 添加错误处理

### 4. 编写 IaC 模板
- SAM/CloudFormation 模板
- 定义所有资源
- 配置 IAM 权限
- 设置环境变量

### 5. 测试和部署
- 本地测试（sam local）
- 部署到 AWS
- 集成测试
- 性能测试

### 6. 监控和优化
- CloudWatch 日志和指标
- 设置告警
- 优化性能（内存、超时）
- 优化成本

## 最佳实践

### 1. 代码组织
- **职责分离**: 每个 Lambda 函数专注于单一职责
- **代码复用**: 共享代码抽取为层或库
- **依赖管理**: 使用 requirements.txt 管理依赖

### 2. 错误处理
- **捕获所有异常**: 避免 Lambda 函数崩溃
- **日志记录**: 详细的日志便于调试
- **重试机制**: 对瞬态错误实现重试

### 3. 性能优化
- **冷启动优化**: 最小化依赖，使用预热
- **内存配置**: 根据实际需求调整内存
- **并发控制**: 设置保留并发避免超额

### 4. 安全性
- **最小权限**: IAM 策略仅授予必需权限
- **加密**: S3 加密，DynamoDB 加密
- **密钥管理**: 使用 Secrets Manager 或 Parameter Store

### 5. 成本优化
- **按需付费**: DynamoDB 按需模式
- **生命周期策略**: S3 自动归档旧数据
- **预算告警**: 设置 AWS 预算告警

## 常见陷阱和解决方案

### 1. 冷启动延迟
**问题**: Lambda 首次调用或长时间未调用后启动较慢

**解决方案**:
- 使用 Provisioned Concurrency
- 最小化依赖和代码包大小
- 考虑使用容器镜像优化启动

### 2. /tmp 存储限制
**问题**: Lambda /tmp 目录最大 10GB

**解决方案**:
- 及时清理临时文件
- 使用流式处理大文件
- 考虑使用 EFS 挂载

### 3. 执行时间限制
**问题**: Lambda 最长执行 15 分钟

**解决方案**:
- 拆分长时间任务
- 使用 Step Functions 编排
- 考虑使用 ECS/Fargate 处理长时间任务

### 4. 环境变量大小限制
**问题**: 环境变量总大小不能超过 4KB

**解决方案**:
- 使用 Parameter Store 或 Secrets Manager
- 在代码中从 S3 读取配置

### 5. VPC 冷启动
**问题**: VPC 中的 Lambda 冷启动更慢

**解决方案**:
- 使用 Hyperplane ENI（新版本已改善）
- 评估是否真的需要 VPC
- 使用 Provisioned Concurrency

## 总结

将单体应用转换为 Serverless 架构需要：
1. **思维转变**: 从服务器思维转向事件驱动思维
2. **架构重构**: 分解单体为多个独立的函数
3. **存储调整**: 从本地文件系统转向云存储
4. **IaC**: 使用基础设施即代码管理资源

**优势**:
- 自动扩展
- 按使用付费
- 高可用性
- 低运维成本

**挑战**:
- 学习曲线
- 调试复杂度
- 冷启动延迟
- 供应商锁定

对于文件处理类应用，Serverless 架构是一个很好的选择，特别是当：
- 负载不可预测或有明显波峰波谷
- 不想管理服务器
- 需要快速扩展
- 追求成本效益








