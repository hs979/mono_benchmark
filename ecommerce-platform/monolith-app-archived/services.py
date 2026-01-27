"""
业务服务模块
包含所有业务逻辑，对应原AWS Serverless应用中的各个Lambda函数
"""

import json
import uuid
import math
import logging
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from database import Database

logger = logging.getLogger(__name__)


class ProductService:
    """
    产品服务
    对应原products服务中的validate功能
    """
    
    def __init__(self):
        self.db = Database()
    
    def validate_products(self, products: List[Dict]) -> Tuple[List[Dict], str]:
        """
        验证产品列表
        
        Args:
            products: 产品列表
        
        Returns:
            (无效产品列表, 错误消息)
        """
        invalid_products = []
        reasons = []
        
        for product in products:
            # 从数据库获取产品信息
            db_product = self.db.fetchone(
                'SELECT productId, name, price, package FROM products WHERE productId = ?',
                (product['productId'],)
            )
            
            if db_product is None:
                invalid_products.append(product)
                reasons.append(f"Product '{product['productId']}' not found")
                continue
            
            # 解析package字段
            db_package = json.loads(db_product['package'])
            db_product['package'] = db_package
            
            # 验证产品信息是否匹配
            error = self._compare_product(product, db_product)
            if error:
                invalid_products.append(db_product)
                reasons.append(error)
        
        return invalid_products, ". ".join(reasons)
    
    def _compare_product(self, user_product: Dict, db_product: Dict) -> Optional[str]:
        """
        比较用户提供的产品信息与数据库中的产品信息
        
        Args:
            user_product: 用户提供的产品信息
            db_product: 数据库中的产品信息
        
        Returns:
            错误消息，如果验证通过则返回None
        """
        # 验证必需字段
        for key in ['productId', 'name', 'price', 'package']:
            if key not in user_product:
                return f"Missing '{key}' in product '{user_product.get('productId', 'unknown')}'"
            
            if user_product[key] != db_product[key]:
                return f"Invalid value for '{key}': want '{db_product[key]}', got '{user_product[key]}' in product '{user_product['productId']}'"
        
        return None
    
    def get_all_products(self) -> List[Dict]:
        """
        获取所有产品
        
        Returns:
            产品列表
        """
        products = self.db.fetchall('SELECT * FROM products')
        
        # 解析JSON字段
        for product in products:
            product['package'] = json.loads(product['package'])
            product['tags'] = json.loads(product['tags']) if product['tags'] else []
            product['pictures'] = json.loads(product['pictures']) if product['pictures'] else []
        
        return products
    
    def get_product(self, product_id: str) -> Optional[Dict]:
        """
        获取单个产品信息
        
        Args:
            product_id: 产品ID
        
        Returns:
            产品信息，如果不存在则返回None
        """
        product = self.db.fetchone(
            'SELECT * FROM products WHERE productId = ?',
            (product_id,)
        )
        
        if product:
            product['package'] = json.loads(product['package'])
            product['tags'] = json.loads(product['tags']) if product['tags'] else []
            product['pictures'] = json.loads(product['pictures']) if product['pictures'] else []
        
        return product


