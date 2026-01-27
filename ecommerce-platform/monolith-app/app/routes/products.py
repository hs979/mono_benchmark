"""
商品路由
处理商品相关的API端点
"""
from flask import Blueprint, request, jsonify
from app.services import product_service

bp = Blueprint('products', __name__, url_prefix='/api/products')


@bp.route('', methods=['GET'])
def get_products():
    """
    获取商品列表
    
    查询参数:
        limit: 返回数量限制（默认100）
    
    返回:
        {
            "products": [...]
        }
    """
    limit = request.args.get('limit', 100, type=int)
    products = product_service.get_products(limit=limit)
    
    return jsonify({'products': products}), 200


@bp.route('/<product_id>', methods=['GET'])
def get_product(product_id):
    """
    获取单个商品
    
    返回:
        {
            "product": {...}
        }
    """
    product = product_service.get_product(product_id)
    
    if not product:
        return jsonify({'message': 'Product not found'}), 404
    
    return jsonify({'product': product}), 200


@bp.route('/category/<category>', methods=['GET'])
def get_products_by_category(category):
    """
    按类别获取商品
    
    查询参数:
        limit: 返回数量限制（默认100）
    
    返回:
        {
            "products": [...]
        }
    """
    limit = request.args.get('limit', 100, type=int)
    products = product_service.get_products_by_category(category, limit=limit)
    
    return jsonify({'products': products}), 200

