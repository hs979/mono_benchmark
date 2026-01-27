# Serverlesspresso - Serverless 咖啡订购系统

这是一个完整的Serverless咖啡订购后端系统,首次展示于AWS re:Invent 2021。本项目采用事件驱动架构(Event-Driven Architecture),由多个微服务组成,支持完整的咖啡订单处理流程。

## 🏗️ 项目架构

本项目包含三个前端应用(不在本仓库中)和多个后端微服务。

### 核心目录结构

```bash
.
├── README.md                    # 项目说明文档(本文件)
├── 项目架构分析.md              # 详细的架构分析文档
│
├── 00-baseCore/                 # 🎯 基础核心设施层
│   ├── template.yaml            # 核心基础设施CloudFormation模板
│   ├── cognito-triggers/        # Cognito用户认证触发器
│   └── GetIoTEndpoint.js        # 获取IoT端点地址
│
├── 01-appCore/                  # 🎯 应用核心层
│   ├── template.yaml            # 主应用CloudFormation模板
│   └── initDB/                  # 数据库初始化脚本
│
├── backends/                    # 后端微服务
│   ├── 1-counting-service/      # 订单编号生成服务
│   ├── 2-config-service/        # 配置管理服务
│   ├── 4-order-processing/      # 订单处理服务 (Step Functions)
│   ├── 5-order-manager/         # 订单管理服务
│   ├── 6-publisher-service/     # IoT实时推送服务
│   ├── 7-metrics-service/       # 指标收集服务 (可选)
│   ├── 8-order-journey/         # 订单旅程可视化服务 (可选)
│   └── 9-validator/             # 订单验证服务
│
└── extensions/                  # 扩展功能示例 (非核心,可删除)
    ├── EventPlayer/             # 事件重放器
    ├── OrderRobotExtension/     # 机器人自动处理
    └── PersistOrderMetricsToDynamoDB/  # 指标持久化
```

## 🔧 技术栈

- **计算**: AWS Lambda (Node.js 14)
- **编排**: AWS Step Functions
- **API网关**: Amazon API Gateway
- **数据库**: Amazon DynamoDB
- **消息**: Amazon EventBridge + AWS IoT Core
- **用户认证**: Amazon Cognito
- **存储**: Amazon S3
- **CDN**: Amazon CloudFront
- **监控**: Amazon CloudWatch
- **基础设施即代码**: AWS SAM

## 📖 详细文档

查看 **[项目架构分析.md](./项目架构分析.md)** 获取:
- 详细的服务架构说明
- 核心文件与可删除文件清单
- 服务依赖关系图
- 精简部署建议

## 🌐 在线工作坊

访问 Serverlesspresso 工作坊: https://workshop.serverlesscoffee.com/

在工作坊中,你将部署一个支持临时咖啡店的serverless后端,并使用3个提供的前端应用进行测试。


## 🚀 部署后端

### 前置要求

