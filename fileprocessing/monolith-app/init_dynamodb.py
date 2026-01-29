"""
DynamoDB 表初始化脚本
用于创建文件处理应用所需的 DynamoDB 表

使用方法：
    python init_dynamodb.py
"""
import boto3
import os
import sys
from botocore.exceptions import ClientError

# 从环境变量获取配置
TABLE_NAME = os.getenv('DYNAMODB_TABLE_NAME', 'ref-arch-fileprocessing-sentiment')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')

def get_dynamodb_client():
    """获取 DynamoDB 客户端"""
    return boto3.client('dynamodb', region_name=AWS_REGION)

def table_exists(client, table_name):
    """检查表是否存在"""
    try:
        client.describe_table(TableName=table_name)
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            return False
        raise

def wait_for_table(client, table_name):
    """等待表变为 ACTIVE 状态"""
    print(f"  等待表 {table_name} 变为 ACTIVE 状态...")
    waiter = client.get_waiter('table_exists')
    waiter.wait(
        TableName=table_name,
        WaiterConfig={
            'Delay': 2,
            'MaxAttempts': 30
        }
    )
    print(f"  ✓ 表 {table_name} 已准备就绪")

def create_sentiment_table():
    """
    创建情感分析结果表
    
    表结构：
    - 主键: filename (String) - 文件名作为分区键
    - 属性: 
        - last_modified: 最后修改时间
        - overall_sentiment: 总体情感 (POSITIVE/NEGATIVE/NEUTRAL/MIXED)
        - positive: 正面情感分数
        - negative: 负面情感分数
        - neutral: 中性情感分数
        - mixed: 混合情感分数
    """
    print('\n========================================')
    print('文件处理应用 - DynamoDB 表初始化')
    print('========================================')
    print(f'区域: {AWS_REGION}')
    print(f'表名: {TABLE_NAME}')
    print('')
    
    client = get_dynamodb_client()
    
    # 检查表是否已存在
    if table_exists(client, TABLE_NAME):
        print(f'✓ 表已存在: {TABLE_NAME}')
        print('\n提示: 表已创建，可以直接使用应用')
        return
    
    print(f'创建表: {TABLE_NAME}')
    
    try:
        # 创建表
        client.create_table(
            TableName=TABLE_NAME,
            KeySchema=[
                {
                    'AttributeName': 'filename',
                    'KeyType': 'HASH'  # 分区键
                }
            ],
            AttributeDefinitions=[
                {
                    'AttributeName': 'filename',
                    'AttributeType': 'S'  # String 类型
                }
            ],
            BillingMode='PAY_PER_REQUEST'  # 按需付费模式，无需指定吞吐量
        )
        
        # 等待表创建完成
        wait_for_table(client, TABLE_NAME)
        
        print('\n========================================')
        print('✓ 表初始化完成！')
        print('========================================')
        print(f'\n创建的表:')
        print(f'  - {TABLE_NAME}')
        print(f'    主键: filename (String)')
        print(f'    计费模式: PAY_PER_REQUEST')
        print('\n提示: 现在可以启动应用了！')
        
    except ClientError as e:
        print(f'\n❌ 创建表失败: {e}')
        
        if e.response['Error']['Code'] == 'UnrecognizedClientException':
            print('提示: 请检查 AWS 凭证配置')
            print('  方式1: aws configure')
            print('  方式2: 设置环境变量 AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY')
        elif e.response['Error']['Code'] == 'ResourceInUseException':
            print('提示: 表已存在')
        
        sys.exit(1)
    except Exception as e:
        print(f'\n❌ 初始化失败: {e}')
        sys.exit(1)

if __name__ == '__main__':
    create_sentiment_table()
