"""
电商平台单体应用 - 主应用文件

主要功能:
- 产品管理和验证
- 订单创建和查询
- 支付处理（第三方支付模拟）
- 配送价格计算
- 仓库包装管理
- 配送管理
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime

from database import init_db, get_db
from services import (
    ProductService,
    OrderService,
    PaymentService,
    Payment3PService,
    DeliveryPricingService,
    WarehouseService,
    DeliveryService
)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 创建Flask应用
app = Flask(__name__)
app.config['SECRET_KEY'] = 'ecommerce-secret-key-change-in-production'
CORS(app)

# 注册数据库关闭函数
from database import close_db
app.teardown_appcontext(close_db)

# 初始化数据库
with app.app_context():
    init_db()

# 初始化服务
product_service = ProductService()
order_service = OrderService()
payment_service = PaymentService()
payment_3p_service = Payment3PService()
delivery_pricing_service = DeliveryPricingService()
warehouse_service = WarehouseService()
delivery_service = DeliveryService()


# ============================================================
# 产品API端点
# ============================================================

@app.route('/products/validate', methods=['POST'])
def validate_products():
    """
    验证产品列表
    
    请求体:
    {
        "products": [
            {
                "productId": "uuid",
                "name": "产品名称",
                "price": 1000,
                "package": {"width": 100, "length": 100, "height": 100, "weight": 500},
                "quantity": 1
            }
        ]
    }
    
    响应:
    {
        "message": "验证结果消息",
        "products": []  // 无效的产品列表（如果有）
    }
    """
    try:
        data = request.get_json()
        if not data or 'products' not in data:
            return jsonify({"message": "Missing 'products' in body"}), 400
        
        invalid_products, reason = product_service.validate_products(data['products'])
        
        if len(invalid_products) > 0:
            return jsonify({
                "message": reason,
                "products": invalid_products
            }), 200
        
        return jsonify({"message": "All products are valid"}), 200
    
    except Exception as e:
        logger.error(f"Error validating products: {str(e)}")
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


@app.route('/products', methods=['GET'])
def get_products():
    """
    获取所有产品列表
    
    响应:
    {
        "products": [产品列表]
    }
    """
    try:
        products = product_service.get_all_products()
        return jsonify({"products": products}), 200
    except Exception as e:
        logger.error(f"Error getting products: {str(e)}")
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


@app.route('/products/<product_id>', methods=['GET'])
def get_product(product_id):
    """
    获取单个产品信息
    
    响应:
    {
        "product": {产品详情}
    }
    """
    try:
        product = product_service.get_product(product_id)
        if product is None:
            return jsonify({"message": "Product not found"}), 404
        return jsonify({"product": product}), 200
    except Exception as e:
        logger.error(f"Error getting product: {str(e)}")
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


# ============================================================
# 第三方支付API端点 (Payment-3p)
# ============================================================

@app.route('/payment-3p/preauth', methods=['POST'])
def payment_preauth():
    """
    创建支付预授权
    
    请求体:
    {
        "cardNumber": "1234567890123456",
        "amount": 12345
    }
    
    响应:
    {
        "paymentToken": "uuid"
    }
    """
    try:
        data = request.get_json()
        
        # 验证必需字段
        if not data or 'cardNumber' not in data:
            return jsonify({"message": "Missing 'cardNumber' in request body."}), 400
        if 'amount' not in data:
            return jsonify({"message": "Missing 'amount' in request body."}), 400
        
        # 验证字段类型和值
        if not isinstance(data['cardNumber'], str):
            return jsonify({"message": "'cardNumber' is not a string."}), 400
        if len(data['cardNumber']) != 16:
            return jsonify({"message": "'cardNumber' is not 16 characters long."}), 400
        if not isinstance(data['amount'], int):
            return jsonify({"message": "'amount' is not a number."}), 400
        if data['amount'] < 0:
            return jsonify({"message": "'amount' should be a positive number."}), 400
        
        payment_token = payment_3p_service.create_preauth(data['cardNumber'], data['amount'])
        
        if payment_token is None:
            return jsonify({"message": "Failed to generate a token"}), 500
        
        return jsonify({"paymentToken": payment_token}), 200
    
    except Exception as e:
        logger.error(f"Error creating preauth: {str(e)}")
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


@app.route('/payment-3p/check', methods=['POST'])
def payment_check():
    """
    检查支付token是否有效
    
    请求体:
    {
        "paymentToken": "uuid",
        "amount": 12345
    }
    
    响应:
    {
        "ok": true/false
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'paymentToken' not in data:
            return jsonify({"message": "Missing 'paymentToken' in request body."}), 400
        if 'amount' not in data:
            return jsonify({"message": "Missing 'amount' in request body."}), 400
        
        if not isinstance(data['paymentToken'], str):
            return jsonify({"message": "'paymentToken' is not a string."}), 400
        if not isinstance(data['amount'], int):
            return jsonify({"message": "'amount' is not a number."}), 400
        if data['amount'] < 0:
            return jsonify({"message": "'amount' should be a positive number."}), 400
        
        result = payment_3p_service.check_token(data['paymentToken'], data['amount'])
        
        if result is None:
            return jsonify({"message": "Internal error"}), 500
        
        return jsonify({"ok": result}), 200
    
    except Exception as e:
        logger.error(f"Error checking payment: {str(e)}")
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


@app.route('/payment-3p/processPayment', methods=['POST'])
def payment_process():
    """
    处理支付
    
    请求体:
    {
        "paymentToken": "uuid"
    }
    
    响应:
    {
        "ok": true/false
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'paymentToken' not in data:
            return jsonify({"message": "Missing 'paymentToken' in request body."}), 400
        
        if not isinstance(data['paymentToken'], str):
            return jsonify({"message": "'paymentToken' is not a string."}), 400
        
        result = payment_3p_service.process_payment(data['paymentToken'])
        
        if result is None:
            return jsonify({"message": "Internal error"}), 500
        
        return jsonify({"ok": result}), 200
    
    except Exception as e:
        logger.error(f"Error processing payment: {str(e)}")
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


@app.route('/payment-3p/cancelPayment', methods=['POST'])
def payment_cancel():
    """
    取消支付
    
    请求体:
    {
        "paymentToken": "uuid"
    }
    
    响应:
    {
        "ok": true/false
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'paymentToken' not in data:
            return jsonify({"message": "Missing 'paymentToken' in request body."}), 400
        
        if not isinstance(data['paymentToken'], str):
            return jsonify({"message": "'paymentToken' is not a string."}), 400
        
        result = payment_3p_service.cancel_payment(data['paymentToken'])
        
        if result is None:
            return jsonify({"message": "Internal error"}), 500
        
        return jsonify({"ok": result}), 200
    
    except Exception as e:
        logger.error(f"Error cancelling payment: {str(e)}")
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


@app.route('/payment-3p/updateAmount', methods=['POST'])
def payment_update_amount():
    """
    更新支付金额
    
    请求体:
    {
        "paymentToken": "uuid",
        "amount": 12345
    }
    
    响应:
    {
        "ok": true/false
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'paymentToken' not in data:
            return jsonify({"message": "Missing 'paymentToken' in request body."}), 400
        if 'amount' not in data:
            return jsonify({"message": "Missing 'amount' in request body."}), 400
        
        if not isinstance(data['paymentToken'], str):
            return jsonify({"message": "'paymentToken' is not a string."}), 400
        if not isinstance(data['amount'], int):
            return jsonify({"message": "'amount' is not a number."}), 400
        if data['amount'] < 0:
            return jsonify({"message": "'amount' should be a positive number."}), 400
        
        result = payment_3p_service.update_amount(data['paymentToken'], data['amount'])
        
        if result is None:
            return jsonify({"message": "Internal error"}), 500
        
        return jsonify({"ok": result}), 200
    
    except Exception as e:
        logger.error(f"Error updating payment amount: {str(e)}")
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


# ============================================================
# 支付服务API端点
# ============================================================

@app.route('/payment/validate', methods=['POST'])
def validate_payment():
    """
    验证支付token
    
    请求体:
    {
        "paymentToken": "uuid",
        "total": 12345
    }
    
    响应:
    {
        "ok": true/false
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'paymentToken' not in data:
            return jsonify({"message": "Missing 'paymentToken' in request body."}), 400
        if 'total' not in data:
            return jsonify({"message": "Missing 'total' in request body."}), 400
        
        valid = payment_service.validate_payment_token(data['paymentToken'], data['total'])
        return jsonify({"ok": valid}), 200
    
    except Exception as e:
        logger.error(f"Error validating payment: {str(e)}")
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


# ============================================================
# 配送定价API端点
# ============================================================

@app.route('/delivery-pricing/pricing', methods=['POST'])
def get_delivery_pricing():
    """
    计算配送价格
    
    请求体:
    {
        "products": [产品列表],
        "address": {地址信息}
    }
    
    响应:
    {
        "pricing": 1000
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'products' not in data:
            return jsonify({"message": "Missing 'products' in body"}), 400
        if 'address' not in data:
            return jsonify({"message": "Missing 'address' in body"}), 400
        
        pricing = delivery_pricing_service.get_pricing(data['products'], data['address'])
        return jsonify({"pricing": pricing}), 200
    
    except Exception as e:
        logger.error(f"Error calculating delivery pricing: {str(e)}")
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


# ============================================================
# 订单API端点
# ============================================================

@app.route('/orders', methods=['POST'])
def create_order():
    """
    创建订单
    
    请求体:
    {
        "userId": "uuid",
        "products": [产品列表],
        "address": {地址信息},
        "deliveryPrice": 1000,
        "paymentToken": "uuid"
    }
    
    响应:
    {
        "success": true/false,
        "message": "消息",
        "errors": ["错误列表"],
        "order": {订单详情}
    }
    """
    try:
        data = request.get_json()
        
        # 基本验证
        if not data or 'userId' not in data:
            return jsonify({
                "success": False,
                "message": "Missing 'userId' in request",
                "errors": ["Missing 'userId' in request"]
            }), 400
        
        if 'products' not in data or 'address' not in data or 'deliveryPrice' not in data or 'paymentToken' not in data:
            return jsonify({
                "success": False,
                "message": "Missing required fields",
                "errors": ["Missing required fields in request"]
            }), 400
        
        # 创建订单
        result = order_service.create_order(
            data['userId'],
            data['products'],
            data['address'],
            data['deliveryPrice'],
            data['paymentToken']
        )
        
        if result['success']:
            # 订单创建成功后，创建仓库包装请求
            warehouse_service.on_order_created(result['order'])
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    
    except Exception as e:
        logger.error(f"Error creating order: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Internal server error: {str(e)}",
            "errors": [str(e)]
        }), 500


@app.route('/orders/<order_id>', methods=['GET'])
def get_order(order_id):
    """
    获取订单详情
    
    响应:
    {
        "order": {订单详情}
    }
    """
    try:
        order = order_service.get_order(order_id)
        
        if order is None:
            return jsonify({"message": "Order not found"}), 404
        
        return jsonify({"order": order}), 200
    
    except Exception as e:
        logger.error(f"Error getting order: {str(e)}")
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


@app.route('/orders', methods=['GET'])
def get_orders():
    """
    获取所有订单
    
    响应:
    {
        "orders": [订单列表]
    }
    """
    try:
        orders = order_service.get_all_orders()
        return jsonify({"orders": orders}), 200
    except Exception as e:
        logger.error(f"Error getting orders: {str(e)}")
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


# ============================================================
# 仓库API端点
# ============================================================

@app.route('/warehouse/packaging-requests', methods=['GET'])
def get_packaging_requests():
    """
    获取所有包装请求
    
    响应:
    {
        "packagingRequests": [包装请求列表]
    }
    """
    try:
        requests = warehouse_service.get_all_packaging_requests()
        return jsonify({"packagingRequests": requests}), 200
    except Exception as e:
        logger.error(f"Error getting packaging requests: {str(e)}")
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


@app.route('/warehouse/packaging-requests/<order_id>', methods=['GET'])
def get_packaging_request(order_id):
    """
    获取特定订单的包装请求
    
    响应:
    {
        "packagingRequest": {包装请求详情}
    }
    """
    try:
        packaging_request = warehouse_service.get_packaging_request(order_id)
        
        if packaging_request is None:
            return jsonify({"message": "Packaging request not found"}), 404
        
        return jsonify({"packagingRequest": packaging_request}), 200
    
    except Exception as e:
        logger.error(f"Error getting packaging request: {str(e)}")
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


@app.route('/warehouse/packaging-requests/<order_id>/complete', methods=['POST'])
def complete_packaging(order_id):
    """
    完成包装
    
    响应:
    {
        "success": true/false,
        "message": "消息"
    }
    """
    try:
        success, message = warehouse_service.complete_packaging(order_id)
        
        if success:
            # 包装完成后，创建配送请求
            order = order_service.get_order(order_id)
            if order:
                delivery_service.on_package_created(order_id, order['address'])
            return jsonify({"success": True, "message": message}), 200
        else:
            return jsonify({"success": False, "message": message}), 400
    
    except Exception as e:
        logger.error(f"Error completing packaging: {str(e)}")
        return jsonify({"success": False, "message": f"Internal server error: {str(e)}"}), 500


# ============================================================
# 配送API端点
# ============================================================

@app.route('/delivery/deliveries', methods=['GET'])
def get_deliveries():
    """
    获取所有配送请求
    
    响应:
    {
        "deliveries": [配送列表]
    }
    """
    try:
        deliveries = delivery_service.get_all_deliveries()
        return jsonify({"deliveries": deliveries}), 200
    except Exception as e:
        logger.error(f"Error getting deliveries: {str(e)}")
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


@app.route('/delivery/deliveries/<order_id>', methods=['GET'])
def get_delivery(order_id):
    """
    获取特定订单的配送信息
    
    响应:
    {
        "delivery": {配送详情}
    }
    """
    try:
        delivery = delivery_service.get_delivery(order_id)
        
        if delivery is None:
            return jsonify({"message": "Delivery not found"}), 404
        
        return jsonify({"delivery": delivery}), 200
    
    except Exception as e:
        logger.error(f"Error getting delivery: {str(e)}")
        return jsonify({"message": f"Internal server error: {str(e)}"}), 500


@app.route('/delivery/deliveries/<order_id>/start', methods=['POST'])
def start_delivery(order_id):
    """
    开始配送
    
    响应:
    {
        "success": true/false,
        "message": "消息"
    }
    """
    try:
        success, message = delivery_service.start_delivery(order_id)
        return jsonify({"success": success, "message": message}), 200 if success else 400
    except Exception as e:
        logger.error(f"Error starting delivery: {str(e)}")
        return jsonify({"success": False, "message": f"Internal server error: {str(e)}"}), 500


@app.route('/delivery/deliveries/<order_id>/complete', methods=['POST'])
def complete_delivery(order_id):
    """
    完成配送
    
    响应:
    {
        "success": true/false,
        "message": "消息"
    }
    """
    try:
        success, message = delivery_service.complete_delivery(order_id)
        return jsonify({"success": success, "message": message}), 200 if success else 400
    except Exception as e:
        logger.error(f"Error completing delivery: {str(e)}")
        return jsonify({"success": False, "message": f"Internal server error: {str(e)}"}), 500


# ============================================================
# 根路由和错误处理
# ============================================================

@app.route('/', methods=['GET'])
def index():
    """
    根路由 - API信息
    """
    return jsonify({
        "name": "电商平台单体应用",
        "version": "1.0.0",
        "description": "电商平台单体应用",
        "endpoints": {
            "products": {
                "GET /products": "获取所有产品",
                "GET /products/<id>": "获取单个产品",
                "POST /products/validate": "验证产品列表"
            },
            "payment_3p": {
                "POST /payment-3p/preauth": "创建支付预授权",
                "POST /payment-3p/check": "检查支付token",
                "POST /payment-3p/processPayment": "处理支付",
                "POST /payment-3p/cancelPayment": "取消支付",
                "POST /payment-3p/updateAmount": "更新支付金额"
            },
            "payment": {
                "POST /payment/validate": "验证支付token"
            },
            "delivery_pricing": {
                "POST /delivery-pricing/pricing": "计算配送价格"
            },
            "orders": {
                "POST /orders": "创建订单",
                "GET /orders": "获取所有订单",
                "GET /orders/<id>": "获取单个订单"
            },
            "warehouse": {
                "GET /warehouse/packaging-requests": "获取所有包装请求",
                "GET /warehouse/packaging-requests/<id>": "获取单个包装请求",
                "POST /warehouse/packaging-requests/<id>/complete": "完成包装"
            },
            "delivery": {
                "GET /delivery/deliveries": "获取所有配送",
                "GET /delivery/deliveries/<id>": "获取单个配送",
                "POST /delivery/deliveries/<id>/start": "开始配送",
                "POST /delivery/deliveries/<id>/complete": "完成配送"
            }
        }
    }), 200


@app.errorhandler(404)
def not_found(error):
    """404错误处理"""
    return jsonify({"message": "Resource not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    """500错误处理"""
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({"message": "Internal server error"}), 500


if __name__ == '__main__':
    # 运行应用
    # 生产环境请使用 gunicorn 或其他 WSGI 服务器
    app.run(host='0.0.0.0', port=5000, debug=True)