class Payment3PService:
    """
    第三方支付服务（模拟）
    对应原payment-3p服务的功能
    """
    
    def __init__(self):
        self.db = Database()
    
    def create_preauth(self, card_number: str, amount: int) -> Optional[str]:
        """
        创建支付预授权
        
        Args:
            card_number: 信用卡号
            amount: 金额
        
        Returns:
            支付token，如果失败则返回None
        """
        try:
            payment_token = str(uuid.uuid4())
            created_date = datetime.now().isoformat()
            
            self.db.execute(
                'INSERT INTO payment_tokens (paymentToken, amount, createdDate) VALUES (?, ?, ?)',
                (payment_token, amount, created_date)
            )
            
            logger.info(f"Created payment token {payment_token} for amount {amount}")
            return payment_token
        
        except Exception as e:
            logger.error(f"Error creating payment token: {str(e)}")
            return None
    
    def check_token(self, payment_token: str, amount: int) -> Optional[bool]:
        """
        检查支付token是否有效
        
        Args:
            payment_token: 支付token
            amount: 金额
        
        Returns:
            True表示有效，False表示无效，None表示发生错误
        """
        try:
            token = self.db.fetchone(
                'SELECT * FROM payment_tokens WHERE paymentToken = ?',
                (payment_token,)
            )
            
            if not token:
                return False
            
            return token['amount'] >= amount
        
        except Exception as e:
            logger.error(f"Error checking payment token: {str(e)}")
            return None
    
    def process_payment(self, payment_token: str) -> Optional[bool]:
        """
        处理支付（删除token）
        
        Args:
            payment_token: 支付token
        
        Returns:
            True表示成功，False表示token不存在，None表示发生错误
        """
        try:
            token = self.db.fetchone(
                'SELECT * FROM payment_tokens WHERE paymentToken = ?',
                (payment_token,)
            )
            
            if not token:
                return False
            
            self.db.execute(
                'DELETE FROM payment_tokens WHERE paymentToken = ?',
                (payment_token,)
            )
            
            logger.info(f"Processed payment with token {payment_token}")
            return True
        
        except Exception as e:
            logger.error(f"Error processing payment: {str(e)}")
            return None
    
    def cancel_payment(self, payment_token: str) -> Optional[bool]:
        """
        取消支付（删除token）
        
        Args:
            payment_token: 支付token
        
        Returns:
            True表示成功，False表示token不存在，None表示发生错误
        """
        try:
            token = self.db.fetchone(
                'SELECT * FROM payment_tokens WHERE paymentToken = ?',
                (payment_token,)
            )
            
            if not token:
                return False
            
            self.db.execute(
                'DELETE FROM payment_tokens WHERE paymentToken = ?',
                (payment_token,)
            )
            
            logger.info(f"Cancelled payment with token {payment_token}")
            return True
        
        except Exception as e:
            logger.error(f"Error cancelling payment: {str(e)}")
            return None
    
    def update_amount(self, payment_token: str, amount: int) -> Optional[bool]:
        """
        更新支付金额（只能减少）
        
        Args:
            payment_token: 支付token
            amount: 新金额
        
        Returns:
            True表示成功，False表示失败，None表示发生错误
        """
        try:
            token = self.db.fetchone(
                'SELECT * FROM payment_tokens WHERE paymentToken = ?',
                (payment_token,)
            )
            
            if not token:
                return False
            
            # 只允许减少金额
            if amount > token['amount']:
                logger.warning(f"Cannot increase payment amount from {token['amount']} to {amount}")
                return False
            
            self.db.execute(
                'UPDATE payment_tokens SET amount = ? WHERE paymentToken = ?',
                (amount, payment_token)
            )
            
            logger.info(f"Updated payment token {payment_token} amount to {amount}")
            return True
        
        except Exception as e:
            logger.error(f"Error updating payment amount: {str(e)}")
            return None


class PaymentService:
    """
    支付服务
    对应原payment服务的validate功能
    """
    
    def __init__(self):
        self.payment_3p = Payment3PService()
    
    def validate_payment_token(self, payment_token: str, total: int) -> bool:
        """
        验证支付token
        
        Args:
            payment_token: 支付token
            total: 总金额
        
        Returns:
            True表示有效，False表示无效
        """
        result = self.payment_3p.check_token(payment_token, total)
        
        if result is None:
            logger.error("Error validating payment token with 3p service")
            return False
        
        return result


