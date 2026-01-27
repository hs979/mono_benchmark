"""
仓库模型
管理包装请求和库存
"""
from datetime import datetime
from app.db import get_warehouse_table
from boto3.dynamodb.conditions import Key, Attr


class PackagingRequest:
    """包装请求模型"""
    
    def __init__(self, order_id=None, status='NEW', products=None,
                 created_date=None, modified_date=None):
        """初始化包装请求对象"""
        self.order_id = order_id
        self.status = status
        self.products = products or []
        self.created_date = created_date or datetime.utcnow().isoformat()
        self.modified_date = modified_date or datetime.utcnow().isoformat()
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            'orderId': self.order_id,
            'status': self.status,
            'products': self.products,
            'createdDate': self.created_date,
            'modifiedDate': self.modified_date
        }
    
    def save(self):
        """保存包装请求到DynamoDB"""
        table = get_warehouse_table()
        self.modified_date = datetime.utcnow().isoformat()
        
        # 在Warehouse表中，使用复合主键（orderId, productId）
        # 为了保持请求级别的元数据，使用特殊的productId: "__metadata"
        metadata_item = {
            'orderId': self.order_id,
            'productId': '__metadata',
            'status': self.status,
            'createdDate': self.created_date,
            'modifiedDate': self.modified_date
        }
        
        # 如果状态是NEW，添加newDate字段用于GSI
        if self.status == 'NEW':
            metadata_item['newDate'] = self.created_date
        
        table.put_item(Item=metadata_item)
        
        # 保存每个商品
        for product in self.products:
            product_item = {
                'orderId': self.order_id,
                'productId': product['productId'],
                'quantity': int(product.get('quantity', 1)),
                'createdDate': self.created_date,
                'modifiedDate': self.modified_date
            }
            
            if self.status == 'NEW':
                product_item['newDate'] = self.created_date
            
            table.put_item(Item=product_item)
        
        return self
    
    @staticmethod
    def get_by_order_id(order_id):
        """通过订单ID获取包装请求"""
        table = get_warehouse_table()
        
        # 查询该订单的所有项
        response = table.query(
            KeyConditionExpression=Key('orderId').eq(order_id)
        )
        
        items = response.get('Items', [])
        if not items:
            return None
        
        # 分离元数据和商品
        metadata = None
        products = []
        
        for item in items:
            if item.get('productId') == '__metadata':
                metadata = item
            else:
                products.append({
                    'productId': item.get('productId'),
                    'quantity': int(item.get('quantity', 1))
                })
        
        if not metadata:
            return None
        
        return PackagingRequest(
            order_id=order_id,
            status=metadata.get('status', 'NEW'),
            products=products,
            created_date=metadata.get('createdDate'),
            modified_date=metadata.get('modifiedDate')
        )
    
    @staticmethod
    def get_new_requests(limit=100):
        """获取所有新包装请求"""
        table = get_warehouse_table()
        
        # 扫描带有newDate字段的元数据项
        response = table.scan(
            FilterExpression=Attr('productId').eq('__metadata') & Attr('status').eq('NEW'),
            Limit=limit
        )
        
        order_ids = [item['orderId'] for item in response.get('Items', [])]
        
        # 对每个订单ID，获取完整的包装请求
        requests = []
        for order_id in order_ids:
            request = PackagingRequest.get_by_order_id(order_id)
            if request:
                requests.append(request)
        
        return requests
    
    def update_status(self, new_status):
        """更新包装请求状态"""
        table = get_warehouse_table()
        self.status = new_status
        self.modified_date = datetime.utcnow().isoformat()
        
        update_expression = "SET #status = :status, modifiedDate = :modified_date"
        expression_attribute_names = {'#status': 'status'}
        expression_attribute_values = {
            ':status': new_status,
            ':modified_date': self.modified_date
        }
        
        # 如果状态变更，移除newDate字段
        if new_status != 'NEW':
            update_expression += " REMOVE newDate"
        
        # 更新元数据项
        table.update_item(
            Key={'orderId': self.order_id, 'productId': '__metadata'},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )
        
        # 更新所有产品项的newDate（如果存在的话）
        if new_status != 'NEW':
            for product in self.products:
                try:
                    table.update_item(
                        Key={'orderId': self.order_id, 'productId': product['productId']},
                        UpdateExpression="REMOVE newDate",
                        ConditionExpression=Attr('newDate').exists()
                    )
                except Exception:
                    # 如果 newDate 不存在，忽略错误
                    pass
    
    def __repr__(self):
        return f'<PackagingRequest {self.order_id}>'


# 保持向后兼容的别名
class PackagingProduct:
    """包装请求中的商品（用于兼容性）"""
    
    def __init__(self, product_id, quantity=1):
        self.product_id = product_id
        self.quantity = quantity
    
    def to_dict(self):
        return {
            'productId': self.product_id,
            'quantity': self.quantity
        }
    
    def __repr__(self):
        return f'<PackagingProduct {self.product_id}>'
