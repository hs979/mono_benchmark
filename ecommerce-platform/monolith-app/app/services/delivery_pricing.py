"""
配送定价服务
计算配送费用
"""
import math
from decimal import Decimal
from typing import List, Dict


# 50*50*50 cm 立方体
BOX_VOLUME = 500 * 500 * 500
# 每箱12kg
BOX_WEIGHT = 12000

# 国家配送费用（单位：分）
COUNTRY_SHIPPING_FEES = {
    # 北欧国家
    "DK": 0, "FI": 0, "NO": 0, "SE": 0,
    
    # 其他欧盟国家
    "AT": 1000, "BE": 1000, "BG": 1000, "CY": 1000,
    "CZ": 1000, "DE": 1000, "EE": 1000, "ES": 1000,
    "FR": 1000, "GR": 1000, "HR": 1000, "HU": 1000,
    "IE": 1000, "IT": 1000, "LT": 1000, "LU": 1000,
    "LV": 1000, "MT": 1000, "NL": 1000, "PO": 1000,
    "PT": 1000, "RO": 1000, "SI": 1000, "SK": 1000,
    
    # 北美洲
    "CA": 1500, "US": 1500,
    
    # 世界其他地区
    "*": 2500
}


def count_boxes(packages: List[Dict]) -> int:
    """
    根据商品包装计算箱数
    
    参数:
        packages: 包装信息列表
    
    返回:
        需要的箱数
    """
    def to_int(val):
        """将 Decimal/str/int 转换为 int"""
        if isinstance(val, (Decimal, str)):
            return int(val)
        return val
    
    volume = sum([
        to_int(p.get('width', 0)) * to_int(p.get('length', 0)) * to_int(p.get('height', 0)) 
        for p in packages
    ])
    weight = sum([to_int(p.get('weight', 0)) for p in packages])
    
    return max(math.ceil(volume / BOX_VOLUME), math.ceil(weight / BOX_WEIGHT))


def get_shipping_cost(address: Dict) -> int:
    """
    获取每箱的配送费用
    
    参数:
        address: 地址信息
    
    返回:
        每箱配送费用（单位：分）
    """
    country = address.get('country', '')
    return COUNTRY_SHIPPING_FEES.get(country, COUNTRY_SHIPPING_FEES['*'])


def calculate_delivery_price(products: List[Dict], address: Dict) -> int:
    """
    计算配送价格
    
    参数:
        products: 商品列表
        address: 配送地址
    
    返回:
        配送价格（单位：分）
    """
    # 提取所有商品的包装信息
    packages = []
    for product in products:
        quantity = product.get('quantity', 1)
        # 确保 quantity 是整数
        if isinstance(quantity, (Decimal, str)):
            quantity = int(quantity)
        
        package = product.get('package', {})
        # 根据数量重复添加包装信息
        for _ in range(quantity):
            packages.append(package)
    
    # 计算箱数和配送费用
    boxes = count_boxes(packages)
    cost_per_box = get_shipping_cost(address)
    
    return boxes * cost_per_box

