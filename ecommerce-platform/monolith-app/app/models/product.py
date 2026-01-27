"""
商品模型
管理商品信息和库存
"""
from datetime import datetime
from app.db import get_products_table
from boto3.dynamodb.conditions import Key


class Product:
    """商品模型"""
    
    def __init__(self, product_id=None, name=None, category=None, price=None,
                 package=None, tags=None, pictures=None,
                 created_date=None, modified_date=None):
        """初始化商品对象"""
        self.product_id = product_id
        self.name = name
        self.category = category
        self.price = price
        self.package_width = package.get('width') if package else None
        self.package_length = package.get('length') if package else None
        self.package_height = package.get('height') if package else None
        self.package_weight = package.get('weight') if package else None
        self.tags = tags or []
        self.pictures = pictures or []
        self.created_date = created_date or datetime.utcnow().isoformat()
        self.modified_date = modified_date or datetime.utcnow().isoformat()
    
    def get_package(self):
        """获取包装信息（字典格式）"""
        return {
            'width': self.package_width,
            'length': self.package_length,
            'height': self.package_height,
            'weight': self.package_weight
        }
    
    def set_package(self, package_dict):
        """设置包装信息"""
        self.package_width = package_dict.get('width')
        self.package_length = package_dict.get('length')
        self.package_height = package_dict.get('height')
        self.package_weight = package_dict.get('weight')
    
    def get_tags(self):
        """获取标签列表"""
        return self.tags
    
    def set_tags(self, tags_list):
        """设置标签"""
        self.tags = tags_list if tags_list else []
    
    def get_pictures(self):
        """获取图片URL列表"""
        return self.pictures
    
    def set_pictures(self, pictures_list):
        """设置图片URL"""
        self.pictures = pictures_list if pictures_list else []
    
    def to_dict(self, include_quantity=False, quantity=1):
        """转换为字典格式"""
        result = {
            'productId': self.product_id,
            'name': self.name,
            'category': self.category,
            'price': self.price,
            'package': self.get_package(),
            'tags': self.get_tags(),
            'pictures': self.get_pictures(),
            'createdDate': self.created_date,
            'modifiedDate': self.modified_date
        }
        if include_quantity:
            result['quantity'] = quantity
        return result
    
    def save(self):
        """保存商品到DynamoDB"""
        table = get_products_table()
        self.modified_date = datetime.utcnow().isoformat()
        
        item = {
            'productId': self.product_id,
            'name': self.name,
            'category': self.category,
            'price': self.price,
            'package': self.get_package(),
            'tags': self.tags,
            'pictures': self.pictures,
            'createdDate': self.created_date,
            'modifiedDate': self.modified_date
        }
        
        table.put_item(Item=item)
        return self
    
    @staticmethod
    def get_by_id(product_id):
        """通过商品ID获取商品"""
        table = get_products_table()
        
        response = table.get_item(Key={'productId': product_id})
        
        if 'Item' not in response:
            return None
        
        item = response['Item']
        return Product._from_dynamodb_item(item)
    
    @staticmethod
    def get_all(limit=100):
        """获取所有商品（支持分页）"""
        table = get_products_table()
        
        response = table.scan(Limit=limit)
        
        products = [Product._from_dynamodb_item(item) for item in response.get('Items', [])]
        return products
    
    @staticmethod
    def get_by_category(category, limit=100):
        """通过分类获取商品"""
        table = get_products_table()
        
        response = table.query(
            IndexName='category-index',
            KeyConditionExpression=Key('category').eq(category),
            Limit=limit
        )
        
        products = [Product._from_dynamodb_item(item) for item in response.get('Items', [])]
        return products
    
    @staticmethod
    def _from_dynamodb_item(item):
        """从DynamoDB项创建Product对象"""
        package = item.get('package', {})
        return Product(
            product_id=item.get('productId'),
            name=item.get('name'),
            category=item.get('category'),
            price=item.get('price'),
            package=package,
            tags=item.get('tags', []),
            pictures=item.get('pictures', []),
            created_date=item.get('createdDate'),
            modified_date=item.get('modifiedDate')
        )
    
    def __repr__(self):
        return f'<Product {self.name}>'
