"""
DynamoDB 数据访问层
用于保存和查询文件处理的情感分析结果

注意：表创建请使用 init_dynamodb.py 脚本或参考 README
"""
import boto3
import os
from datetime import datetime

# 从环境变量获取配置，如果未设置则使用默认值
TABLE_NAME = os.getenv('DYNAMODB_TABLE_NAME', 'ref-arch-fileprocessing-sentiment')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')

# 初始化 DynamoDB 资源
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)

def save_sentiment(filename, sentiment_data):
    """
    保存AWS Comprehend情感分析结果到DynamoDB
    
    参数
    ----------
    filename: str
        被分析的文件名
    sentiment_data: dict
        包含情感分析结果的字典，需包含 'Sentiment' 和 'SentimentScore' 键
        sentiment_data['Sentiment']: 总体情感 (POSITIVE/NEGATIVE/NEUTRAL/MIXED)
        sentiment_data['SentimentScore']: 包含 Positive, Negative, Neutral, Mixed 的信度分数
    """
    try:
        table = dynamodb.Table(TABLE_NAME)
        
        last_modified = datetime.utcnow().isoformat()
        response = table.put_item(
            Item={
                'filename': filename,
                'last_modified': last_modified,
                'overall_sentiment': sentiment_data['Sentiment'],
                'positive': str(sentiment_data['SentimentScore']['Positive']),
                'negative': str(sentiment_data['SentimentScore']['Negative']),
                'neutral': str(sentiment_data['SentimentScore']['Neutral']),
                'mixed': str(sentiment_data['SentimentScore']['Mixed'])
            }
        )
        
        print(f"[数据库] 情感分析结果已保存到DynamoDB: {filename} -> {sentiment_data['Sentiment']}")
    except Exception as e:
        print(f"[数据库错误] 保存情感分析结果失败: {e}")
        raise

