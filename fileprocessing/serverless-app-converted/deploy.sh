#!/bin/bash

# 文件处理 Serverless 应用部署脚本
# 此脚本自动构建和部署应用到 AWS

set -e

echo "========================================"
echo "文件处理 Serverless 应用 - 部署脚本"
echo "========================================"
echo ""

# 检查必需工具
echo "检查必需工具..."
if ! command -v aws &> /dev/null; then
    echo "错误: 未找到 AWS CLI，请先安装"
    exit 1
fi

if ! command -v sam &> /dev/null; then
    echo "错误: 未找到 SAM CLI，请先安装"
    exit 1
fi

echo "✓ AWS CLI 和 SAM CLI 已安装"
echo ""

# 检查 AWS 凭证
echo "检查 AWS 凭证..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "错误: AWS 凭证未配置或无效，请运行 'aws configure'"
    exit 1
fi

echo "✓ AWS 凭证有效"
echo ""

# 询问部署参数
read -p "请输入堆栈名称 [fileprocessing-app]: " STACK_NAME
STACK_NAME=${STACK_NAME:-fileprocessing-app}

read -p "请输入 AWS 区域 [us-east-1]: " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

read -p "请输入输入桶名称前缀 [fileprocessing-input-bucket]: " INPUT_BUCKET
INPUT_BUCKET=${INPUT_BUCKET:-fileprocessing-input-bucket}

read -p "请输入输出桶名称前缀 [fileprocessing-output-bucket]: " OUTPUT_BUCKET
OUTPUT_BUCKET=${OUTPUT_BUCKET:-fileprocessing-output-bucket}

echo ""
echo "部署参数:"
echo "  堆栈名称: $STACK_NAME"
echo "  AWS 区域: $AWS_REGION"
echo "  输入桶前缀: $INPUT_BUCKET"
echo "  输出桶前缀: $OUTPUT_BUCKET"
echo ""

read -p "确认部署? (y/n): " CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "部署已取消"
    exit 0
fi

echo ""
echo "========================================"
echo "步骤 1: 构建应用"
echo "========================================"
sam build --region $AWS_REGION

echo ""
echo "========================================"
echo "步骤 2: 部署应用"
echo "========================================"
sam deploy \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides \
        InputBucketName=$INPUT_BUCKET \
        OutputBucketName=$OUTPUT_BUCKET \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset

echo ""
echo "========================================"
echo "部署完成!"
echo "========================================"
echo ""
echo "获取输出信息..."
echo ""

# 获取堆栈输出
aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs' \
    --output table

echo ""
echo "提示: 使用以下命令查看 API 端点:"
echo "  aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION --query 'Stacks[0].Outputs[?OutputKey==\`UploadFileUrl\`].OutputValue' --output text"
echo ""
echo "提示: 使用 test_upload.py 脚本测试应用"