在开始之前,请确保已安装:
- [AWS CLI](https://aws.amazon.com/cli/) - 已配置AWS凭证
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
- [Node.js 14](https://nodejs.org/) 及 NPM

**推荐部署区域**: 所有部署都建议使用 `us-east-1` 区域

---

### 步骤 1: 部署基础核心设施

这一步将创建:
- ✅ EventBridge 自定义事件总线
- ✅ Cognito 用户池和自定义SMS认证流程
- ✅ IoT Core 实时消息服务
- ✅ 其他服务所需的基础资源

**部署命令**:

```bash
cd 00-baseCore
sam build
sam deploy --guided
```

**部署提示**:
- **Stack Name**: 输入 `serverlesspresso-core`
- **Service**: 输入 `core`
- **AWS Region**: 输入 `us-east-1`
- 其他选项: 接受默认值

**部署完成后**:
- 记录输出部分显示的信息(UserPoolID, EventBus ARN, IoT端点等)
- 这些输出会自动存储到 [AWS Systems Manager Parameter Store](https://console.aws.amazon.com/systems-manager/parameters/),供后续部署使用

---

### 步骤 2: 部署应用核心服务

这一步将部署所有微服务:
- ✅ 订单验证服务
- ✅ 订单管理服务
- ✅ 订单处理服务
- ✅ 配置管理服务
- ✅ 发布服务
- ✅ 指标服务
- ✅ 订单旅程服务

**部署命令**:

```bash
cd ../01-appCore
sam build
sam deploy --guided
```

**部署提示**:
- **Stack Name**: 输入 `serverlesspresso`
- **AWS Region**: 输入 `us-east-1`
- 其他选项: 接受默认值

---

### 步骤 3: (可选) 部署扩展功能

如需部署扩展功能,请参考 `extensions/README.md` 中的说明。

**注意**: 扩展功能是可选的,不影响核心应用运行。

## 🧪 测试应用

部署完成后,你可以:
1. 使用提供的前端应用进行测试
2. 查看 [CloudWatch日志](https://console.aws.amazon.com/cloudwatch/home) 监控应用运行
3. 在 [Step Functions控制台](https://console.aws.amazon.com/states/home) 查看工作流执行
4. 在 [DynamoDB控制台](https://console.aws.amazon.com/dynamodb/home) 查看订单数据

## 🔍 主要API端点

部署完成后,在CloudFormation输出中可以找到以下API端点:

- **订单管理API**: `ServerlesspressoOrdermanagerRestApi`
- **验证服务API**: `ServerlesspressoValidatorServiceRestApi`
- **配置服务API**: `ServerlesspressoConfigServiceRestApi`

## 🧹 清理资源

为避免产生不必要的AWS费用,完成测试后请删除所有资源:

**方法1: 使用AWS CLI**
```bash
aws cloudformation delete-stack --stack-name serverlesspresso
aws cloudformation delete-stack --stack-name serverlesspresso-core
```

**方法2: 使用AWS控制台**
1. 打开 [CloudFormation 控制台](https://console.aws.amazon.com/cloudformation/)
2. 删除所有以 `serverlesspresso` 开头的堆栈
3. 按创建顺序的反序删除(先删除 `serverlesspresso`,再删除 `serverlesspresso-core`)

## 💰 成本说明

**重要提示**: 
- 本应用使用多个AWS服务,超出免费套餐后会产生费用
- 详细定价请参考 [AWS定价页面](https://aws.amazon.com/pricing/)
- 建议在测试完成后及时清理资源
- 您需要对产生的AWS费用负责

## 🤝 贡献与支持

如有问题或建议:
- 在GitHub仓库中提交 Issue
- 提交 Pull Request 贡献代码
- 查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解贡献指南

## 📚 相关资源

- [AWS Serverless 开发指南](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [AWS Step Functions 文档](https://docs.aws.amazon.com/step-functions/)
- [Amazon EventBridge 文档](https://docs.aws.amazon.com/eventbridge/)
- [Serverlesspresso 工作坊](https://workshop.serverlesscoffee.com/)

## 📄 许可证

Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.

SPDX-License-Identifier: MIT-0

本项目基于 MIT-0 许可证开源。详见 [LICENSE](./LICENSE) 文件。

---

## 🎯 快速总结

### 核心服务(必须保留)
- 基础设施层: EventBridge、Cognito、IoT Core
- 订单验证服务、订单处理服务、订单管理服务
- 配置服务、发布服务、计数服务

### 可选服务(可删除)
- 指标服务 (7-metrics-service)
- 订单旅程服务 (8-order-journey)
- 所有扩展功能 (extensions/)

### 可删除文件类型
- 所有测试文件 (`*Test.js`, `test/`, `tests/`)
- 文档资源文件 (`repo-resources/`, `docs/`)
- 开源项目管理文件 (CODE_OF_CONDUCT.md, CONTRIBUTING.md等)

**查看完整分析**: [项目架构分析.md](./项目架构分析.md)
