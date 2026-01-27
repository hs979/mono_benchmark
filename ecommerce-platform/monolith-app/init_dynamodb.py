"""
DynamoDB初始化脚本
创建所有表并可选地插入示例数据
"""
import sys
import uuid
import boto3
import time
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash
from config import config


def get_dynamodb_client():
    """获取DynamoDB客户端"""
    conf = config['default']
    
    kwargs = {
        'region_name': conf.AWS_REGION
    }
    
    # 如果设置了访问密钥，添加到配置
    if conf.AWS_ACCESS_KEY_ID and conf.AWS_SECRET_ACCESS_KEY:
        kwargs['aws_access_key_id'] = conf.AWS_ACCESS_KEY_ID
        kwargs['aws_secret_access_key'] = conf.AWS_SECRET_ACCESS_KEY
    
    return boto3.client('dynamodb', **kwargs)


def wait_for_table_active(client, table_name, max_wait_seconds=60):
    """等待表状态变为ACTIVE"""
    print(f"  Waiting for table {table_name} to become ACTIVE...", end='', flush=True)
    start_time = time.time()
    
    while time.time() - start_time < max_wait_seconds:
        try:
            response = client.describe_table(TableName=table_name)
            status = response['Table']['TableStatus']
            
            if status == 'ACTIVE':
                print(" ✓")
                return True
            
            time.sleep(2)
            print('.', end='', flush=True)
        except client.exceptions.ResourceNotFoundException:
            # 表还不存在，继续等待
            time.sleep(2)
            print('.', end='', flush=True)
    
    print(" ✗ Timeout")
    return False


