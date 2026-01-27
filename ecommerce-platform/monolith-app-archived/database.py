"""
数据库模块
使用SQLite作为数据库存储，替代原AWS Serverless应用中的DynamoDB
"""

import sqlite3
import json
import logging
from flask import g
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

DATABASE = 'ecommerce.db'


def get_db():
    """
    获取数据库连接
    使用Flask的g对象来存储数据库连接，确保在请求上下文中复用连接
    """
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db


def close_db(e=None):
    """关闭数据库连接"""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


def init_db():
    """
    初始化数据库表结构
    创建所有需要的表
    """
    db = sqlite3.connect(DATABASE)
    cursor = db.cursor()
    
    try:
        # 产品表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                productId TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT,
                price INTEGER NOT NULL,
                package TEXT NOT NULL,
                tags TEXT,
                pictures TEXT,
                createdDate TEXT NOT NULL,
                modifiedDate TEXT NOT NULL
            )
        ''')
        
        # 订单表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                orderId TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                status TEXT NOT NULL,
                products TEXT NOT NULL,
                address TEXT NOT NULL,
                deliveryPrice INTEGER NOT NULL,
                paymentToken TEXT NOT NULL,
                total INTEGER NOT NULL,
                createdDate TEXT NOT NULL,
                modifiedDate TEXT NOT NULL
            )
        ''')
        
        # 支付token表（第三方支付）
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payment_tokens (
                paymentToken TEXT PRIMARY KEY,
                amount INTEGER NOT NULL,
                createdDate TEXT NOT NULL
            )
        ''')
        
        # 仓库包装请求表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS warehouse_packaging (
                orderId TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                products TEXT NOT NULL,
                modifiedDate TEXT NOT NULL,
                newDate TEXT
            )
        ''')
        
        # 配送表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS deliveries (
                orderId TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                address TEXT NOT NULL,
                createdDate TEXT NOT NULL,
                modifiedDate TEXT NOT NULL
            )
        ''')
        
        db.commit()
        logger.info("Database tables initialized successfully")
        
        # 插入示例产品数据
        _insert_sample_products(db)
        
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


def _insert_sample_products(db):
    """
    插入示例产品数据
    """
    cursor = db.cursor()
    
    # 检查是否已有产品数据
    cursor.execute('SELECT COUNT(*) FROM products')
    count = cursor.fetchone()[0]
    
    if count > 0:
        logger.info("Products already exist in database, skipping sample data insertion")
        return
    
    from datetime import datetime
    import uuid
    
    sample_products = [
        {
            'productId': str(uuid.uuid4()),
            'name': '笔记本电脑',
            'category': '电子产品',
            'price': 5999,
            'package': json.dumps({'width': 400, 'length': 300, 'height': 50, 'weight': 2000}),
            'tags': json.dumps(['电脑', '办公', '学习']),
            'pictures': json.dumps([]),
            'createdDate': datetime.now().isoformat(),
            'modifiedDate': datetime.now().isoformat()
        },
        {
            'productId': str(uuid.uuid4()),
            'name': '无线鼠标',
            'category': '电子产品',
            'price': 99,
            'package': json.dumps({'width': 120, 'length': 80, 'height': 40, 'weight': 100}),
            'tags': json.dumps(['鼠标', '办公', '外设']),
            'pictures': json.dumps([]),
            'createdDate': datetime.now().isoformat(),
            'modifiedDate': datetime.now().isoformat()
        },
        {
            'productId': str(uuid.uuid4()),
            'name': '机械键盘',
            'category': '电子产品',
            'price': 399,
            'package': json.dumps({'width': 450, 'length': 150, 'height': 40, 'weight': 800}),
            'tags': json.dumps(['键盘', '办公', '游戏']),
            'pictures': json.dumps([]),
            'createdDate': datetime.now().isoformat(),
            'modifiedDate': datetime.now().isoformat()
        },
        {
            'productId': str(uuid.uuid4()),
            'name': '显示器',
            'category': '电子产品',
            'price': 1299,
            'package': json.dumps({'width': 600, 'length': 400, 'height': 100, 'weight': 4000}),
            'tags': json.dumps(['显示器', '办公', '娱乐']),
            'pictures': json.dumps([]),
            'createdDate': datetime.now().isoformat(),
            'modifiedDate': datetime.now().isoformat()
        },
        {
            'productId': str(uuid.uuid4()),
            'name': 'USB数据线',
            'category': '配件',
            'price': 19,
            'package': json.dumps({'width': 100, 'length': 100, 'height': 20, 'weight': 50}),
            'tags': json.dumps(['数据线', '配件']),
            'pictures': json.dumps([]),
            'createdDate': datetime.now().isoformat(),
            'modifiedDate': datetime.now().isoformat()
        }
    ]
    
    try:
        for product in sample_products:
            cursor.execute('''
                INSERT INTO products 
                (productId, name, category, price, package, tags, pictures, createdDate, modifiedDate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                product['productId'],
                product['name'],
                product['category'],
                product['price'],
                product['package'],
                product['tags'],
                product['pictures'],
                product['createdDate'],
                product['modifiedDate']
            ))
        
        db.commit()
        logger.info(f"Inserted {len(sample_products)} sample products")
    
    except Exception as e:
        logger.error(f"Error inserting sample products: {str(e)}")
        db.rollback()


class Database:
    """
    数据库操作类
    提供统一的数据库访问接口
    """
    
    def __init__(self):
        self.connection = None
    
    def connect(self):
        """建立数据库连接"""
        if self.connection is None:
            self.connection = sqlite3.connect(DATABASE)
            self.connection.row_factory = sqlite3.Row
        return self.connection
    
    def close(self):
        """关闭数据库连接"""
        if self.connection:
            self.connection.close()
            self.connection = None
    
    def execute(self, query: str, params: tuple = None) -> sqlite3.Cursor:
        """
        执行SQL查询
        
        Args:
            query: SQL查询语句
            params: 查询参数
        
        Returns:
            数据库游标对象
        """
        conn = self.connect()
        cursor = conn.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        conn.commit()
        return cursor
    
    def fetchone(self, query: str, params: tuple = None) -> Optional[Dict[str, Any]]:
        """
        查询单条记录
        
        Args:
            query: SQL查询语句
            params: 查询参数
        
        Returns:
            字典形式的查询结果，如果没有结果则返回None
        """
        conn = self.connect()
        cursor = conn.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None
    
    def fetchall(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """
        查询多条记录
        
        Args:
            query: SQL查询语句
            params: 查询参数
        
        Returns:
            字典列表形式的查询结果
        """
        conn = self.connect()
        cursor = conn.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

