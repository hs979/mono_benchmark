"""
支付服务
处理支付验证和第三方支付系统交互
"""
import uuid
from decimal import Decimal
from typing import Dict, Tuple
from app.models import PaymentToken
from app.utils.validators import validate_card_number


def preauth_payment(card_number: str, amount: int) -> Tuple[bool, str, str]:
    """
    预授权支付（模拟第三方支付系统）
    
    参数:
        card_number: 信用卡号（16位）
        amount: 金额（单位：分）
    
    返回:
        (success, message, payment_token)
    """
    # 验证卡号
    if not validate_card_number(card_number):
        return False, "Invalid card number format", ""
    
    # 验证金额
    if amount < 0:
        return False, "Amount must be non-negative", ""
    
    # 生成支付令牌
    payment_token = str(uuid.uuid4())
    
    # 保存到数据库
    token = PaymentToken(
        payment_token=payment_token,
        amount=amount,
        status='AUTHORIZED',
        card_number_last4=card_number[-4:]
    )
    
    try:
        token.save()
        return True, "Payment pre-authorized", payment_token
    except Exception as e:
        return False, f"Failed to create payment token: {str(e)}", ""


def check_payment(payment_token: str, amount: int) -> Tuple[bool, str]:
    """
    检查支付令牌是否有效
    
    参数:
        payment_token: 支付令牌
        amount: 金额（单位：分）
    
    返回:
        (is_valid, message)
    """
    token = PaymentToken.get_by_token(payment_token)
    
    if not token:
        return False, "Payment token not found"
    
    if token.status != 'AUTHORIZED':
        return False, f"Payment token is in status '{token.status}'"
    
    # 确保金额比较时类型一致
    token_amount = int(token.amount) if isinstance(token.amount, (Decimal, str)) else token.amount
    amount = int(amount) if isinstance(amount, (Decimal, str)) else amount
    
    if token_amount < amount:
        return False, f"Insufficient authorized amount: {token_amount} < {amount}"
    
    return True, "Payment token is valid"


def validate_payment(payment_token: str, total: int) -> bool:
    """
    验证支付令牌（供订单服务调用）
    
    参数:
        payment_token: 支付令牌
        total: 订单总额
    
    返回:
        是否有效
    """
    valid, _ = check_payment(payment_token, total)
    return valid


def process_payment(payment_token: str) -> Tuple[bool, str]:
    """
    处理支付（扣款）
    
    参数:
        payment_token: 支付令牌
    
    返回:
        (success, message)
    """
    token = PaymentToken.get_by_token(payment_token)
    
    if not token:
        return False, "Payment token not found"
    
    if token.status != 'AUTHORIZED':
        return False, f"Payment token is in status '{token.status}', cannot process"
    
    token.status = 'PROCESSED'
    
    try:
        token.save()
        return True, "Payment processed"
    except Exception as e:
        return False, f"Failed to process payment: {str(e)}"


def cancel_payment(payment_token: str) -> Tuple[bool, str]:
    """
    取消支付（退款）
    
    参数:
        payment_token: 支付令牌
    
    返回:
        (success, message)
    """
    token = PaymentToken.get_by_token(payment_token)
    
    if not token:
        return False, "Payment token not found"
    
    if token.status == 'CANCELLED':
        return True, "Payment already cancelled"
    
    token.status = 'CANCELLED'
    
    try:
        token.save()
        return True, "Payment cancelled"
    except Exception as e:
        return False, f"Failed to cancel payment: {str(e)}"


def update_payment_amount(payment_token: str, new_amount: int) -> Tuple[bool, str]:
    """
    更新支付金额（只能减少）
    
    参数:
        payment_token: 支付令牌
        new_amount: 新金额
    
    返回:
        (success, message)
    """
    token = PaymentToken.get_by_token(payment_token)
    
    if not token:
        return False, "Payment token not found"
    
    if token.status != 'AUTHORIZED':
        return False, f"Payment token is in status '{token.status}', cannot update"
    
    # 确保金额比较时类型一致
    token_amount = int(token.amount) if isinstance(token.amount, (Decimal, str)) else token.amount
    new_amount = int(new_amount) if isinstance(new_amount, (Decimal, str)) else new_amount
    
    if new_amount > token_amount:
        return False, f"New amount {new_amount} exceeds authorized amount {token_amount}"
    
    token.amount = new_amount
    
    try:
        token.save()
        return True, "Payment amount updated"
    except Exception as e:
        return False, f"Failed to update payment amount: {str(e)}"