class DeliveryPricingService:
    """
    配送定价服务
    对应原delivery-pricing服务的功能
    """
    
    # 50*50*50 cm 立方体
    BOX_VOLUME = 500 * 500 * 500
    # 每箱12kg
    BOX_WEIGHT = 12000
    
    # 各国配送费用（单位：分）
    COUNTRY_SHIPPING_FEES = {
        # 北欧国家
        "DK": 0, "FI": 0, "NO": 0, "SE": 0,
        
        # 其他欧盟国家
        "AT": 1000, "BE": 1000, "BG": 1000, "CY": 1000,
        "CZ": 1000, "DE": 1000, "EE": 1000, "ES": 1000,
        "FR": 1000, "GR": 1000, "HR": 1000, "HU": 1000,
        "IE": 1000, "IT": 1000, "LT": 1000, "LU": 1000,
        "LV": 1000, "MT": 1000, "NL": 1000, "PO": 1000,
        "PT": 1000, "RO": 1000, "SI": 1000, "SK": 1000,
        
        # 北美
        "CA": 1500, "US": 1500,
        
        # 中国
        "CN": 500,
        
        # 世界其他地区
        "*": 2500
    }
    
    def get_pricing(self, products: List[Dict], address: Dict) -> int:
        """
        计算配送价格
        
        Args:
            products: 产品列表
            address: 配送地址
        
        Returns:
            配送价格（单位：分）
        """
        num_boxes = self._count_boxes([p['package'] for p in products])
        shipping_cost = self._get_shipping_cost(address)
        
        return num_boxes * shipping_cost
    
    def _count_boxes(self, packages: List[Dict]) -> int:
        """
        根据产品包装计算需要的箱数
        
        Args:
            packages: 包装信息列表
        
        Returns:
            箱数
        """
        total_volume = sum([p['width'] * p['length'] * p['height'] for p in packages])
        total_weight = sum([p['weight'] for p in packages])
        
        boxes_by_volume = math.ceil(total_volume / self.BOX_VOLUME)
        boxes_by_weight = math.ceil(total_weight / self.BOX_WEIGHT)
        
        return max(boxes_by_volume, boxes_by_weight)
    
    def _get_shipping_cost(self, address: Dict) -> int:
        """
        获取单箱配送费用
        
        Args:
            address: 配送地址
        
        Returns:
            单箱配送费用（单位：分）
        """
        country = address.get('country', '*')
        return self.COUNTRY_SHIPPING_FEES.get(country, self.COUNTRY_SHIPPING_FEES['*'])


