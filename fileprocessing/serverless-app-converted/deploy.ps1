# 文件处理 Serverless 应用部署脚本 (PowerShell)
# 此脚本自动构建和部署应用到 AWS

$ErrorActionPreference = "Stop"

Write-Host "========================================"
Write-Host "文件处理 Serverless 应用 - 部署脚本"
Write-Host "========================================"
Write-Host ""

# 检查必需工具
Write-Host "检查必需工具..."
try {
    $null = Get-Command aws -ErrorAction Stop
} catch {
    Write-Host "错误: 未找到 AWS CLI，请先安装" -ForegroundColor Red
    exit 1
}

try {
    $null = Get-Command sam -ErrorAction Stop
} catch {
    Write-Host "错误: 未找到 SAM CLI，请先安装" -ForegroundColor Red
    exit 1
}

Write-Host "✓ AWS CLI 和 SAM CLI 已安装" -ForegroundColor Green
Write-Host ""

# 检查 AWS 凭证
Write-Host "检查 AWS 凭证..."
try {
    $null = aws sts get-caller-identity 2>$null
} catch {
    Write-Host "错误: AWS 凭证未配置或无效，请运行 'aws configure'" -ForegroundColor Red
    exit 1
}

Write-Host "✓ AWS 凭证有效" -ForegroundColor Green
Write-Host ""

# 询问部署参数
$STACK_NAME = Read-Host "请输入堆栈名称 [fileprocessing-app]"
if ([string]::IsNullOrWhiteSpace($STACK_NAME)) {
    $STACK_NAME = "fileprocessing-app"
}

$AWS_REGION = Read-Host "请输入 AWS 区域 [us-east-1]"
if ([string]::IsNullOrWhiteSpace($AWS_REGION)) {
    $AWS_REGION = "us-east-1"
}

$INPUT_BUCKET = Read-Host "请输入输入桶名称前缀 [fileprocessing-input-bucket]"
if ([string]::IsNullOrWhiteSpace($INPUT_BUCKET)) {
    $INPUT_BUCKET = "fileprocessing-input-bucket"
}

$OUTPUT_BUCKET = Read-Host "请输入输出桶名称前缀 [fileprocessing-output-bucket]"
if ([string]::IsNullOrWhiteSpace($OUTPUT_BUCKET)) {
    $OUTPUT_BUCKET = "fileprocessing-output-bucket"
}

Write-Host ""
Write-Host "部署参数:"
Write-Host "  堆栈名称: $STACK_NAME"
Write-Host "  AWS 区域: $AWS_REGION"
Write-Host "  输入桶前缀: $INPUT_BUCKET"
Write-Host "  输出桶前缀: $OUTPUT_BUCKET"
Write-Host ""

$CONFIRM = Read-Host "确认部署? (y/n)"
if ($CONFIRM -ne "y" -and $CONFIRM -ne "Y") {
    Write-Host "部署已取消"
    exit 0
}

Write-Host ""
Write-Host "========================================"
Write-Host "步骤 1: 构建应用"
Write-Host "========================================"
sam build --region $AWS_REGION

Write-Host ""
Write-Host "========================================"
Write-Host "步骤 2: 部署应用"
Write-Host "========================================"
sam deploy `
    --stack-name $STACK_NAME `
    --region $AWS_REGION `
    --capabilities CAPABILITY_IAM `
    --parameter-overrides `
        "InputBucketName=$INPUT_BUCKET" `
        "OutputBucketName=$OUTPUT_BUCKET" `
    --no-confirm-changeset `
    --no-fail-on-empty-changeset

Write-Host ""
Write-Host "========================================"
Write-Host "部署完成!"
Write-Host "========================================"
Write-Host ""
Write-Host "获取输出信息..."
Write-Host ""

# 获取堆栈输出
aws cloudformation describe-stacks `
    --stack-name $STACK_NAME `
    --region $AWS_REGION `
    --query 'Stacks[0].Outputs' `
    --output table

Write-Host ""
Write-Host "提示: 使用以下命令查看 API 端点:"
Write-Host "  aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION --query 'Stacks[0].Outputs[?OutputKey==``UploadFileUrl``].OutputValue' --output text"
Write-Host ""
Write-Host "提示: 使用 test_upload.py 脚本测试应用"








