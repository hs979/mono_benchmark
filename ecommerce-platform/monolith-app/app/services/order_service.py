"""
订单服务
处理订单相关的业务逻辑
"""
import uuid
from decimal import Decimal
from typing import Dict, List, Tuple, Any
from app.models import Order, Product, PackagingRequest
from app.services.delivery_pricing import calculate_delivery_price
from app.services import payment_service


def _normalize_value(value: Any) -> Any:
    """
    规范化值以便比较（处理 Decimal、int、str 等类型）
    
    参数:
        value: 待规范化的值
    
    返回:
        规范化后的值
    """
    # 处理 Decimal 类型
    if isinstance(value, Decimal):
        return int(value)
    
    # 处理字符串数字
    if isinstance(value, str) and value.isdigit():
        return int(value)
    
    # 处理字典（如 package）
    if isinstance(value, dict):
        return {k: _normalize_value(v) for k, v in value.items()}
    
    return value


def _values_equal(val1: Any, val2: Any) -> bool:
    """
    比较两个值是否相等（容忍类型差异）
    
    参数:
        val1: 第一个值
        val2: 第二个值
    
    返回:
        是否相等
    """
    normalized_val1 = _normalize_value(val1)
    normalized_val2 = _normalize_value(val2)
    
    return normalized_val1 == normalized_val2


def validate_products(products: List[Dict]) -> Tuple[bool, str, List[Dict]]:
    """
    验证商品信息
    
    参数:
        products: 用户提供的商品列表
    
    返回:
        (is_valid, error_message, invalid_products)
    """
    invalid_products = []
    reasons = []
    
    for user_product in products:
        product_id = user_product.get('productId')
        if not product_id:
            invalid_products.append(user_product)
            reasons.append("Missing productId")
            continue
        
        # 从数据库查询商品
        db_product = Product.get_by_id(product_id)
        if db_product is None:
            invalid_products.append(user_product)
            reasons.append(f"Product '{product_id}' not found")
            continue
        
        # 验证必需字段
        required_fields = ['name', 'package', 'price']
        for field in required_fields:
            if field not in user_product:
                invalid_products.append(user_product)
                reasons.append(f"Missing '{field}' in product '{product_id}'")
                break
            
            # 获取数据库中的值进行比较
            if field == 'package':
                db_value = db_product.get_package()
                user_value = user_product[field]
            else:
                db_value = getattr(db_product, field)
                user_value = user_product[field]
            
            # 使用智能比较（容忍 Decimal vs int/str 差异）
            if not _values_equal(user_value, db_value):
                invalid_products.append(user_product)
                reasons.append(
                    f"Invalid value for '{field}': want '{db_value}', "
                    f"got '{user_value}' in product '{product_id}'"
                )
                break
    
    if invalid_products:
        return False, ". ".join(reasons), invalid_products
    
    return True, "All products are valid", []


def validate_delivery_price(products: List[Dict], address: Dict, claimed_price: int) -> Tuple[bool, str]:
    """
    验证配送价格
    
    参数:
        products: 商品列表
        address: 配送地址
        claimed_price: 用户声称的配送价格
    
    返回:
        (is_valid, error_message)
    """
    actual_price = calculate_delivery_price(products, address)
    
    if actual_price != claimed_price:
        return False, f"Wrong delivery price: got {claimed_price}, expected {actual_price}"
    
    return True, "The delivery price is valid"


def validate_payment_token(payment_token: str, total: int) -> Tuple[bool, str]:
    """
    验证支付令牌
    
    参数:
        payment_token: 支付令牌
        total: 订单总额
    
    返回:
        (is_valid, error_message)
    """
    is_valid = payment_service.validate_payment(payment_token, total)
    
    if not is_valid:
        return False, "Invalid payment token or insufficient authorized amount"
    
    return True, "Payment token is valid"


def cleanup_products(products: List[Dict]) -> List[Dict]:
    """
    清理商品数据，只保留必要字段，并确保数值类型正确
    
    参数:
        products: 商品列表
    
    返回:
        清理后的商品列表
    """
    cleaned = []
    for product in products:
        # 确保 price 和 quantity 是整数
        price = product["price"]
        if isinstance(price, (str, Decimal)):
            price = int(price)
        
        quantity = product.get("quantity", 1)
        if isinstance(quantity, (str, Decimal)):
            quantity = int(quantity)
        
        cleaned.append({
            "productId": product["productId"],
            "name": product["name"],
            "package": product["package"],
            "price": price,
            "quantity": quantity
        })
    
    return cleaned


