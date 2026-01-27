import json
import boto3
import os
from datetime import datetime
from processing import convert_to_html, analyze_sentiment
from database import save_sentiment

s3_client = boto3.client('s3')
OUTPUT_BUCKET = os.environ.get('OUTPUT_BUCKET')

def lambda_handler(event, context):
    """
    Lambda函数处理器：处理S3事件，进行Markdown转换和情感分析
    
    触发器：S3上传事件
    处理流程：
    1. 从S3获取上传的Markdown文件
    2. 转换为HTML并上传回S3
    3. 进行情感分析
    4. 保存结果到DynamoDB
    """
    try:
        print("收到事件:", json.dumps(event))
        
        # 解析S3事件
        for record in event['Records']:
            # 获取S3桶和对象键
            bucket = record['s3']['bucket']['name']
            key = record['s3']['object']['key']
            
            print(f"处理文件: s3://{bucket}/{key}")
            
            # 检查是否是HTML文件（避免循环触发）
            if key.endswith('.html'):
                print("跳过HTML文件")
                continue
            
            # 从S3下载文件到/tmp目录
            local_file_path = f"/tmp/{os.path.basename(key)}"
            s3_client.download_file(bucket, key, local_file_path)
            print(f"文件已下载到: {local_file_path}")
            
            # 1. 转换为HTML
            print("-" * 60)
            print("功能1: 格式转换 (Markdown -> HTML)")
            print("-" * 60)
            try:
                html_content = convert_to_html(local_file_path)
                
                # 生成HTML文件名
                filename = os.path.basename(key)
                html_filename = os.path.splitext(filename)[0] + '.html'
                html_key = f"output/html/{html_filename}"
                
                # 上传HTML到S3
                s3_client.put_object(
                    Bucket=OUTPUT_BUCKET,
                    Key=html_key,
                    Body=html_content,
                    ContentType='text/html'
                )
                print(f"HTML文件已上传到 s3://{OUTPUT_BUCKET}/{html_key}")
            except Exception as e:
                print(f"[错误] 格式转换失败: {e}")
                # 继续执行情感分析
            
            # 2. 情感分析
            print("-" * 60)
            print("功能2: 情感分析")
            print("-" * 60)
            try:
                sentiment_data = analyze_sentiment(local_file_path)
            except Exception as e:
                print(f"[错误] 情感分析失败: {e}")
                raise
            
            # 3. 保存到DynamoDB
            print("-" * 60)
            print("保存结果到数据库")
            print("-" * 60)
            try:
                filename = os.path.basename(key)
                save_sentiment(filename, sentiment_data)
            except Exception as e:
                print(f"[错误] 保存结果失败: {e}")
                raise
            
            # 清理临时文件
            if os.path.exists(local_file_path):
                os.remove(local_file_path)
            
            print("=" * 60)
            print("处理完成！")
            print("=" * 60)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': '文件处理成功',
                'bucket': bucket,
                'key': key
            })
        }
    
    except Exception as e:
        print(f"[致命错误] Lambda函数执行失败: {e}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': '文件处理失败',
                'error': str(e)
            })
        }








