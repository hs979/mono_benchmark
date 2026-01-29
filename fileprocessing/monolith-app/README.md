# 文件处理单体应用

## 项目简介

这是一个命令行工具，用于处理 Markdown 格式的文本文件。它可以完成两个核心功能：

1. **格式转换**：将 Markdown (`.md`) 文件转换为 HTML (`.html`) 文件
2. **情感分析**：分析文本内容的情感倾向（积极、消极或中性），并将结果保存到AWS DynamoDB数据库


## 功能说明

### 1. 格式转换
- 读取输入的 Markdown 文件
- 将其内容转换为标准的 HTML5 格式
- 将生成的 HTML 文件保存到 `output/html/` 目录下
- 输出文件名与输入文件名相同，仅扩展名改为 `.html`

### 2. 情感分析
- 读取输入文件的文本内容
- 使用 **AWS Comprehend** 进行情感分析，这是AWS提供的机器学习服务，可以分析文本情感
- 返回情感分析结果：
  - **总体情感 (Sentiment)**：POSITIVE（积极）、NEGATIVE（消极）、NEUTRAL（中性）或 MIXED（混合）
  - **情感信度分数 (SentimentScore)**：包含四个维度的信度值（0到1之间）
    - **Positive**: 积极情感的信度分数
    - **Negative**: 消极情感的信度分数
    - **Neutral**: 中性情感的信度分数
    - **Mixed**: 混合情感的信度分数
- 将分析结果保存到AWS DynamoDB数据库中

## 项目结构

```
monolith-app/
├── main.py              # 主程序入口
├── processing.py        # 核心处理模块（格式转换和情感分析）
├── database.py          # 数据库访问模块（DynamoDB CRUD 操作）
├── init_dynamodb.py     # DynamoDB 表初始化脚本
├── requirements.txt     # Python 依赖库列表
├── output/              # 输出目录
│   └── html/            # 存放生成的 HTML 文件
└── README.md            # 本说明文件
```

## 安装指南

### 前置条件
- Python 3.6 或更高版本
- pip（Python 包管理工具）
- AWS账户，并配置好访问凭证
- 具有DynamoDB和Comprehend访问权限的AWS IAM用户或角色

### AWS凭证配置

在使用本应用之前，需要配置AWS凭证。有以下几种方式：

#### 方式1: 使用AWS CLI配置（推荐）
```bash
aws configure
```
然后输入您的：
- AWS Access Key ID
- AWS Secret Access Key
- Default region name (例如: us-east-1)
- Default output format (可以直接回车)

#### 方式2: 使用环境变量
```bash
# Windows PowerShell
$env:AWS_ACCESS_KEY_ID="your-access-key-id"
$env:AWS_SECRET_ACCESS_KEY="your-secret-access-key"
$env:AWS_REGION="us-east-1"

# Linux/Mac
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_REGION="us-east-1"
```

#### 方式3: 使用IAM角色（在EC2实例上运行时）
如果应用运行在AWS EC2实例上，可以为实例分配一个具有DynamoDB访问权限的IAM角色，无需手动配置凭证。

### 环境变量配置（可选）

您可以通过环境变量自定义DynamoDB表名和AWS区域：

```bash
# Windows PowerShell
$env:DYNAMODB_TABLE_NAME="your-custom-table-name"
$env:AWS_REGION="us-west-2"

# Linux/Mac
export DYNAMODB_TABLE_NAME="your-custom-table-name"
export AWS_REGION="us-west-2"
```

如果不设置，将使用默认值：
- 表名: `ref-arch-fileprocessing-sentiment`
- 区域: `us-east-1`

### 安装步骤

1. **进入项目目录**
   ```bash
   cd monolith-app
   ```

2. **安装依赖库**
   ```bash
   pip install -r requirements.txt
   ```

3. **初始化 DynamoDB 表**
   
   首次使用前，需要创建数据库表：
   ```bash
   python init_dynamodb.py
   ```
   
   此命令会创建名为 `ref-arch-fileprocessing-sentiment` 的表（可通过环境变量自定义表名）。

## 使用方法

### 基本用法

在命令行中运行以下命令来处理一个 Markdown 文件：

```bash
python main.py <文件路径>
```

### 示例

假设你有一个名为 `sample-01.md` 的文件，位于当前目录下：

```bash
python main.py sample-01.md
```

程序会自动完成以下步骤：
1. 将 `sample-01.md` 转换为 HTML，保存为 `output/html/sample-01.html`
2. 分析 `sample-01.md` 的情感，并将结果保存到 DynamoDB 数据库中

### 处理其他位置的文件

你也可以指定任意路径的文件：

```bash
python main.py /path/to/your/file.md
```

或者在 Windows 系统中：

```bash
python main.py C:\Users\YourName\Documents\myfile.md
```

## 输出说明

### 1. HTML 文件
转换后的 HTML 文件会保存在 `output/html/` 目录下。你可以使用任何浏览器打开查看。

### 2. 数据库记录
情感分析结果会保存在AWS DynamoDB中。DynamoDB表包含以下字段：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| filename | String | 被分析的文件名（主键） |
| last_modified | String | 分析时间（ISO 8601 格式） |
| overall_sentiment | String | 总体情感（POSITIVE/NEGATIVE/NEUTRAL/MIXED） |
| positive | String | 积极情感信度分数（0 到 1） |
| negative | String | 消极情感信度分数（0 到 1） |
| neutral | String | 中性情感信度分数（0 到 1） |
| mixed | String | 混合情感信度分数（0 到 1） |

### 查看数据库内容

#### 方式1: 使用AWS CLI
```bash
aws dynamodb scan --table-name ref-arch-fileprocessing-sentiment
```

#### 方式2: 使用AWS管理控制台
1. 登录AWS管理控制台
2. 进入DynamoDB服务
3. 选择表 `ref-arch-fileprocessing-sentiment`
4. 点击"浏览项目"查看所有记录

#### 方式3: 使用boto3 Python脚本查询
```python
import boto3

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('ref-arch-fileprocessing-sentiment')

response = table.scan()
for item in response['Items']:
    print(item)
```

## 测试应用

你可以使用项目根目录下 `tests/` 文件夹中的示例文件来测试应用：

```bash
python main.py ../tests/sample-01.md
python main.py ../tests/sample-02.md
```

处理完成后，检查：
- `output/html/` 目录下是否生成了对应的 `.html` 文件
- 使用AWS CLI查看DynamoDB中的记录：
  ```bash
  aws dynamodb scan --table-name ref-arch-fileprocessing-sentiment
  ```




