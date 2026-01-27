"""
配送服务
处理配送相关的业务逻辑
"""
from typing import Dict, List, Optional
from app.models import Delivery, Order


def get_new_deliveries(limit: int = 50) -> List[Dict]:
    """
    获取新的配送请求列表
    
    参数:
        limit: 返回数量限制
    
    返回:
        配送列表
    """
    deliveries = Delivery.get_new_deliveries(limit=limit)
    return [delivery.to_dict() for delivery in deliveries]


def get_delivery(order_id: str) -> Optional[Dict]:
    """
    获取配送详情
    
    参数:
        order_id: 订单ID
    
    返回:
        配送字典或None
    """
    delivery = Delivery.get_by_order_id(order_id)
    return delivery.to_dict() if delivery else None


def start_delivery(order_id: str) -> tuple[bool, str]:
    """
    开始配送
    
    参数:
        order_id: 订单ID
    
    返回:
        (success, message)
    """
    delivery = Delivery.get_by_order_id(order_id)
    
    if not delivery:
        return False, f"Delivery for order {order_id} not found"
    
    if delivery.status != 'NEW':
        return False, f"Delivery is in status '{delivery.status}', cannot start"
    
    try:
        delivery.update_status('IN_PROGRESS')
        
        # 更新订单状态
        order = Order.get_by_id(order_id)
        if order:
            order.update_status('IN_TRANSIT')
        
        return True, "Delivery started"
    except Exception as e:
        return False, f"Failed to start delivery: {str(e)}"


def complete_delivery(order_id: str) -> tuple[bool, str]:
    """
    完成配送
    
    参数:
        order_id: 订单ID
    
    返回:
        (success, message)
    """
    delivery = Delivery.get_by_order_id(order_id)
    
    if not delivery:
        return False, f"Delivery for order {order_id} not found"
    
    if delivery.status != 'IN_PROGRESS':
        return False, f"Delivery is in status '{delivery.status}', cannot complete"
    
    try:
        delivery.update_status('COMPLETED')
        
        # 更新订单状态
        order = Order.get_by_id(order_id)
        if order:
            order.update_status('COMPLETED')
        
        # 触发最终扣款
        _trigger_payment_processing(order_id)
        
        return True, "Delivery completed and payment processed"
    except Exception as e:
        return False, f"Failed to complete delivery: {str(e)}"


def _trigger_payment_processing(order_id: str):
    """
    触发支付扣款流程
    
    参数:
        order_id: 订单ID
    """
    from app.services import payment_service
    
    # 获取订单信息
    order = Order.get_by_id(order_id)
    if not order or not order.payment_token:
        return
    
    # 执行扣款
    payment_service.process_payment(order.payment_token)


def fail_delivery(order_id: str, reason: str = "Delivery failed") -> tuple[bool, str]:
    """
    配送失败
    
    参数:
        order_id: 订单ID
        reason: 失败原因
    
    返回:
        (success, message)
    """
    delivery = Delivery.get_by_order_id(order_id)
    
    if not delivery:
        return False, f"Delivery for order {order_id} not found"
    
    try:
        delivery.update_status('FAILED')
        
        # 更新订单状态
        order = Order.get_by_id(order_id)
        if order:
            order.update_status('DELIVERY_FAILED')
        
        # 触发退款流程
        _trigger_payment_cancellation(order_id, reason)
        
        return True, "Delivery marked as failed and refund initiated"
    except Exception as e:
        return False, f"Failed to mark delivery as failed: {str(e)}"


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