def create_order(user_id: str, order_data: Dict) -> Tuple[bool, str, Dict]:
    """
    创建订单
    
    参数:
        user_id: 用户ID
        order_data: 订单数据
    
    返回:
        (success, message, order_dict or errors)
    """
    # 提取订单信息
    products = order_data.get('products', [])
    address = order_data.get('address', {})
    delivery_price = order_data.get('deliveryPrice', 0)
    payment_token = order_data.get('paymentToken', '')
    
    # 确保 delivery_price 是整数
    if isinstance(delivery_price, (str, Decimal)):
        delivery_price = int(delivery_price)
    
    # 验证商品
    valid, message, invalid_products = validate_products(products)
    if not valid:
        return False, message, {'errors': [message], 'products': invalid_products}
    
    # 验证配送价格
    valid, message = validate_delivery_price(products, address, delivery_price)
    if not valid:
        return False, message, {'errors': [message]}
    
    # 清理商品数据
    cleaned_products = cleanup_products(products)
    
    # 计算总价
    total = sum([p["price"] * p.get("quantity", 1) for p in cleaned_products]) + delivery_price
    
    # 验证支付令牌
    valid, message = validate_payment_token(payment_token, total)
    if not valid:
        return False, message, {'errors': [message]}
    
    # 创建订单
    order = Order(
        order_id=str(uuid.uuid4()),
        user_id=user_id,
        status='NEW',
        address=address,
        products=cleaned_products,
        delivery_price=delivery_price,
        total=total,
        payment_token=payment_token
    )
    
    # 保存到数据库
    try:
        order.save()
        
        # 触发后续流程（仓库和配送）
        _trigger_warehouse_packaging(order)
        
        return True, "Order created", order.to_dict()
    except Exception as e:
        return False, f"Failed to create order: {str(e)}", {'errors': [str(e)]}


def _trigger_warehouse_packaging(order: Order):
    """
    触发仓库包装流程
    
    参数:
        order: 订单对象
    """
    # 创建包装请求
    products = [{
        'productId': product['productId'],
        'quantity': int(product.get('quantity', 1))
    } for product in order.get_products()]
    
    request = PackagingRequest(
        order_id=order.order_id,
        status='NEW',
        products=products
    )
    
    request.save()


def get_order(order_id: str) -> Dict:
    """
    获取订单信息
    
    参数:
        order_id: 订单ID
    
    返回:
        订单字典或None
    """
    order = Order.get_by_id(order_id)
    return order.to_dict() if order else None


def get_user_orders(user_id: str, limit: int = 50) -> List[Dict]:
    """
    获取用户的订单列表
    
    参数:
        user_id: 用户ID
        limit: 返回数量限制
    
    返回:
        订单列表
    """
    orders = Order.get_by_user_id(user_id, limit=limit)
    return [order.to_dict() for order in orders]


