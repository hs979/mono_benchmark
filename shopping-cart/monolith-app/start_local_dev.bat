@echo off
REM 本地开发环境启动脚本（使用本地DynamoDB）- Windows版本

echo ==========================================
echo 购物车应用 - 本地开发环境启动
echo ==========================================
echo.

REM 设置环境变量
set DYNAMODB_ENDPOINT=http://localhost:8000
set AWS_REGION=us-east-1
set DEBUG=True

echo 【配置信息】
echo   DYNAMODB_ENDPOINT: %DYNAMODB_ENDPOINT%
echo   AWS_REGION: %AWS_REGION%
echo   DEBUG: %DEBUG%
echo.

echo 【检查本地DynamoDB】
curl -s %DYNAMODB_ENDPOINT% >nul 2>&1
if %errorlevel% equ 0 (
    echo   √ 本地DynamoDB已启动
) else (
    echo   × 本地DynamoDB未启动
    echo.
    echo 请先启动本地DynamoDB：
    echo   docker run -p 8000:8000 amazon/dynamodb-local
    echo.
    exit /b 1
)

echo.
echo 【测试DynamoDB连接】
python test_dynamodb_connection.py
if %errorlevel% neq 0 (
    echo.
    echo DynamoDB连接测试失败，请检查配置
    exit /b 1
)

echo.
echo 【启动Flask应用】
echo 访问地址: http://localhost:5000
echo 按 Ctrl+C 停止服务
echo.

python app.py

