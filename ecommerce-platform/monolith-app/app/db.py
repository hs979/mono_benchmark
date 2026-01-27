"""
DynamoDB数据库连接模块
提供DynamoDB资源和表对象的访问
"""
import boto3
from flask import current_app


_dynamodb_resource = None
_dynamodb_client = None


def get_dynamodb_resource():
    """获取DynamoDB资源对象（用于高级操作）"""
    global _dynamodb_resource
    
    if _dynamodb_resource is None:
        kwargs = {
            'region_name': current_app.config['AWS_REGION']
        }
        
        # 如果设置了访问密钥，添加到配置
        if current_app.config.get('AWS_ACCESS_KEY_ID') and current_app.config.get('AWS_SECRET_ACCESS_KEY'):
            kwargs['aws_access_key_id'] = current_app.config['AWS_ACCESS_KEY_ID']
            kwargs['aws_secret_access_key'] = current_app.config['AWS_SECRET_ACCESS_KEY']
        
        _dynamodb_resource = boto3.resource('dynamodb', **kwargs)
    
    return _dynamodb_resource


def get_dynamodb_client():
    """获取DynamoDB客户端对象（用于低级操作）"""
    global _dynamodb_client
    
    if _dynamodb_client is None:
        kwargs = {
            'region_name': current_app.config['AWS_REGION']
        }
        
        if current_app.config.get('AWS_ACCESS_KEY_ID') and current_app.config.get('AWS_SECRET_ACCESS_KEY'):
            kwargs['aws_access_key_id'] = current_app.config['AWS_ACCESS_KEY_ID']
            kwargs['aws_secret_access_key'] = current_app.config['AWS_SECRET_ACCESS_KEY']
        
        _dynamodb_client = boto3.client('dynamodb', **kwargs)
    
    return _dynamodb_client


def get_table(table_config_key):
    """
    获取DynamoDB表对象
    
    参数:
        table_config_key: 配置中的表名键（如'TABLE_USERS_NAME'）
    
    返回:
        DynamoDB Table对象
    """
    dynamodb = get_dynamodb_resource()
    table_name = current_app.config[table_config_key]
    return dynamodb.Table(table_name)


def get_users_table():
    """获取Users表"""
    return get_table('TABLE_USERS_NAME')


def get_products_table():
    """获取Products表"""
    return get_table('TABLE_PRODUCTS_NAME')


def get_orders_table():
    """获取Orders表"""
    return get_table('TABLE_ORDERS_NAME')


def get_payment_table():
    """获取Payment表"""
    return get_table('TABLE_PAYMENT_NAME')


def get_delivery_table():
    """获取Delivery表"""
    return get_table('TABLE_DELIVERY_NAME')


def get_warehouse_table():
    """获取Warehouse表"""
    return get_table('TABLE_WAREHOUSE_NAME')


def get_payment_3p_table():
    """获取Payment-3P表"""
    return get_table('TABLE_PAYMENT_3P_NAME')

