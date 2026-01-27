"""
用户模型
管理用户账户信息和认证
"""
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app.db import get_users_table
from boto3.dynamodb.conditions import Key


class User:
    """用户模型"""
    
    def __init__(self, user_id=None, email=None, password_hash=None, role='user',
                 created_date=None, modified_date=None):
        """初始化用户对象"""
        self.user_id = user_id
        self.email = email
        self.password_hash = password_hash
        self.role = role
        self.created_date = created_date or datetime.utcnow().isoformat()
        self.modified_date = modified_date or datetime.utcnow().isoformat()
    
    def set_password(self, password):
        """设置密码（加密存储）"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """验证密码"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            'userId': self.user_id,
            'email': self.email,
            'createdDate': self.created_date,
            'modifiedDate': self.modified_date,
            'role': self.role
        }
    
    def save(self):
        """保存用户到DynamoDB"""
        table = get_users_table()
        self.modified_date = datetime.utcnow().isoformat()
        
        item = {
            'userId': self.user_id,
            'email': self.email,
            'passwordHash': self.password_hash,
            'role': self.role,
            'createdDate': self.created_date,
            'modifiedDate': self.modified_date
        }
        
        table.put_item(Item=item)
        return self
    
    @staticmethod
    def get_by_id(user_id):
        """通过用户ID获取用户"""
        table = get_users_table()
        
        response = table.get_item(Key={'userId': user_id})
        
        if 'Item' not in response:
            return None
        
        item = response['Item']
        return User._from_dynamodb_item(item)
    
    @staticmethod
    def get_by_email(email):
        """通过邮箱获取用户"""
        table = get_users_table()
        
        response = table.query(
            IndexName='email-index',
            KeyConditionExpression=Key('email').eq(email)
        )
        
        if not response['Items']:
            return None
        
        item = response['Items'][0]
        return User._from_dynamodb_item(item)
    
    @staticmethod
    def _from_dynamodb_item(item):
        """从DynamoDB项创建User对象"""
        return User(
            user_id=item.get('userId'),
            email=item.get('email'),
            password_hash=item.get('passwordHash'),
            role=item.get('role', 'user'),
            created_date=item.get('createdDate'),
            modified_date=item.get('modifiedDate')
        )
    
    def __repr__(self):
        return f'<User {self.email}>'
