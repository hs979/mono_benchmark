"""
仓库路由
处理包装请求相关的API端点
"""
from flask import Blueprint, request, jsonify
from app.utils.decorators import warehouse_required
from app.services import warehouse_service

bp = Blueprint('warehouse', __name__, url_prefix='/api/warehouse')


@bp.route('/packaging-requests', methods=['GET'])
@warehouse_required
def get_new_packaging_requests():
    """
    获取新的包装请求ID列表
    
    查询参数:
        limit: 返回数量限制（默认50）
    
    返回:
        {
            "packagingRequestIds": [...]
        }
    """
    limit = request.args.get('limit', 50, type=int)
    request_ids = warehouse_service.get_new_packaging_requests(limit=limit)
    
    return jsonify({'packagingRequestIds': request_ids}), 200


@bp.route('/packaging-requests/<order_id>', methods=['GET'])
@warehouse_required
def get_packaging_request(order_id):
    """
    获取包装请求详情
    
    返回:
        {
            "packagingRequest": {...}
        }
    """
    request_data = warehouse_service.get_packaging_request(order_id)
    
    if not request_data:
        return jsonify({'message': 'Packaging request not found'}), 404
    
    return jsonify({'packagingRequest': request_data}), 200


@bp.route('/packaging-requests/<order_id>/start', methods=['POST'])
@warehouse_required
def start_packaging(order_id):
    """
    开始包装
    
    返回:
        {
            "success": true,
            "message": "Packaging started"
        }
    """
    success, message = warehouse_service.start_packaging(order_id)
    
    return jsonify({'success': success, 'message': message}), 200 if success else 400


@bp.route('/packaging-requests/<order_id>/products', methods=['PUT'])
@warehouse_required
def update_packaging_product(order_id):
    """
    更新包装商品数量
    
    请求体:
        {
            "productId": "uuid",
            "quantity": 5
        }
    
    返回:
        {
            "success": true,
            "message": "Product quantity updated"
        }
    """
    data = request.get_json()
    
    if not data or 'productId' not in data or 'quantity' not in data:
        return jsonify({'success': False, 'message': 'Missing productId or quantity'}), 400
    
    success, message = warehouse_service.update_packaging_product(
        order_id,
        data['productId'],
        data['quantity']
    )
    
    return jsonify({'success': success, 'message': message}), 200 if success else 400


@bp.route('/packaging-requests/<order_id>/complete', methods=['POST'])
@warehouse_required
def complete_packaging(order_id):
    """
    完成包装
    
    返回:
        {
            "success": true,
            "message": "Packaging completed"
        }
    """
    success, message = warehouse_service.complete_packaging(order_id)
    
    return jsonify({'success': success, 'message': message}), 200 if success else 400


@bp.route('/packaging-requests/<order_id>/fail', methods=['POST'])
@warehouse_required
def fail_packaging(order_id):
    """
    标记打包失败
    
    请求体:
        {
            "reason": "库存不足"  // 可选
        }
    
    返回:
        {
            "success": true,
            "message": "Packaging marked as failed and refund initiated"
        }
    """
    data = request.get_json() or {}
    reason = data.get('reason', 'Packaging failed')
    
    success, message = warehouse_service.fail_packaging(order_id, reason)
    
    return jsonify({'success': success, 'message': message}), 200 if success else 400