class OrderService:
    """
    订单服务
    对应原orders服务的功能
    """
    
    def __init__(self):
        self.db = Database()
        self.product_service = ProductService()
        self.payment_service = PaymentService()
        self.delivery_pricing_service = DeliveryPricingService()
    
    def create_order(self, user_id: str, products: List[Dict], address: Dict,
                    delivery_price: int, payment_token: str) -> Dict:
        """
        创建订单
        
        Args:
            user_id: 用户ID
            products: 产品列表
            address: 配送地址
            delivery_price: 配送价格
            payment_token: 支付token
        
        Returns:
            创建结果字典
        """
        # 清理产品信息
        cleaned_products = self._cleanup_products(products)
        
        # 计算总价
        total = sum([p['price'] * p.get('quantity', 1) for p in cleaned_products]) + delivery_price
        
        # 构建订单对象
        order = {
            'orderId': str(uuid.uuid4()),
            'userId': user_id,
            'status': 'NEW',
            'products': cleaned_products,
            'address': address,
            'deliveryPrice': delivery_price,
            'paymentToken': payment_token,
            'total': total,
            'createdDate': datetime.now().isoformat(),
            'modifiedDate': datetime.now().isoformat()
        }
        
        # 验证订单
        errors = self._validate_order(order)
        
        if len(errors) > 0:
            return {
                'success': False,
                'message': 'Validation errors',
                'errors': errors
            }
        
        # 保存订单到数据库
        try:
            self.db.execute(
                '''INSERT INTO orders 
                (orderId, userId, status, products, address, deliveryPrice, paymentToken, total, createdDate, modifiedDate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (
                    order['orderId'],
                    order['userId'],
                    order['status'],
                    json.dumps(order['products']),
                    json.dumps(order['address']),
                    order['deliveryPrice'],
                    order['paymentToken'],
                    order['total'],
                    order['createdDate'],
                    order['modifiedDate']
                )
            )
            
            logger.info(f"Order {order['orderId']} created successfully")
            
            return {
                'success': True,
                'message': 'Order created',
                'order': order
            }
        
        except Exception as e:
            logger.error(f"Error creating order: {str(e)}")
            return {
                'success': False,
                'message': f'Failed to create order: {str(e)}',
                'errors': [str(e)]
            }
    
    def _cleanup_products(self, products: List[Dict]) -> List[Dict]:
        """
        清理产品信息，只保留必要字段
        
        Args:
            products: 原始产品列表
        
        Returns:
            清理后的产品列表
        """
        return [{
            'productId': p['productId'],
            'name': p['name'],
            'package': p['package'],
            'price': p['price'],
            'quantity': p.get('quantity', 1)
        } for p in products]
    
    def _validate_order(self, order: Dict) -> List[str]:
        """
        验证订单信息
        
        Args:
            order: 订单信息
        
        Returns:
            错误消息列表
        """
        errors = []
        
        # 验证产品
        invalid_products, reason = self.product_service.validate_products(order['products'])
        if len(invalid_products) > 0:
            errors.append(reason)
        
        # 验证配送价格
        expected_delivery_price = self.delivery_pricing_service.get_pricing(
            order['products'],
            order['address']
        )
        if expected_delivery_price != order['deliveryPrice']:
            errors.append(
                f"Wrong delivery price: got {order['deliveryPrice']}, expected {expected_delivery_price}"
            )
        
        # 验证支付token
        valid_payment = self.payment_service.validate_payment_token(
            order['paymentToken'],
            order['total']
        )
        if not valid_payment:
            errors.append("Wrong payment token")
        
        return errors
    
    def get_order(self, order_id: str) -> Optional[Dict]:
        """
        获取订单信息
        
        Args:
            order_id: 订单ID
        
        Returns:
            订单信息，如果不存在则返回None
        """
        order = self.db.fetchone(
            'SELECT * FROM orders WHERE orderId = ?',
            (order_id,)
        )
        
        if order:
            order['products'] = json.loads(order['products'])
            order['address'] = json.loads(order['address'])
        
        return order
    
    def get_all_orders(self) -> List[Dict]:
        """
        获取所有订单
        
        Returns:
            订单列表
        """
        orders = self.db.fetchall('SELECT * FROM orders')
        
        for order in orders:
            order['products'] = json.loads(order['products'])
            order['address'] = json.loads(order['address'])
        
        return orders


class WarehouseService:
    """
    仓库服务
    对应原warehouse服务的功能
    """
    
    def __init__(self):
        self.db = Database()
    
    def on_order_created(self, order: Dict):
        """
        处理订单创建事件，创建包装请求
        
        Args:
            order: 订单信息
        """
        try:
            order_id = order['orderId']
            
            # 检查是否已存在包装请求（幂等性检查）
            existing = self.db.fetchone(
                'SELECT * FROM warehouse_packaging WHERE orderId = ?',
                (order_id,)
            )
            
            if existing:
                logger.info(f"Packaging request for order {order_id} already exists")
                return
            
            # 创建包装请求
            modified_date = datetime.now().isoformat()
            self.db.execute(
                '''INSERT INTO warehouse_packaging 
                (orderId, status, products, modifiedDate, newDate)
                VALUES (?, ?, ?, ?, ?)''',
                (
                    order_id,
                    'NEW',
                    json.dumps(order['products']),
                    modified_date,
                    modified_date
                )
            )
            
            logger.info(f"Created packaging request for order {order_id}")
        
        except Exception as e:
            logger.error(f"Error creating packaging request: {str(e)}")
            raise
    
    def get_all_packaging_requests(self) -> List[Dict]:
        """
        获取所有包装请求
        
        Returns:
            包装请求列表
        """
        requests = self.db.fetchall('SELECT * FROM warehouse_packaging')
        
        for req in requests:
            req['products'] = json.loads(req['products'])
        
        return requests
    
    def get_packaging_request(self, order_id: str) -> Optional[Dict]:
        """
        获取特定订单的包装请求
        
        Args:
            order_id: 订单ID
        
        Returns:
            包装请求信息，如果不存在则返回None
        """
        req = self.db.fetchone(
            'SELECT * FROM warehouse_packaging WHERE orderId = ?',
            (order_id,)
        )
        
        if req:
            req['products'] = json.loads(req['products'])
        
        return req
    
    def complete_packaging(self, order_id: str) -> Tuple[bool, str]:
        """
        完成包装
        
        Args:
            order_id: 订单ID
        
        Returns:
            (成功标志, 消息)
        """
        try:
            req = self.get_packaging_request(order_id)
            
            if not req:
                return False, f"Packaging request for order {order_id} not found"
            
            if req['status'] != 'NEW':
                return False, f"Packaging request status is {req['status']}, cannot complete"
            
            # 更新状态
            self.db.execute(
                'UPDATE warehouse_packaging SET status = ?, newDate = NULL WHERE orderId = ?',
                ('COMPLETED', order_id)
            )
            
            logger.info(f"Completed packaging for order {order_id}")
            return True, "Packaging completed successfully"
        
        except Exception as e:
            logger.error(f"Error completing packaging: {str(e)}")
            return False, f"Error: {str(e)}"


class DeliveryService:
    """
    配送服务
    对应原delivery服务的功能
    """
    
    def __init__(self):
        self.db = Database()
    
    def on_package_created(self, order_id: str, address: Dict):
        """
        处理包裹创建事件，创建配送请求
        
        Args:
            order_id: 订单ID
            address: 配送地址
        """
        try:
            # 检查是否已存在配送请求（幂等性检查）
            existing = self.db.fetchone(
                'SELECT * FROM deliveries WHERE orderId = ?',
                (order_id,)
            )
            
            if existing and existing['status'] != 'NEW':
                logger.info(f"Delivery for order {order_id} already exists with status {existing['status']}")
                return
            
            # 创建或更新配送请求
            created_date = datetime.now().isoformat()
            
            if existing:
                self.db.execute(
                    '''UPDATE deliveries 
                    SET address = ?, modifiedDate = ?
                    WHERE orderId = ?''',
                    (json.dumps(address), created_date, order_id)
                )
            else:
                self.db.execute(
                    '''INSERT INTO deliveries 
                    (orderId, status, address, createdDate, modifiedDate)
                    VALUES (?, ?, ?, ?, ?)''',
                    (order_id, 'NEW', json.dumps(address), created_date, created_date)
                )
            
            logger.info(f"Created delivery request for order {order_id}")
        
        except Exception as e:
            logger.error(f"Error creating delivery request: {str(e)}")
            raise
    
    def get_all_deliveries(self) -> List[Dict]:
        """
        获取所有配送请求
        
        Returns:
            配送请求列表
        """
        deliveries = self.db.fetchall('SELECT * FROM deliveries')
        
        for delivery in deliveries:
            delivery['address'] = json.loads(delivery['address'])
        
        return deliveries
    
    def get_delivery(self, order_id: str) -> Optional[Dict]:
        """
        获取特定订单的配送信息
        
        Args:
            order_id: 订单ID
        
        Returns:
            配送信息，如果不存在则返回None
        """
        delivery = self.db.fetchone(
            'SELECT * FROM deliveries WHERE orderId = ?',
            (order_id,)
        )
        
        if delivery:
            delivery['address'] = json.loads(delivery['address'])
        
        return delivery
    
    def start_delivery(self, order_id: str) -> Tuple[bool, str]:
        """
        开始配送
        
        Args:
            order_id: 订单ID
        
        Returns:
            (成功标志, 消息)
        """
        try:
            delivery = self.get_delivery(order_id)
            
            if not delivery:
                return False, f"Delivery for order {order_id} not found"
            
            if delivery['status'] != 'NEW':
                return False, f"Delivery status is {delivery['status']}, cannot start"
            
            # 更新状态
            self.db.execute(
                'UPDATE deliveries SET status = ?, modifiedDate = ? WHERE orderId = ?',
                ('IN_PROGRESS', datetime.now().isoformat(), order_id)
            )
            
            logger.info(f"Started delivery for order {order_id}")
            return True, "Delivery started successfully"
        
        except Exception as e:
            logger.error(f"Error starting delivery: {str(e)}")
            return False, f"Error: {str(e)}"
    
    def complete_delivery(self, order_id: str) -> Tuple[bool, str]:
        """
        完成配送
        
        Args:
            order_id: 订单ID
        
        Returns:
            (成功标志, 消息)
        """
        try:
            delivery = self.get_delivery(order_id)
            
            if not delivery:
                return False, f"Delivery for order {order_id} not found"
            
            if delivery['status'] not in ['NEW', 'IN_PROGRESS']:
                return False, f"Delivery status is {delivery['status']}, cannot complete"
            
            # 更新状态
            self.db.execute(
                'UPDATE deliveries SET status = ?, modifiedDate = ? WHERE orderId = ?',
                ('COMPLETED', datetime.now().isoformat(), order_id)
            )
            
            logger.info(f"Completed delivery for order {order_id}")
            return True, "Delivery completed successfully"
        
        except Exception as e:
            logger.error(f"Error completing delivery: {str(e)}")
            return False, f"Error: {str(e)}"

