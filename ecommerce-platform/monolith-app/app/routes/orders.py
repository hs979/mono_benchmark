"""
订单路由
处理订单相关的API端点
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services import order_service
from app.services.delivery_pricing import calculate_delivery_price

bp = Blueprint('orders', __name__, url_prefix='/api/orders')


@bp.route('', methods=['POST'])
@jwt_required()
def create_order():
    """
    创建订单
    
    请求体:
        {
            "products": [...],
            "address": {...},
            "deliveryPrice": 1000,
            "paymentToken": "uuid"
        }
    
    返回:
        {
            "success": true,
            "message": "Order created",
            "order": {...}
        }
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'message': 'Missing request body'}), 400
    
    success, message, result = order_service.create_order(user_id, data)
    
    if success:
        return jsonify({
            'success': True,
            'message': message,
            'order': result
        }), 201
    else:
        return jsonify({
            'success': False,
            'message': message,
            **result
        }), 400


@bp.route('', methods=['GET'])
@jwt_required()
def get_orders():
    """
    获取当前用户的订单列表
    
    查询参数:
        limit: 返回数量限制（默认50）
    
    返回:
        {
            "orders": [...]
        }
    """
    user_id = get_jwt_identity()
    limit = request.args.get('limit', 50, type=int)
    
    orders = order_service.get_user_orders(user_id, limit=limit)
    
    return jsonify({'orders': orders}), 200


@bp.route('/<order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    """
    获取订单详情
    
    返回:
        {
            "order": {...}
        }
    """
    user_id = get_jwt_identity()
    order = order_service.get_order(order_id)
    
    if not order:
        return jsonify({'message': 'Order not found'}), 404
    
    # 验证订单所有权
    if order['userId'] != user_id:
        return jsonify({'message': 'Access denied'}), 403
    
    return jsonify({'order': order}), 200


@bp.route('/<order_id>', methods=['PUT'])
@jwt_required()
def update_order(order_id):
    """
    更新订单（仅限 NEW 状态）
    
    请求体:
        {
            "products": [...],  # 可选
            "deliveryPrice": 1000  # 可选
        }
    
    返回:
        {
            "success": true,
            "message": "Order updated",
            "order": {...}
        }
    """
    user_id = get_jwt_identity()
    
    # 先验证订单所有权
    order = order_service.get_order(order_id)
    if not order:
        return jsonify({'success': False, 'message': 'Order not found'}), 404
    
    if order['userId'] != user_id:
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'Missing request body'}), 400
    
    success, message, result = order_service.update_order(order_id, data)
    
    if success:
        return jsonify({
            'success': True,
            'message': message,
            'order': result
        }), 200
    else:
        return jsonify({
            'success': False,
            'message': message,
            **result
        }), 400


@bp.route('/<order_id>', methods=['DELETE'])
@jwt_required()
def delete_order(order_id):
    """
    删除订单（仅限 NEW 状态）
    
    返回:
        {
            "success": true,
            "message": "Order deleted"
        }
    """
    user_id = get_jwt_identity()
    
    # 先验证订单所有权
    order = order_service.get_order(order_id)
    if not order:
        return jsonify({'success': False, 'message': 'Order not found'}), 404
    
    if order['userId'] != user_id:
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    
    success, message = order_service.delete_order(order_id)
    
    if success:
        return jsonify({
            'success': True,
            'message': message
        }), 200
    else:
        return jsonify({
            'success': False,
            'message': message
        }), 400


@bp.route('/delivery-pricing', methods=['POST'])
@jwt_required()
def get_delivery_pricing():
    """
    计算配送价格
    
    请求体:
        {
            "products": [...],
            "address": {...}
        }
    
    返回:
        {
            "pricing": 1000
        }
    """
    data = request.get_json()
    
    if not data or 'products' not in data or 'address' not in data:
        return jsonify({'message': 'Missing products or address'}), 400
    
    pricing = calculate_delivery_price(data['products'], data['address'])
    
    return jsonify({'pricing': pricing}), 200

