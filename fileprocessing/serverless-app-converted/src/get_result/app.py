import json
import boto3
import os
from decimal import Decimal
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.getenv('DYNAMODB_TABLE_NAME', 'ref-arch-fileprocessing-sentiment')

class DecimalEncoder(json.JSONEncoder):
    """Helper class to convert Decimal to float for JSON serialization"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    """
    Lambda函数处理器：从 DynamoDB 获取情感分析结果
    
    接受 GET 请求，返回指定文件的情感分析结果
    路径参数：filename - 要查询的文件名
    """
    try:
        print("收到查询请求")
        
        # 获取路径参数
        if 'pathParameters' not in event or 'filename' not in event['pathParameters']:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': '缺少文件名参数',
                    'error': 'Missing filename parameter'
                }, ensure_ascii=False)
            }
        
        filename = event['pathParameters']['filename']
        print(f"查询文件: {filename}")
        
        # 从 DynamoDB 查询
        table = dynamodb.Table(TABLE_NAME)
        
        try:
            response = table.get_item(
                Key={
                    'filename': filename
                }
            )
        except ClientError as e:
            print(f"[错误] DynamoDB 查询失败: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': '数据库查询失败',
                    'error': str(e)
                }, ensure_ascii=False)
            }
        
        # 检查是否找到记录
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': '未找到该文件的分析结果',
                    'filename': filename,
                    'info': '请确认文件已上传并处理完成'
                }, ensure_ascii=False)
            }
        
        item = response['Item']
        
        # 构建返回结果
        result = {
            'filename': item['filename'],
            'last_modified': item['last_modified'],
            'sentiment': {
                'overall': item['overall_sentiment'],
                'scores': {
                    'positive': float(item['positive']),
                    'negative': float(item['negative']),
                    'neutral': float(item['neutral']),
                    'mixed': float(item['mixed'])
                }
            }
        }
        
        print(f"查询成功: {filename} -> {item['overall_sentiment']}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': '查询成功',
                'data': result
            }, ensure_ascii=False, cls=DecimalEncoder)
        }
    
    except Exception as e:
        print(f"[错误] 查询失败: {e}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': '查询失败',
                'error': str(e)
            }, ensure_ascii=False)
        }








