"""
修复管理员权限脚本
"""
import boto3
import os
import hashlib
import sys

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def fix_admin_permissions():
    # 配置
    region = os.environ.get('AWS_REGION', 'us-east-1')
    stage = os.environ.get('STAGE', 'dev')
    table_name = f'Airline-Users-{stage}'
    
    print(f"正在连接 DynamoDB 表: {table_name}...")
    dynamodb = boto3.resource('dynamodb', region_name=region)
    table = dynamodb.Table(table_name)
    
    admin_email = "admin@example.com"
    
    # 1. 查找管理员用户
    try:
        from boto3.dynamodb.conditions import Attr
        response = table.scan(
            FilterExpression=Attr('email').eq(admin_email)
        )
        items = response.get('Items', [])
        
        if not items:
            print(f"❌ 未找到用户 {admin_email}")
            # 如果不存在，创建它
            print("正在创建默认管理员用户...")
            import secrets
            from datetime import datetime
            
            user = {
                'sub': secrets.token_urlsafe(16),
                'email': admin_email,
                'password_hash': hashlib.sha256("admin123".encode()).hexdigest(),
                'groups': ['admin', 'user'],
                'created_at': datetime.utcnow().isoformat()
            }
            table.put_item(Item=user)
            print("✅ 管理员用户已创建")
            return
            
        admin_user = items[0]
        user_id = admin_user['sub']
        current_groups = admin_user.get('groups', [])
        print(f"找到用户: {admin_email} (ID: {user_id})")
        print(f"当前权限组: {current_groups}")
        
        # 2. 更新权限组
        if 'admin' not in current_groups:
            print("正在添加 'admin' 权限...")
            
            # 更新本地对象
            new_groups = list(current_groups)
            new_groups.append('admin')
            
            # 更新数据库
            table.update_item(
                Key={'sub': user_id},
                UpdateExpression='SET groups = :g',
                ExpressionAttributeValues={
                    ':g': new_groups
                }
            )
            print("✅ 权限更新成功！")
        else:
            print("✅ 用户已有管理员权限，无需更新。")
            
    except Exception as e:
        print(f"❌ 发生错误: {str(e)}")

if __name__ == '__main__':
    fix_admin_permissions()

