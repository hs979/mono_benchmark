"""
认证路由
处理用户注册、登录、JWT令牌管理
"""
import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from app.models import User
from app.utils.validators import validate_email

bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@bp.route('/register', methods=['POST'])
def register():
    """
    用户注册
    
    请求体:
        {
            "email": "user@example.com",
            "password": "password123",
            "role": "user"  # 可选，默认为user
        }
    
    返回:
        {
            "success": true,
            "message": "User registered successfully",
            "userId": "uuid"
        }
    """
    data = request.get_json()
    
    # 验证必需字段
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({'success': False, 'message': 'Missing email or password'}), 400
    
    email = data['email']
    password = data['password']
    role = data.get('role', 'user')
    
    # 验证邮箱格式
    if not validate_email(email):
        return jsonify({'success': False, 'message': 'Invalid email format'}), 400
    
    # 检查用户是否已存在
    if User.get_by_email(email):
        return jsonify({'success': False, 'message': 'Email already registered'}), 400
    
    # 创建新用户
    user = User(
        user_id=str(uuid.uuid4()),
        email=email,
        role=role
    )
    user.set_password(password)
    
    try:
        user.save()
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'userId': user.user_id
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': f'Registration failed: {str(e)}'}), 500


@bp.route('/login', methods=['POST'])
def login():
    """
    用户登录
    
    请求体:
        {
            "email": "user@example.com",
            "password": "password123"
        }
    
    返回:
        {
            "success": true,
            "accessToken": "jwt_token",
            "refreshToken": "refresh_token",
            "user": {...}
        }
    """
    data = request.get_json()
    
    # 验证必需字段
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({'success': False, 'message': 'Missing email or password'}), 400
    
    email = data['email']
    password = data['password']
    
    # 查找用户
    user = User.get_by_email(email)
    
    # 验证密码
    if not user or not user.check_password(password):
        return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
    
    # 创建JWT令牌
    additional_claims = {
        'role': user.role,
        'email': user.email
    }
    access_token = create_access_token(identity=user.user_id, additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=user.user_id, additional_claims=additional_claims)
    
    return jsonify({
        'success': True,
        'accessToken': access_token,
        'refreshToken': refresh_token,
        'user': user.to_dict()
    }), 200


@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    刷新访问令牌
    
    返回:
        {
            "accessToken": "new_jwt_token"
        }
    """
    identity = get_jwt_identity()
    user = User.get_by_id(identity)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    additional_claims = {
        'role': user.role,
        'email': user.email
    }
    access_token = create_access_token(identity=identity, additional_claims=additional_claims)
    
    return jsonify({'accessToken': access_token}), 200


@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    获取当前登录用户信息
    
    返回:
        {
            "user": {...}
        }
    """
    user_id = get_jwt_identity()
    user = User.get_by_id(user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()}), 200
