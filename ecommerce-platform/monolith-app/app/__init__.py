"""
Flask应用工厂
用于创建和配置Flask应用实例
"""
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import config

# 初始化JWT扩展
jwt = JWTManager()


def create_app(config_name='default'):
    """
    应用工厂函数
    
    参数:
        config_name: 配置名称 ('development', 'production', 'testing')
    
    返回:
        Flask应用实例
    """
    app = Flask(__name__)
    
    # 加载配置
    app.config.from_object(config[config_name])
    
    # 初始化扩展
    jwt.init_app(app)
    CORS(app, origins=app.config['CORS_ORIGINS'])
    
    # 注册蓝图（路由）
    from app.routes import auth, products, orders, warehouse, delivery, payment, payment_3p
    
    app.register_blueprint(auth.bp)
    app.register_blueprint(products.bp)
    app.register_blueprint(orders.bp)
    app.register_blueprint(warehouse.bp)
    app.register_blueprint(delivery.bp)
    app.register_blueprint(payment.bp)
    app.register_blueprint(payment_3p.bp)
    
    # 注册错误处理器
    register_error_handlers(app)
    
    return app


def register_error_handlers(app):
    """注册全局错误处理器"""
    
    @app.errorhandler(404)
    def not_found(error):
        """处理404错误"""
        return {'message': 'Resource not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """处理500错误"""
        return {'message': 'Internal server error'}, 500
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        """处理未捕获的异常"""
        app.logger.error(f'Unhandled exception: {str(error)}')
        return {'message': 'An unexpected error occurred'}, 500
