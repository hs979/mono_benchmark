"""
仓库服务
处理包装请求和库存管理
"""
from typing import Dict, List, Optional
from app.models import PackagingRequest, Delivery, Order


def get_new_packaging_requests(limit: int = 50) -> List[str]:
    """
    获取新的包装请求ID列表
    
    参数:
        limit: 返回数量限制
    
    返回:
        订单ID列表
    """
    requests = PackagingRequest.get_new_requests(limit=limit)
    return [req.order_id for req in requests]


def get_packaging_request(order_id: str) -> Optional[Dict]:
    """
    获取包装请求详情
    
    参数:
        order_id: 订单ID
    
    返回:
        包装请求字典或None
    """
    request = PackagingRequest.get_by_order_id(order_id)
    return request.to_dict() if request else None


def start_packaging(order_id: str) -> tuple[bool, str]:
    """
    开始包装流程
    
    参数:
        order_id: 订单ID
    
    返回:
        (success, message)
    """
    request = PackagingRequest.get_by_order_id(order_id)
    
    if not request:
        return False, f"Packaging request for order {order_id} not found"
    
    if request.status != 'NEW':
        return False, f"Packaging request is in status '{request.status}', cannot start"
    
    try:
        request.update_status('IN_PROGRESS')
        return True, "Packaging started"
    except Exception as e:
        return False, f"Failed to start packaging: {str(e)}"


def update_packaging_product(order_id: str, product_id: str, quantity: int) -> tuple[bool, str]:
    """
    更新包装商品数量
    
    参数:
        order_id: 订单ID
        product_id: 商品ID
        quantity: 新数量
    
    返回:
        (success, message)
    """
    request = PackagingRequest.get_by_order_id(order_id)
    
    if not request:
        return False, f"Packaging request for order {order_id} not found"
    
    if request.status != 'IN_PROGRESS':
        return False, f"Packaging request is in status '{request.status}', cannot update"
    
    # 查找并更新商品
    found = False
    for product in request.products:
        if product['productId'] == product_id:
            product['quantity'] = int(quantity)
            found = True
            break
    
    if not found:
        return False, f"Product {product_id} not found in packaging request"
    
    try:
        request.save()
        return True, "Product quantity updated"
    except Exception as e:
        return False, f"Failed to update product: {str(e)}"


def complete_packaging(order_id: str) -> tuple[bool, str]:
    """
    完成包装流程
    
    参数:
        order_id: 订单ID
    
    返回:
        (success, message)
    """
    request = PackagingRequest.get_by_order_id(order_id)
    
    if not request:
        return False, f"Packaging request for order {order_id} not found"
    
    if request.status != 'IN_PROGRESS':
        return False, f"Packaging request is in status '{request.status}', cannot complete"
    
    try:
        request.update_status('COMPLETED')
        
        # 触发配送流程
        _trigger_delivery(order_id)
        
        return True, "Packaging completed"
    except Exception as e:
        return False, f"Failed to complete packaging: {str(e)}"


def fail_packaging(order_id: str, reason: str = "Packaging failed") -> tuple[bool, str]:
    """
    标记打包失败
    
    参数:
        order_id: 订单ID
        reason: 失败原因
    
    返回:
        (success, message)
    """
    request = PackagingRequest.get_by_order_id(order_id)
    
    if not request:
        return False, f"Packaging request for order {order_id} not found"
    
    try:
        request.update_status('FAILED')
        
        # 更新订单状态为打包失败
        order = Order.get_by_id(order_id)
        if order:
            order.update_status('PACKAGING_FAILED')
        
        # 触发退款流程
        _trigger_payment_cancellation(order_id, reason)
        
        return True, "Packaging marked as failed and refund initiated"
    except Exception as e:
        return False, f"Failed to mark packaging as failed: {str(e)}"


def _trigger_payment_cancellation(order_id: str, reason: str):
    """
    触发支付退款流程
    
    参数:
        order_id: 订单ID
        reason: 退款原因
    """
    from app.services import payment_service
    
    # 获取订单信息
    order = Order.get_by_id(order_id)
    if not order or not order.payment_token:
        return
    
    # 执行退款
    payment_service.cancel_payment(order.payment_token)


def _trigger_delivery(order_id: str):
    """
    触发配送流程
    
    参数:
        order_id: 订单ID
    """
    # 获取订单信息
    order = Order.get_by_id(order_id)
    if not order:
        return
    
    # 创建配送记录
    delivery = Delivery(
        order_id=order_id,
        status='NEW',
        address=order.get_address()
    )
    
    delivery.save()
