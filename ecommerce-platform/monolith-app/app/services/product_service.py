"""
商品服务
处理商品相关的业务逻辑
"""
from typing import Dict, List, Optional
from app.models import Product


def get_products(limit: int = 100) -> List[Dict]:
    """
    获取商品列表
    
    参数:
        limit: 返回数量限制
    
    返回:
        商品列表
    """
    products = Product.get_all(limit=limit)
    return [product.to_dict() for product in products]


def get_product(product_id: str) -> Optional[Dict]:
    """
    获取单个商品
    
    参数:
        product_id: 商品ID
    
    返回:
        商品字典或None
    """
    product = Product.get_by_id(product_id)
    return product.to_dict() if product else None


def get_products_by_category(category: str, limit: int = 100) -> List[Dict]:
    """
    按类别获取商品
    
    参数:
        category: 商品类别
        limit: 返回数量限制
    
    返回:
        商品列表
    """
    products = Product.get_by_category(category, limit=limit)
    return [product.to_dict() for product in products]
