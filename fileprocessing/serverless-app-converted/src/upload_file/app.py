import json
import boto3
import base64
import os
from datetime import datetime

s3_client = boto3.client('s3')
INPUT_BUCKET = os.environ.get('INPUT_BUCKET')

def lambda_handler(event, context):
    """
    Lambda函数处理器：处理文件上传请求
    
    接受 POST 请求，将上传的文件保存到 S3 输入桶
    请求体应包含：
    - filename: 文件名
    - content: 文件内容（base64编码）或纯文本
    """
    try:
        print("收到上传请求")
        
        # 解析请求体
        if 'body' not in event:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': '缺少请求体',
                    'error': 'Missing request body'
                }, ensure_ascii=False)
            }
        
        body = json.loads(event['body'])
        
        # 验证必需字段
        if 'filename' not in body or 'content' not in body:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': '缺少必需字段',
                    'error': 'Missing required fields: filename or content'
                }, ensure_ascii=False)
            }
        
        filename = body['filename']
        content = body['content']
        
        # 检查文件扩展名
        if not (filename.endswith('.md') or filename.endswith('.markdown')):
            print(f"[警告] 文件似乎不是Markdown格式(.md/.markdown): {filename}")
        
        # 处理文件内容
        # 如果内容是 base64 编码，则解码
        is_base64 = body.get('isBase64', False)
        if is_base64:
            try:
                file_content = base64.b64decode(content)
            except Exception as e:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'message': 'Base64 解码失败',
                        'error': str(e)
                    }, ensure_ascii=False)
                }
        else:
            # 如果是纯文本，直接使用
            file_content = content.encode('utf-8')
        
        # 生成 S3 键
        timestamp = datetime.utcnow().strftime('%Y%m%d-%H%M%S')
        s3_key = f"uploads/{timestamp}-{filename}"
        
        # 上传到 S3
        s3_client.put_object(
            Bucket=INPUT_BUCKET,
            Key=s3_key,
            Body=file_content,
            ContentType='text/markdown'
        )
        
        print(f"文件已上传到 s3://{INPUT_BUCKET}/{s3_key}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': '文件上传成功',
                'bucket': INPUT_BUCKET,
                'key': s3_key,
                'filename': filename,
                'info': '文件正在处理中，请稍后查询结果'
            }, ensure_ascii=False)
        }
    
    except Exception as e:
        print(f"[错误] 文件上传失败: {e}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': '文件上传失败',
                'error': str(e)
            }, ensure_ascii=False)
        }








