"""
Authentication Service
JWT-based authentication for user management and authorization
"""
import jwt
import datetime
import secrets
import os
import hashlib
from typing import Optional, Dict
from functools import wraps
from flask import request, jsonify
import boto3
from boto3.dynamodb.conditions import Attr


class AuthService:
    """Service for JWT authentication and authorization"""
    
    # Secret key for JWT encoding/decoding
    # In production, this should be in environment variables
    SECRET_KEY = os.environ.get('JWT_SECRET_KEY', secrets.token_urlsafe(32))
    ALGORITHM = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES = 60
    
    # DynamoDB setup
    _dynamodb = None
    _users_table = None
    _users_table_name = None
    
    @staticmethod
    def _init_dynamodb():
        """Initialize DynamoDB connection"""
        if AuthService._dynamodb is None:
            aws_region = os.environ.get('AWS_REGION', 'us-east-1')
            AuthService._dynamodb = boto3.resource('dynamodb', region_name=aws_region)
            
            stage = os.environ.get('STAGE', 'dev')
            AuthService._users_table_name = os.environ.get('USERS_TABLE_NAME', f'Airline-Users-{stage}')
            AuthService._users_table = AuthService._dynamodb.Table(AuthService._users_table_name)
    
    @staticmethod
    def _hash_password(password: str) -> str:
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def _init_default_users():
        """Initialize some default users for testing"""
        AuthService._init_dynamodb()
        
        try:
            # Check if users already exist
            response = AuthService._users_table.scan(Limit=1)
            if response.get('Items'):
                # Users already exist, skip initialization
                return
            
            # Regular user
            AuthService.register_user('user@example.com', 'password123', 'user123')
            # Admin user
            AuthService.register_user('admin@example.com', 'admin123', 'admin123')
            AuthService.add_to_admin_group('admin123')
        except Exception as e:
            print(f"Warning: Could not initialize default users: {str(e)}")
    
    @staticmethod
    def register_user(email: str, password: str, user_id: Optional[str] = None) -> dict:
        """
        Register a new user
        
        Args:
            email: User email
            password: User password
            user_id: Optional custom user ID, otherwise generated
            
        Returns:
            User information
            
        Raises:
            ValueError: If user already exists
        """
        AuthService._init_dynamodb()
        
        # Check if user already exists
        try:
            response = AuthService._users_table.scan(
                FilterExpression=Attr('email').eq(email)
            )
            if response.get('Items'):
                raise ValueError(f"User with email {email} already exists")
        except Exception as e:
            if "already exists" in str(e):
                raise
        
        if user_id is None:
            user_id = secrets.token_urlsafe(16)
        
        user = {
            'sub': user_id,  # Subject (unique user identifier)
            'email': email,
            'password_hash': AuthService._hash_password(password),
            'groups': [],
            'created_at': datetime.datetime.utcnow().isoformat()
        }
        
        try:
            AuthService._users_table.put_item(
                Item=user,
                ConditionExpression='attribute_not_exists(#sub)',
                ExpressionAttributeNames={'#sub': 'sub'}
            )
        except AuthService._dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
            raise ValueError(f"User with ID {user_id} already exists")
        except Exception as e:
            raise ValueError(f"Failed to register user: {str(e)}")
        
        return {
            'sub': user['sub'],
            'email': user['email'],
            'message': 'User registered successfully'
        }
    
    @staticmethod
    def authenticate_user(email: str, password: str) -> Optional[dict]:
        """
        Authenticate user credentials
        
        Args:
            email: User email
            password: User password
            
        Returns:
            User info if valid, None otherwise
        """
        AuthService._init_dynamodb()
        
        try:
            # Find user by email
            response = AuthService._users_table.scan(
                FilterExpression=Attr('email').eq(email)
            )
            
            items = response.get('Items', [])
            if not items:
                return None
            
            user = items[0]
            
            # Verify password
            password_hash = AuthService._hash_password(password)
            if user.get('password_hash') == password_hash:
                return user
            
            return None
        except Exception as e:
            print(f"Error authenticating user: {str(e)}")
            return None
    
    @staticmethod
    def create_access_token(user: dict) -> str:
        """
        Create JWT access token
        
        Args:
            user: User information
            
        Returns:
            JWT token string
        """
        expire = datetime.datetime.utcnow() + datetime.timedelta(
            minutes=AuthService.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        
        # Include user claims
        payload = {
            'sub': user['sub'],  # Subject (user ID)
            'email': user['email'],
            'groups': user.get('groups', []),  # User groups
            'exp': expire,
            'iat': datetime.datetime.utcnow(),
            'token_use': 'id'
        }
        
        token = jwt.encode(payload, AuthService.SECRET_KEY, algorithm=AuthService.ALGORITHM)
        return token
    
    @staticmethod
    def decode_token(token: str) -> Optional[dict]:
        """
        Decode and validate JWT token
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token payload or None if invalid
        """
        try:
            payload = jwt.decode(
                token, 
                AuthService.SECRET_KEY, 
                algorithms=[AuthService.ALGORITHM]
            )
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def get_user_from_token(token: str) -> Optional[dict]:
        """
        Get user information from token
        
        Args:
            token: JWT token string
            
        Returns:
            User info or None
        """
        AuthService._init_dynamodb()
        
        payload = AuthService.decode_token(token)
        if not payload:
            return None
        
        # Get user by sub
        try:
            response = AuthService._users_table.get_item(Key={'sub': payload['sub']})
            if 'Item' in response:
                return response['Item']
            return None
        except Exception as e:
            print(f"Error getting user from token: {str(e)}")
            return None
    
    @staticmethod
    def add_to_admin_group(user_id: str):
        """
        Add user to Admin group
        
        Args:
            user_id: User sub/ID
        """
        AuthService._init_dynamodb()
        
        try:
            # Get current user
            response = AuthService._users_table.get_item(Key={'sub': user_id})
            if 'Item' not in response:
                return
            
            user = response['Item']
            groups = user.get('groups', [])
            
            if 'Admin' not in groups:
                groups.append('Admin')
                AuthService._users_table.update_item(
                    Key={'sub': user_id},
                    UpdateExpression='SET groups = :groups',
                    ExpressionAttributeValues={':groups': groups}
                )
        except Exception as e:
            print(f"Error adding user to admin group: {str(e)}")
    
    @staticmethod
    def is_admin(user: dict) -> bool:
        """
        Check if user is in Admin group
        
        Args:
            user: User information
            
        Returns:
            True if user is admin
        """
        return 'Admin' in user.get('groups', [])
    
    @staticmethod
    def get_all_users() -> list:
        """Get all registered users (admin only)"""
        AuthService._init_dynamodb()
        
        try:
            response = AuthService._users_table.scan()
            items = response.get('Items', [])
            
            return [
                {
                    'sub': user['sub'],
                    'email': user['email'],
                    'groups': user.get('groups', [])
                }
                for user in items
            ]
        except Exception as e:
            print(f"Error getting all users: {str(e)}")
            return []


# Decorators for protecting routes

def login_required(f):
    """
    Decorator to require authentication
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                # Expected format: "Bearer <token>"
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format. Use: Bearer <token>'}), 401
        
        if not token:
            return jsonify({'error': 'Authentication required. Please provide a valid token.'}), 401
        
        # Decode and validate token
        current_user = AuthService.get_user_from_token(token)
        if not current_user:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Attach user to request context
        request.current_user = current_user
        
        return f(*args, **kwargs)
    
    return decorated_function


def admin_required(f):
    """
    Decorator to require Admin group membership
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format. Use: Bearer <token>'}), 401
        
        if not token:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Decode and validate token
        current_user = AuthService.get_user_from_token(token)
        if not current_user:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Check if user is admin
        if not AuthService.is_admin(current_user):
            return jsonify({'error': 'Admin privileges required'}), 403
        
        # Attach user to request context
        request.current_user = current_user
        
        return f(*args, **kwargs)
    
    return decorated_function


def owner_or_admin_required(f):
    """
    Decorator to require ownership or Admin group
    The decorated function should accept customer_id parameter
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format. Use: Bearer <token>'}), 401
        
        if not token:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Decode and validate token
        current_user = AuthService.get_user_from_token(token)
        if not current_user:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get customer_id from URL parameters
        customer_id = kwargs.get('customer_id')
        
        # Check if user is admin or the owner
        is_admin = AuthService.is_admin(current_user)
        is_owner = current_user['sub'] == customer_id
        
        if not (is_admin or is_owner):
            return jsonify({
                'error': 'Access denied. You can only access your own resources.'
            }), 403
        
        # Attach user to request context
        request.current_user = current_user
        
        return f(*args, **kwargs)
    
    return decorated_function


def booking_owner_or_admin_required(f):
    """
    Decorator to require booking ownership or Admin group
    Checks if user owns the booking or is admin
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from data.storage import storage  # Import here to avoid circular dependency
        
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format. Use: Bearer <token>'}), 401
        
        if not token:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Decode and validate token
        current_user = AuthService.get_user_from_token(token)
        if not current_user:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get booking_id from URL parameters
        booking_id = kwargs.get('booking_id')
        
        if booking_id:
            # Get booking to check ownership
            booking = storage.get_booking(booking_id)
            if not booking:
                return jsonify({'error': 'Booking not found'}), 404
            
            # Check if user is admin or the owner
            is_admin = AuthService.is_admin(current_user)
            is_owner = current_user['sub'] == booking['customer']
            
            if not (is_admin or is_owner):
                return jsonify({
                    'error': 'Access denied. You can only access your own bookings.'
                }), 403
        
        # Attach user to request context
        request.current_user = current_user
        
        return f(*args, **kwargs)
    
    return decorated_function


# Initialize default users when module is imported
AuthService._init_default_users()