def update_order(order_id: str, order_data: Dict) -> Tuple[bool, str, Dict]:
    """
    更新订单信息（仅在 NEW 状态下允许）
    
    参数:
        order_id: 订单ID
        order_data: 新的订单数据
    
    返回:
        (success, message, order_dict or errors)
    """
    # 获取现有订单
    order = Order.get_by_id(order_id)
    if not order:
        return False, "Order not found", {'errors': ['Order not found']}
    
    # 只有 NEW 状态的订单可以修改
    if order.status != 'NEW':
        return False, f"Cannot modify order in status '{order.status}'", {
            'errors': [f"Cannot modify order in status '{order.status}'"]
        }
    
    # 记录旧值
    old_total = order.total
    old_products = order.get_products()
    
    # 更新商品（如果提供）
    if 'products' in order_data:
        products = order_data['products']
        
        # 验证商品
        valid, message, invalid_products = validate_products(products)
        if not valid:
            return False, message, {'errors': [message], 'products': invalid_products}
        
        # 清理商品数据
        cleaned_products = cleanup_products(products)
        order.set_products(cleaned_products)
    
    # 更新配送价格（如果提供）
    if 'deliveryPrice' in order_data:
        delivery_price = order_data['deliveryPrice']
        
        # 确保 delivery_price 是整数
        if isinstance(delivery_price, (str, Decimal)):
            delivery_price = int(delivery_price)
        
        # 验证配送价格
        valid, message = validate_delivery_price(order.get_products(), order.get_address(), delivery_price)
        if not valid:
            return False, message, {'errors': [message]}
        
        order.delivery_price = delivery_price
    
    # 重新计算总价
    new_total = sum([p["price"] * p.get("quantity", 1) for p in order.get_products()]) + order.delivery_price
    order.total = new_total
    
    try:
        # 保存订单
        order.save()
        
        # 如果商品变化，触发仓库更新
        if order.get_products() != old_products:
            _handle_order_products_changed(order_id, old_products, order.get_products())
        
        # 如果总价变化，触发支付更新
        if new_total != old_total:
            _handle_order_total_changed(order_id, order.payment_token, old_total, new_total)
        
        return True, "Order updated", order.to_dict()
    except Exception as e:
        return False, f"Failed to update order: {str(e)}", {'errors': [str(e)]}


def delete_order(order_id: str) -> Tuple[bool, str]:
    """
    删除订单（仅在 NEW 状态下允许）
    
    参数:
        order_id: 订单ID
    
    返回:
        (success, message)
    """
    # 获取订单
    order = Order.get_by_id(order_id)
    if not order:
        return False, "Order not found"
    
    # 只有 NEW 状态的订单可以删除
    if order.status != 'NEW':
        return False, f"Cannot delete order in status '{order.status}'"
    
    try:
        # 触发清理操作
        _handle_order_deleted(order_id, order.payment_token)
        
        # 从数据库删除订单（使用 DynamoDB delete_item）
        from app.db import get_orders_table
        table = get_orders_table()
        table.delete_item(Key={'orderId': order_id})
        
        return True, "Order deleted"
    except Exception as e:
        return False, f"Failed to delete order: {str(e)}"


def _handle_order_products_changed(order_id: str, old_products: List[Dict], new_products: List[Dict]):
    """
    处理订单商品变化（原本通过 OrderModified 事件）
    
    参数:
        order_id: 订单ID
        old_products: 旧商品列表
        new_products: 新商品列表
    """
    # 获取打包请求
    packaging_request = PackagingRequest.get_by_order_id(order_id)
    if not packaging_request:
        return
    
    # 只有 NEW 状态的打包请求可以修改
    if packaging_request.status != 'NEW':
        return
    
    # 更新打包请求中的商品
    new_packaging_products = [{
        'productId': product['productId'],
        'quantity': int(product.get('quantity', 1))
    } for product in new_products]
    
    packaging_request.products = new_packaging_products
    packaging_request.save()


def _handle_order_total_changed(order_id: str, payment_token: str, old_total: int, new_total: int):
    """
    处理订单总价变化（原本通过 OrderModified 事件）
    
    参数:
        order_id: 订单ID
        payment_token: 支付令牌
        old_total: 旧总价
        new_total: 新总价
    """
    # 更新支付令牌的授权金额（只能减少，不能增加）
    if new_total < old_total:
        success, message = payment_service.update_payment_amount(payment_token, new_total)
        if not success:
            # 记录错误但不阻止订单更新
            import logging
            logging.warning(f"Failed to update payment amount for order {order_id}: {message}")


def _handle_order_deleted(order_id: str, payment_token: str):
    """
    处理订单删除（原本通过 OrderDeleted 事件）
    
    参数:
        order_id: 订单ID
        payment_token: 支付令牌
    """
    # 删除打包请求
    packaging_request = PackagingRequest.get_by_order_id(order_id)
    if packaging_request and packaging_request.status == 'NEW':
        # 删除所有商品和元数据
        from app.db import get_warehouse_table
        table = get_warehouse_table()
        
        # 删除元数据
        table.delete_item(Key={'orderId': order_id, 'productId': '__metadata'})
        
        # 删除所有商品
        for product in packaging_request.products:
            table.delete_item(Key={'orderId': order_id, 'productId': product['productId']})
    
    # 取消支付授权
    if payment_token:
        payment_service.cancel_payment(payment_token)