def create_users_table(client, table_name):
    """创建Users表"""
    try:
        client.create_table(
            TableName=table_name,
            KeySchema=[
                {'AttributeName': 'userId', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'userId', 'AttributeType': 'S'},
                {'AttributeName': 'email', 'AttributeType': 'S'}
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'email-index',
                    'KeySchema': [
                        {'AttributeName': 'email', 'KeyType': 'HASH'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                }
            ],
            BillingMode='PROVISIONED',
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )
        print(f"✓ Created table: {table_name}")
        return True  # 表刚创建，需要等待
    except client.exceptions.ResourceInUseException:
        print(f"  Table {table_name} already exists")
        return False  # 表已存在，不需要等待


def create_products_table(client, table_name):
    """创建Products表"""
    try:
        client.create_table(
            TableName=table_name,
            KeySchema=[
                {'AttributeName': 'productId', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'productId', 'AttributeType': 'S'},
                {'AttributeName': 'category', 'AttributeType': 'S'}
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'category-index',
                    'KeySchema': [
                        {'AttributeName': 'category', 'KeyType': 'HASH'},
                        {'AttributeName': 'productId', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                }
            ],
            BillingMode='PROVISIONED',
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )
        print(f"✓ Created table: {table_name}")
        return True  # 表刚创建，需要等待
    except client.exceptions.ResourceInUseException:
        print(f"  Table {table_name} already exists")
        return False  # 表已存在，不需要等待


def create_orders_table(client, table_name):
    """创建Orders表"""
    try:
        client.create_table(
            TableName=table_name,
            KeySchema=[
                {'AttributeName': 'orderId', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'orderId', 'AttributeType': 'S'},
                {'AttributeName': 'userId', 'AttributeType': 'S'},
                {'AttributeName': 'createdDate', 'AttributeType': 'S'}
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'user-index',
                    'KeySchema': [
                        {'AttributeName': 'userId', 'KeyType': 'HASH'},
                        {'AttributeName': 'createdDate', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                }
            ],
            BillingMode='PROVISIONED',
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )
        print(f"✓ Created table: {table_name}")
        return True  # 表刚创建，需要等待
    except client.exceptions.ResourceInUseException:
        print(f"  Table {table_name} already exists")
        return False  # 表已存在，不需要等待


def create_payment_table(client, table_name):
    """创建Payment表"""
    try:
        client.create_table(
            TableName=table_name,
            KeySchema=[
                {'AttributeName': 'orderId', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'orderId', 'AttributeType': 'S'}
            ],
            BillingMode='PROVISIONED',
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )
        print(f"✓ Created table: {table_name}")
        return True  # 表刚创建，需要等待
    except client.exceptions.ResourceInUseException:
        print(f"  Table {table_name} already exists")
        return False  # 表已存在，不需要等待


def create_delivery_table(client, table_name):
    """创建Delivery表"""
    try:
        client.create_table(
            TableName=table_name,
            KeySchema=[
                {'AttributeName': 'orderId', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'orderId', 'AttributeType': 'S'},
                {'AttributeName': 'isNew', 'AttributeType': 'S'}
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'orderId-new-index',
                    'KeySchema': [
                        {'AttributeName': 'orderId', 'KeyType': 'HASH'},
                        {'AttributeName': 'isNew', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                }
            ],
            BillingMode='PROVISIONED',
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )
        print(f"✓ Created table: {table_name}")
        return True  # 表刚创建，需要等待
    except client.exceptions.ResourceInUseException:
        print(f"  Table {table_name} already exists")
        return False  # 表已存在，不需要等待


def create_warehouse_table(client, table_name):
    """创建Warehouse表"""
    try:
        client.create_table(
            TableName=table_name,
            KeySchema=[
                {'AttributeName': 'orderId', 'KeyType': 'HASH'},
                {'AttributeName': 'productId', 'KeyType': 'RANGE'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'orderId', 'AttributeType': 'S'},
                {'AttributeName': 'productId', 'AttributeType': 'S'},
                {'AttributeName': 'newDate', 'AttributeType': 'S'}
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'product-index',
                    'KeySchema': [
                        {'AttributeName': 'productId', 'KeyType': 'HASH'},
                        {'AttributeName': 'orderId', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                },
                {
                    'IndexName': 'orderId-new-index',
                    'KeySchema': [
                        {'AttributeName': 'orderId', 'KeyType': 'HASH'},
                        {'AttributeName': 'newDate', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                }
            ],
            BillingMode='PROVISIONED',
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )
        print(f"✓ Created table: {table_name}")
        return True  # 表刚创建，需要等待
    except client.exceptions.ResourceInUseException:
        print(f"  Table {table_name} already exists")
        return False  # 表已存在，不需要等待


def create_payment_3p_table(client, table_name):
    """创建Payment-3P表"""
    try:
        client.create_table(
            TableName=table_name,
            KeySchema=[
                {'AttributeName': 'paymentToken', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'paymentToken', 'AttributeType': 'S'}
            ],
            BillingMode='PROVISIONED',
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )
        print(f"✓ Created table: {table_name}")
        return True  # 表刚创建，需要等待
    except client.exceptions.ResourceInUseException:
        print(f"  Table {table_name} already exists")
        return False  # 表已存在，不需要等待


def insert_sample_data():
    """插入示例数据"""
    conf = config['default']
    
    kwargs = {
        'region_name': conf.AWS_REGION
    }
    
    if conf.AWS_ACCESS_KEY_ID and conf.AWS_SECRET_ACCESS_KEY:
        kwargs['aws_access_key_id'] = conf.AWS_ACCESS_KEY_ID
        kwargs['aws_secret_access_key'] = conf.AWS_SECRET_ACCESS_KEY
    
    dynamodb = boto3.resource('dynamodb', **kwargs)
    
    # 插入示例用户
    print("\n  - Creating users...")
    users_table = dynamodb.Table(conf.TABLE_USERS_NAME)
    users_data = [
        {'email': 'admin@example.com', 'password': 'admin123', 'role': 'admin'},
        {'email': 'user@example.com', 'password': 'user123', 'role': 'user'},
        {'email': 'warehouse@example.com', 'password': 'warehouse123', 'role': 'warehouse'},
        {'email': 'delivery@example.com', 'password': 'delivery123', 'role': 'delivery'},
    ]
    
    for user_data in users_data:
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        users_table.put_item(
            Item={
                'userId': user_id,
                'email': user_data['email'],
                'passwordHash': generate_password_hash(user_data['password']),
                'role': user_data['role'],
                'createdDate': now,
                'modifiedDate': now
            }
        )
        print(f"    ✓ Created user: {user_data['email']}")
    
    # 插入示例商品
    print("  - Creating products...")
    products_table = dynamodb.Table(conf.TABLE_PRODUCTS_NAME)
    products_data = [
        {
            'name': 'Laptop Computer',
            'category': 'Electronics',
            'price': 99900,
            'package': {'width': 400, 'length': 300, 'height': 50, 'weight': 2000},
            'tags': ['electronics', 'computer', 'laptop'],
            'pictures': []
        },
        {
            'name': 'Wireless Mouse',
            'category': 'Electronics',
            'price': 2999,
            'package': {'width': 150, 'length': 100, 'height': 50, 'weight': 100},
            'tags': ['electronics', 'mouse', 'wireless'],
            'pictures': []
        },
        {
            'name': 'Office Chair',
            'category': 'Furniture',
            'price': 19900,
            'package': {'width': 600, 'length': 600, 'height': 1200, 'weight': 15000},
            'tags': ['furniture', 'chair', 'office'],
            'pictures': []
        },
        {
            'name': 'Coffee Mug',
            'category': 'Kitchen',
            'price': 1299,
            'package': {'width': 100, 'length': 100, 'height': 120, 'weight': 300},
            'tags': ['kitchen', 'mug', 'coffee'],
            'pictures': []
        },
        {
            'name': 'Running Shoes',
            'category': 'Sports',
            'price': 7999,
            'package': {'width': 300, 'length': 200, 'height': 150, 'weight': 500},
            'tags': ['sports', 'shoes', 'running'],
            'pictures': []
        },
    ]
    
    for product_data in products_data:
        product_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        products_table.put_item(
            Item={
                'productId': product_id,
                'name': product_data['name'],
                'category': product_data['category'],
                'price': product_data['price'],
                'package': product_data['package'],
                'tags': product_data['tags'],
                'pictures': product_data['pictures'],
                'createdDate': now,
                'modifiedDate': now
            }
        )
        print(f"    ✓ Created product: {product_data['name']}")


def init_database(with_sample_data=False):
    """
    初始化DynamoDB数据库
    
    参数:
        with_sample_data: 是否插入示例数据
    """
    conf = config['default']
    client = get_dynamodb_client()
    
    print("Creating DynamoDB tables...")
    
    # 创建所有表，记录哪些表需要等待
    tables_to_wait = []
    table_names = [
        (conf.TABLE_USERS_NAME, create_users_table),
        (conf.TABLE_PRODUCTS_NAME, create_products_table),
        (conf.TABLE_ORDERS_NAME, create_orders_table),
        (conf.TABLE_PAYMENT_NAME, create_payment_table),
        (conf.TABLE_DELIVERY_NAME, create_delivery_table),
        (conf.TABLE_WAREHOUSE_NAME, create_warehouse_table),
        (conf.TABLE_PAYMENT_3P_NAME, create_payment_3p_table),
    ]
    
    for table_name, create_func in table_names:
        needs_wait = create_func(client, table_name)
        if needs_wait:
            tables_to_wait.append(table_name)
    
    # 等待所有新创建的表变为 ACTIVE
    if tables_to_wait:
        print(f"\nWaiting for {len(tables_to_wait)} table(s) to become active...")
        for table_name in tables_to_wait:
            wait_for_table_active(client, table_name)
    
    print("\n✓ Database tables created successfully")
    
    if with_sample_data:
        print("\nInserting sample data...")
        insert_sample_data()
        print("✓ Sample data inserted successfully")
    
    print("\n✓ Database initialization completed!")


if __name__ == '__main__':
    # 检查命令行参数
    with_samples = '--with-samples' in sys.argv or '-s' in sys.argv
    
    if with_samples:
        print("Initializing DynamoDB WITH sample data...")
    else:
        print("Initializing DynamoDB WITHOUT sample data...")
        print("(Use --with-samples or -s flag to include sample data)")
    
    init_database(with_sample_data=with_samples)

