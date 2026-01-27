"""
验证器工具
用于验证输入数据的有效性
"""
import re


def validate_email(email):
    """
    验证电子邮件格式
    
    参数:
        email: 电子邮件地址
    
    返回:
        布尔值，表示是否有效
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_product(product):
    """
    验证商品数据
    
    参数:
        product: 商品字典
    
    返回:
        (is_valid, error_message)
    """
    required_fields = ['productId', 'name', 'package', 'price']
    
    for field in required_fields:
        if field not in product:
            return False, f"Missing required field: {field}"
    
    # 验证价格
    if not isinstance(product['price'], int) or product['price'] < 0:
        return False, "Price must be a non-negative integer"
    
    # 验证包装信息
    package = product['package']
    if not isinstance(package, dict):
        return False, "Package must be an object"
    
    return True, None


def validate_address(address):
    """
    验证地址数据
    
    参数:
        address: 地址字典
    
    返回:
        (is_valid, error_message)
    """
    required_fields = ['name', 'streetAddress', 'city', 'country', 'phoneNumber']
    
    for field in required_fields:
        if field not in address:
            return False, f"Missing required field: {field}"
    
    # 验证国家代码（两个字母）
    if not re.match(r'^[A-Za-z]{2}$', address['country']):
        return False, "Country code must be 2 letters"
    
    return True, None


def validate_payment_token(payment_token):
    """
    验证支付令牌格式
    
    参数:
        payment_token: 支付令牌
    
    返回:
        布尔值，表示是否有效
    """
    # UUID格式验证
    pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return re.match(pattern, payment_token.lower()) is not None


def validate_card_number(card_number):
    """
    验证信用卡号格式
    
    参数:
        card_number: 信用卡号
    
    返回:
        布尔值，表示是否有效
    """
    # 简单验证：16位数字
    return re.match(r'^\d{16}$', card_number) is not None

