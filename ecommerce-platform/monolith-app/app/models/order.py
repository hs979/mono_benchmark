"""
订单模型
管理订单信息和状态
"""
from datetime import datetime
from app.db import get_orders_table
from boto3.dynamodb.conditions import Key


class Order:
    """订单模型"""
    
    def __init__(self, order_id=None, user_id=None, status='NEW',
                 address=None, products=None, delivery_price=0, total=0,
                 payment_token=None, created_date=None, modified_date=None):
        """初始化订单对象"""
        self.order_id = order_id
        self.user_id = user_id
        self.status = status
        
        # 地址信息
        if address:
            self.address_name = address.get('name')
            self.address_company_name = address.get('companyName')
            self.address_street = address.get('streetAddress')
            self.address_post_code = address.get('postCode')
            self.address_city = address.get('city')
            self.address_state = address.get('state')
            self.address_country = address.get('country')
            self.address_phone = address.get('phoneNumber')
        else:
            self.address_name = None
            self.address_company_name = None
            self.address_street = None
            self.address_post_code = None
            self.address_city = None
            self.address_state = None
            self.address_country = None
            self.address_phone = None
        
        self.products = products or []
        self.delivery_price = delivery_price
        self.total = total
        self.payment_token = payment_token
        self.created_date = created_date or datetime.utcnow().isoformat()
        self.modified_date = modified_date or datetime.utcnow().isoformat()
    
    def get_address(self):
        """获取地址信息（字典格式）"""
        return {
            'name': self.address_name,
            'companyName': self.address_company_name,
            'streetAddress': self.address_street,
            'postCode': self.address_post_code,
            'city': self.address_city,
            'state': self.address_state,
            'country': self.address_country,
            'phoneNumber': self.address_phone
        }
    
    def set_address(self, address_dict):
        """设置地址信息"""
        self.address_name = address_dict.get('name')
        self.address_company_name = address_dict.get('companyName')
        self.address_street = address_dict.get('streetAddress')
        self.address_post_code = address_dict.get('postCode')
        self.address_city = address_dict.get('city')
        self.address_state = address_dict.get('state')
        self.address_country = address_dict.get('country')
        self.address_phone = address_dict.get('phoneNumber')
    
    def get_products(self):
        """获取商品列表"""
        return self.products
    
    def set_products(self, products_list):
        """设置商品列表"""
        self.products = products_list
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            'orderId': self.order_id,
            'userId': self.user_id,
            'status': self.status,
            'address': self.get_address(),
            'products': self.get_products(),
            'deliveryPrice': self.delivery_price,
            'total': self.total,
            'paymentToken': self.payment_token,
            'createdDate': self.created_date,
            'modifiedDate': self.modified_date
        }
    
    def save(self):
        """保存订单到DynamoDB"""
        table = get_orders_table()
        self.modified_date = datetime.utcnow().isoformat()
        
        item = {
            'orderId': self.order_id,
            'userId': self.user_id,
            'status': self.status,
            'address': self.get_address(),
            'products': self.products,
            'deliveryPrice': self.delivery_price,
            'total': self.total,
            'createdDate': self.created_date,
            'modifiedDate': self.modified_date
        }
        
        if self.payment_token:
            item['paymentToken'] = self.payment_token
        
        table.put_item(Item=item)
        return self
    
    @staticmethod
    def get_by_id(order_id):
        """通过订单ID获取订单"""
        table = get_orders_table()
        
        response = table.get_item(Key={'orderId': order_id})
        
        if 'Item' not in response:
            return None
        
        item = response['Item']
        return Order._from_dynamodb_item(item)
    
    @staticmethod
    def get_by_user_id(user_id, limit=100):
        """通过用户ID获取订单列表"""
        table = get_orders_table()
        
        response = table.query(
            IndexName='user-index',
            KeyConditionExpression=Key('userId').eq(user_id),
            Limit=limit,
            ScanIndexForward=False  # 降序排序（最新的在前）
        )
        
        orders = [Order._from_dynamodb_item(item) for item in response.get('Items', [])]
        return orders
    
    def update_status(self, new_status):
        """更新订单状态"""
        self.status = new_status
        self.save()
    
    @staticmethod
    def _from_dynamodb_item(item):
        """从DynamoDB项创建Order对象"""
        address = item.get('address', {})
        return Order(
            order_id=item.get('orderId'),
            user_id=item.get('userId'),
            status=item.get('status', 'NEW'),
            address=address,
            products=item.get('products', []),
            delivery_price=item.get('deliveryPrice', 0),
            total=item.get('total', 0),
            payment_token=item.get('paymentToken'),
            created_date=item.get('createdDate'),
            modified_date=item.get('modifiedDate')
        )
    
    def __repr__(self):
        return f'<Order {self.order_id}>'
