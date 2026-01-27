"""
配送路由
处理配送相关的API端点
"""
from flask import Blueprint, request, jsonify
from app.utils.decorators import delivery_required
from app.services import delivery_service

bp = Blueprint('delivery', __name__, url_prefix='/api/delivery')


@bp.route('/deliveries', methods=['GET'])
@delivery_required
def get_new_deliveries():
    """
    获取新的配送请求列表
    
    查询参数:
        limit: 返回数量限制（默认50）
    
    返回:
        {
            "deliveries": [...]
        }
    """
    limit = request.args.get('limit', 50, type=int)
    deliveries = delivery_service.get_new_deliveries(limit=limit)
    
    return jsonify({'deliveries': deliveries}), 200


@bp.route('/deliveries/<order_id>', methods=['GET'])
@delivery_required
def get_delivery(order_id):
    """
    获取配送详情
    
    返回:
        {
            "delivery": {...}
        }
    """
    delivery = delivery_service.get_delivery(order_id)
    
    if not delivery:
        return jsonify({'message': 'Delivery not found'}), 404
    
    return jsonify({'delivery': delivery}), 200


@bp.route('/deliveries/<order_id>/start', methods=['POST'])
@delivery_required
def start_delivery(order_id):
    """
    开始配送
    
    返回:
        {
            "success": true,
            "message": "Delivery started"
        }
    """
    success, message = delivery_service.start_delivery(order_id)
    
    return jsonify({'success': success, 'message': message}), 200 if success else 400


@bp.route('/deliveries/<order_id>/complete', methods=['POST'])
@delivery_required
def complete_delivery(order_id):
    """
    完成配送
    
    返回:
        {
            "success": true,
            "message": "Delivery completed"
        }
    """
    success, message = delivery_service.complete_delivery(order_id)
    
    return jsonify({'success': success, 'message': message}), 200 if success else 400


@bp.route('/deliveries/<order_id>/fail', methods=['POST'])
@delivery_required
def fail_delivery(order_id):
    """
    配送失败
    
    请求体:
        {
            "reason": "地址错误"  // 可选
        }
    
    返回:
        {
            "success": true,
            "message": "Delivery marked as failed and refund initiated"
        }
    """
    data = request.get_json() or {}
    reason = data.get('reason', 'Delivery failed')
    
    success, message = delivery_service.fail_delivery(order_id, reason)
    
    return jsonify({'success': success, 'message': message}), 200 if success else 400

