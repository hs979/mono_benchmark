"""
支付模型
管理支付令牌和交易信息
"""
from datetime import datetime
from app.db import get_payment_3p_table


class PaymentToken:
    """支付令牌模型（模拟第三方支付系统）"""
    
    def __init__(self, payment_token=None, amount=None, status='AUTHORIZED',
                 card_number_last4=None, created_date=None, modified_date=None):
        """初始化支付令牌对象"""
        self.payment_token = payment_token
        self.amount = amount
        self.status = status
        self.card_number_last4 = card_number_last4
        self.created_date = created_date or datetime.utcnow().isoformat()
        self.modified_date = modified_date or datetime.utcnow().isoformat()
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            'paymentToken': self.payment_token,
            'amount': self.amount,
            'status': self.status,
            'createdDate': self.created_date,
            'modifiedDate': self.modified_date
        }
    
    def save(self):
        """保存支付令牌到DynamoDB"""
        table = get_payment_3p_table()
        self.modified_date = datetime.utcnow().isoformat()
        
        item = {
            'paymentToken': self.payment_token,
            'amount': self.amount,
            'status': self.status,
            'createdDate': self.created_date,
            'modifiedDate': self.modified_date
        }
        
        if self.card_number_last4:
            item['cardNumberLast4'] = self.card_number_last4
        
        table.put_item(Item=item)
        return self
    
    @staticmethod
    def get_by_token(payment_token):
        """通过令牌获取支付信息"""
        table = get_payment_3p_table()
        
        response = table.get_item(Key={'paymentToken': payment_token})
        
        if 'Item' not in response:
            return None
        
        item = response['Item']
        return PaymentToken._from_dynamodb_item(item)
    
    @staticmethod
    def delete_by_token(payment_token):
        """删除支付令牌"""
        table = get_payment_3p_table()
        table.delete_item(Key={'paymentToken': payment_token})
    
    @staticmethod
    def _from_dynamodb_item(item):
        """从DynamoDB项创建PaymentToken对象"""
        return PaymentToken(
            payment_token=item.get('paymentToken'),
            amount=item.get('amount'),
            status=item.get('status', 'AUTHORIZED'),
            card_number_last4=item.get('cardNumberLast4'),
            created_date=item.get('createdDate'),
            modified_date=item.get('modifiedDate')
        )
    
    def __repr__(self):
        return f'<PaymentToken {self.payment_token}>'
