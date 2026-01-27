"""
配置文件
包含应用程序的所有配置参数
"""
import os
from datetime import timedelta


class Config:
    """应用配置基类"""
    
    # Flask配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # AWS配置
    AWS_REGION = os.environ.get('AWS_REGION') or 'us-east-1'
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    
    # DynamoDB表名配置
    TABLE_USERS_NAME = os.environ.get('TABLE_USERS_NAME') or 'ecommerce-users'
    TABLE_PRODUCTS_NAME = os.environ.get('TABLE_PRODUCTS_NAME') or 'ecommerce-products'
    TABLE_ORDERS_NAME = os.environ.get('TABLE_ORDERS_NAME') or 'ecommerce-orders'
    TABLE_PAYMENT_NAME = os.environ.get('TABLE_PAYMENT_NAME') or 'ecommerce-payment'
    TABLE_DELIVERY_NAME = os.environ.get('TABLE_DELIVERY_NAME') or 'ecommerce-delivery'
    TABLE_WAREHOUSE_NAME = os.environ.get('TABLE_WAREHOUSE_NAME') or 'ecommerce-warehouse'
    TABLE_PAYMENT_3P_NAME = os.environ.get('TABLE_PAYMENT_3P_NAME') or 'ecommerce-payment-3p'
    
    # JWT配置
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # 应用配置
    DEBUG = False
    TESTING = False
    
    # 日志配置
    LOG_LEVEL = os.environ.get('LOG_LEVEL') or 'INFO'
    
    # CORS配置
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS') or '*'


class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True


class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    # 生产环境应该从环境变量读取敏感信息
    

class TestingConfig(Config):
    """测试环境配置"""
    TESTING = True


# 配置字典
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
