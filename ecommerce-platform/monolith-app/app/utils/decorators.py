"""
装饰器工具
用于权限验证等
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request


def admin_required(fn):
    """
    管理员权限装饰器
    确保用户是管理员才能访问
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get('role') != 'admin':
            return jsonify({'message': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


def warehouse_required(fn):
    """
    仓库人员权限装饰器
    确保用户是仓库人员或管理员才能访问
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get('role') not in ['admin', 'warehouse']:
            return jsonify({'message': 'Warehouse access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


def delivery_required(fn):
    """
    配送人员权限装饰器
    确保用户是配送人员或管理员才能访问
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get('role') not in ['admin', 'delivery']:
            return jsonify({'message': 'Delivery access required'}), 403
        return fn(*args, **kwargs)
    return wrapper

