"""
完整业务逻辑测试套件
测试所有业务模块的核心功能和边界情况

测试覆盖:
1. 认证服务 (Auth Service)
2. 航班目录服务 (Catalog Service)  
3. 预订服务 (Booking Service)
4. 支付服务 (Payment Service)
5. 会员积分服务 (Loyalty Service)
6. 完整预订流程测试
7. 错误处理和边界条件
"""

import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.catalog import CatalogService
from services.booking import BookingService
from services.payment import PaymentService
from services.loyalty import LoyaltyService
from services.auth import AuthService
from data.storage import storage


class TestResult:
    """测试结果记录"""
    def __init__(self):
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def add_pass(self, test_name):
        self.total += 1
        self.passed += 1
        print(f"✓ {test_name}")
    
    def add_fail(self, test_name, error):
        self.total += 1
        self.failed += 1
        self.errors.append((test_name, str(error)))
        print(f"✗ {test_name}: {error}")
    
    def print_summary(self):
        print("\n" + "="*70)
        print(f"测试总结: {self.passed}/{self.total} 通过")
        print("="*70)
        
        if self.failed > 0:
            print(f"\n❌ 失败的测试 ({self.failed}):")
            for test_name, error in self.errors:
                print(f"  - {test_name}")
                print(f"    错误: {error}")
        else:
            print("\n✅ 所有测试通过!")


def test_auth_service(result: TestResult):
    """测试认证服务"""
    print("\n" + "="*70)
    print("测试模块 1: 认证服务 (Auth Service)")
    print("="*70)
    
    # 1.1 用户注册
    try:
        user = AuthService.register_user("test@example.com", "password123", "test-user-1")
        assert user['email'] == "test@example.com"
        assert user['sub'] == "test-user-1"
        assert 'user' in user['groups']
        result.add_pass("1.1 用户注册 - 成功创建新用户")
    except Exception as e:
        result.add_fail("1.1 用户注册", e)
    
    # 1.2 重复注册应失败
    try:
        try:
            AuthService.register_user("test@example.com", "password123")
            result.add_fail("1.2 重复注册检测", "应该抛出 ValueError")
        except ValueError as e:
            if "already exists" in str(e):
                result.add_pass("1.2 重复注册检测 - 正确拒绝重复邮箱")
            else:
                result.add_fail("1.2 重复注册检测", f"错误消息不正确: {e}")
    except Exception as e:
        result.add_fail("1.2 重复注册检测", e)
    
    # 1.3 用户登录
    try:
        user = AuthService.authenticate_user("test@example.com", "password123")
        assert user is not None
        assert user['email'] == "test@example.com"
        result.add_pass("1.3 用户登录 - 正确的凭证")
    except Exception as e:
        result.add_fail("1.3 用户登录", e)
    
    # 1.4 错误密码登录
    try:
        user = AuthService.authenticate_user("test@example.com", "wrongpassword")
        if user is None:
            result.add_pass("1.4 错误密码登录 - 正确拒绝")
        else:
            result.add_fail("1.4 错误密码登录", "应该返回 None")
    except Exception as e:
        result.add_fail("1.4 错误密码登录", e)
    
    # 1.5 JWT令牌生成
    try:
        user = AuthService.authenticate_user("test@example.com", "password123")
        token = AuthService.create_access_token(user)
        assert isinstance(token, str)
        assert len(token) > 0
        result.add_pass("1.5 JWT令牌生成 - 成功生成令牌")
    except Exception as e:
        result.add_fail("1.5 JWT令牌生成", e)
    
    # 1.6 JWT令牌验证
    try:
        user = AuthService.authenticate_user("test@example.com", "password123")
        token = AuthService.create_access_token(user)
        decoded = AuthService.verify_token(token)
        assert decoded['email'] == "test@example.com"
        assert decoded['sub'] == user['sub']
        result.add_pass("1.6 JWT令牌验证 - 成功解码令牌")
    except Exception as e:
        result.add_fail("1.6 JWT令牌验证", e)
    
    # 1.7 管理员用户检查
    try:
        admin = AuthService.authenticate_user("admin@example.com", "admin123")
        assert admin is not None
        assert 'admin' in admin['groups']
        result.add_pass("1.7 管理员用户检查 - 管理员权限正确")
    except Exception as e:
        result.add_fail("1.7 管理员用户检查", e)


def test_catalog_service(result: TestResult):
    """测试航班目录服务"""
    print("\n" + "="*70)
    print("测试模块 2: 航班目录服务 (Catalog Service)")
    print("="*70)
    
    # 2.1 搜索航班
    try:
        flights = CatalogService.search_flights("LAX", "SFO", "2025-11-10")
        assert isinstance(flights, list)
        assert len(flights) > 0
        assert flights[0]['departureAirportCode'] == "LAX"
        assert flights[0]['arrivalAirportCode'] == "SFO"
        result.add_pass("2.1 搜索航班 - 找到匹配的航班")
    except Exception as e:
        result.add_fail("2.1 搜索航班", e)
    
    # 2.2 搜索不存在的航班
    try:
        flights = CatalogService.search_flights("XXX", "YYY", "2025-12-31")
        assert isinstance(flights, list)
        assert len(flights) == 0
        result.add_pass("2.2 搜索不存在的航班 - 返回空列表")
    except Exception as e:
        result.add_fail("2.2 搜索不存在的航班", e)
    
    # 2.3 获取航班详情
    try:
        flight = CatalogService.get_flight("FL001")
        assert flight['id'] == "FL001"
        assert 'departureAirportCode' in flight
        assert 'ticketPrice' in flight
        result.add_pass("2.3 获取航班详情 - 成功获取")
    except Exception as e:
        result.add_fail("2.3 获取航班详情", e)
    
    # 2.4 获取不存在的航班
    try:
        try:
            CatalogService.get_flight("FL999")
            result.add_fail("2.4 获取不存在的航班", "应该抛出 ValueError")
        except ValueError:
            result.add_pass("2.4 获取不存在的航班 - 正确抛出异常")
    except Exception as e:
        result.add_fail("2.4 获取不存在的航班", e)
    
    # 2.5 预订座位
    try:
        flight_before = CatalogService.get_flight("FL001")
        initial_seats = flight_before['seatCapacity']
        
        CatalogService.reserve_flight_seat("FL001")
        
        flight_after = CatalogService.get_flight("FL001")
        assert flight_after['seatCapacity'] == initial_seats - 1
        result.add_pass("2.5 预订座位 - 座位数量正确减少")
    except Exception as e:
        result.add_fail("2.5 预订座位", e)
    
    # 2.6 释放座位
    try:
        flight_before = CatalogService.get_flight("FL001")
        initial_seats = flight_before['seatCapacity']
        
        CatalogService.release_flight_seat("FL001")
        
        flight_after = CatalogService.get_flight("FL001")
        assert flight_after['seatCapacity'] == initial_seats + 1
        result.add_pass("2.6 释放座位 - 座位数量正确增加")
    except Exception as e:
        result.add_fail("2.6 释放座位", e)
    
    # 2.7 预订满座航班
    try:
        # First, reserve all available seats
        flight = CatalogService.get_flight("FL001")
        available_seats = flight['seatCapacity']
        
        for _ in range(available_seats):
            CatalogService.reserve_flight_seat("FL001")
        
        # Try to reserve one more seat - should fail
        try:
            CatalogService.reserve_flight_seat("FL001")
            result.add_fail("2.7 预订满座航班", "应该抛出 ValueError")
        except ValueError as e:
            if "No seats available" in str(e) or "fully booked" in str(e):
                result.add_pass("2.7 预订满座航班 - 正确拒绝")
            else:
                result.add_fail("2.7 预订满座航班", f"错误消息不正确: {e}")
        
        # Restore seats
        for _ in range(available_seats):
            CatalogService.release_flight_seat("FL001")
            
    except Exception as e:
        result.add_fail("2.7 预订满座航班", e)


def test_payment_service(result: TestResult):
    """测试支付服务"""
    print("\n" + "="*70)
    print("测试模块 3: 支付服务 (Payment Service)")
    print("="*70)
    
    # 3.1 收取付款
    try:
        payment = PaymentService.collect_payment("ch_test_123456")
        assert 'receiptUrl' in payment
        assert 'price' in payment
        assert payment['price'] > 0
        result.add_pass("3.1 收取付款 - 成功处理付款")
    except Exception as e:
        result.add_fail("3.1 收取付款", e)
    
    # 3.2 无效的charge ID
    try:
        try:
            PaymentService.collect_payment("")
            result.add_fail("3.2 无效的charge ID", "应该抛出 ValueError")
        except ValueError:
            result.add_pass("3.2 无效的charge ID - 正确拒绝")
    except Exception as e:
        result.add_fail("3.2 无效的charge ID", e)
    
    # 3.3 退款
    try:
        # First collect a payment
        PaymentService.collect_payment("ch_test_refund_123")
        
        # Then refund it
        refund = PaymentService.refund_payment("ch_test_refund_123")
        assert 'refundId' in refund
        result.add_pass("3.3 退款 - 成功处理退款")
    except Exception as e:
        result.add_fail("3.3 退款", e)
    
    # 3.4 查询付款详情
    try:
        # First collect a payment
        PaymentService.collect_payment("ch_test_query_123")
        
        # Query it
        payment = PaymentService.get_payment("ch_test_query_123")
        assert payment is not None
        assert payment['chargeId'] == "ch_test_query_123"
        result.add_pass("3.4 查询付款详情 - 成功查询")
    except Exception as e:
        result.add_fail("3.4 查询付款详情", e)
    
    # 3.5 查询不存在的付款
    try:
        try:
            PaymentService.get_payment("ch_nonexistent")
            result.add_fail("3.5 查询不存在的付款", "应该抛出 ValueError")
        except ValueError:
            result.add_pass("3.5 查询不存在的付款 - 正确抛出异常")
    except Exception as e:
        result.add_fail("3.5 查询不存在的付款", e)


def test_loyalty_service(result: TestResult):
    """测试会员积分服务"""
    print("\n" + "="*70)
    print("测试模块 4: 会员积分服务 (Loyalty Service)")
    print("="*70)
    
    customer_id = "loyalty-test-customer-1"
    
    # 4.1 查询新客户积分（应该为0）
    try:
        loyalty = LoyaltyService.get_customer_loyalty(customer_id)
        assert loyalty['points'] == 0
        assert loyalty['level'] == 'bronze'
        result.add_pass("4.1 查询新客户积分 - 初始状态正确")
    except Exception as e:
        result.add_fail("4.1 查询新客户积分", e)
    
    # 4.2 添加积分
    try:
        LoyaltyService.add_loyalty_points(customer_id, 100)
        loyalty = LoyaltyService.get_customer_loyalty(customer_id)
        assert loyalty['points'] == 100
        result.add_pass("4.2 添加积分 - 积分正确增加")
    except Exception as e:
        result.add_fail("4.2 添加积分", e)
    
    # 4.3 添加无效积分（负数）
    try:
        try:
            LoyaltyService.add_loyalty_points(customer_id, -50)
            result.add_fail("4.3 添加无效积分", "应该抛出 ValueError")
        except ValueError:
            result.add_pass("4.3 添加无效积分 - 正确拒绝负数")
    except Exception as e:
        result.add_fail("4.3 添加无效积分", e)
    
    # 4.4 银卡等级测试
    try:
        LoyaltyService.add_loyalty_points(customer_id, 50000)
        loyalty = LoyaltyService.get_customer_loyalty(customer_id)
        assert loyalty['level'] == 'silver'
        assert loyalty['points'] >= 50000
        result.add_pass("4.4 银卡等级测试 - 正确晋升到银卡")
    except Exception as e:
        result.add_fail("4.4 银卡等级测试", e)
    
    # 4.5 金卡等级测试
    try:
        LoyaltyService.add_loyalty_points(customer_id, 50000)
        loyalty = LoyaltyService.get_customer_loyalty(customer_id)
        assert loyalty['level'] == 'gold'
        assert loyalty['points'] >= 100000
        result.add_pass("4.5 金卡等级测试 - 正确晋升到金卡")
    except Exception as e:
        result.add_fail("4.5 金卡等级测试", e)
    
    # 4.6 处理预订积分
    try:
        customer_id_2 = "loyalty-test-customer-2"
        LoyaltyService.process_booking_loyalty(customer_id_2, 150.0)
        loyalty = LoyaltyService.get_customer_loyalty(customer_id_2)
        assert loyalty['points'] == 150
        result.add_pass("4.6 处理预订积分 - 正确添加预订积分")
    except Exception as e:
        result.add_fail("4.6 处理预订积分", e)


def test_booking_service(result: TestResult):
    """测试预订服务"""
    print("\n" + "="*70)
    print("测试模块 5: 预订服务 (Booking Service)")
    print("="*70)
    
    # 5.1 验证预订请求
    try:
        valid_data = {
            'outboundFlightId': 'FL001',
            'customerId': 'customer123',
            'chargeId': 'ch_test_123'
        }
        assert BookingService.validate_booking_request(valid_data) == True
        result.add_pass("5.1 验证预订请求 - 有效请求")
    except Exception as e:
        result.add_fail("5.1 验证预订请求", e)
    
    # 5.2 验证无效的预订请求
    try:
        invalid_data = {
            'outboundFlightId': 'FL001',
            # Missing customerId and chargeId
        }
        assert BookingService.validate_booking_request(invalid_data) == False
        result.add_pass("5.2 验证无效的预订请求 - 正确识别缺失字段")
    except Exception as e:
        result.add_fail("5.2 验证无效的预订请求", e)
    
    # 5.3 创建预订
    try:
        booking_data = {
            'outboundFlightId': 'FL001',
            'customerId': 'booking-test-customer-1',
            'chargeId': 'ch_booking_test_123'
        }
        booking_id = BookingService.reserve_booking(booking_data)
        assert isinstance(booking_id, str)
        assert len(booking_id) > 0
        result.add_pass("5.3 创建预订 - 成功创建")
    except Exception as e:
        result.add_fail("5.3 创建预订", e)
    
    # 5.4 确认预订
    try:
        booking_data = {
            'outboundFlightId': 'FL001',
            'customerId': 'booking-test-customer-2',
            'chargeId': 'ch_booking_test_456'
        }
        booking_id = BookingService.reserve_booking(booking_data)
        
        reference = BookingService.confirm_booking(booking_id)
        assert isinstance(reference, str)
        assert len(reference) > 0
        
        booking = BookingService.get_booking(booking_id)
        assert booking['status'] == 'CONFIRMED'
        result.add_pass("5.4 确认预订 - 成功确认")
    except Exception as e:
        result.add_fail("5.4 确认预订", e)
    
    # 5.5 取消预订
    try:
        booking_data = {
            'outboundFlightId': 'FL001',
            'customerId': 'booking-test-customer-3',
            'chargeId': 'ch_booking_test_789'
        }
        booking_id = BookingService.reserve_booking(booking_data)
        
        BookingService.cancel_booking(booking_id)
        
        booking = BookingService.get_booking(booking_id)
        assert booking['status'] == 'CANCELLED'
        result.add_pass("5.5 取消预订 - 成功取消")
    except Exception as e:
        result.add_fail("5.5 取消预订", e)
    
    # 5.6 查询客户预订
    try:
        customer_id = 'booking-test-customer-query'
        
        # Create multiple bookings
        booking_data_1 = {
            'outboundFlightId': 'FL001',
            'customerId': customer_id,
            'chargeId': 'ch_query_1'
        }
        BookingService.reserve_booking(booking_data_1)
        
        booking_data_2 = {
            'outboundFlightId': 'FL002',
            'customerId': customer_id,
            'chargeId': 'ch_query_2'
        }
        BookingService.reserve_booking(booking_data_2)
        
        bookings = BookingService.get_customer_bookings(customer_id)
        assert len(bookings) >= 2
        result.add_pass("5.6 查询客户预订 - 成功查询")
    except Exception as e:
        result.add_fail("5.6 查询客户预订", e)
    
    # 5.7 按状态过滤预订
    try:
        bookings = BookingService.get_customer_bookings(customer_id, 'UNCONFIRMED')
        for booking in bookings:
            assert booking['status'] == 'UNCONFIRMED'
        result.add_pass("5.7 按状态过滤预订 - 正确过滤")
    except Exception as e:
        result.add_fail("5.7 按状态过滤预订", e)
    
    # 5.8 发送预订通知
    try:
        notification = BookingService.notify_booking('customer123', 150.0, 'REF123')
        assert 'notificationId' in notification
        assert notification['customerId'] == 'customer123'
        assert notification['status'] == 'confirmed'
        result.add_pass("5.8 发送预订通知 - 成功发送")
    except Exception as e:
        result.add_fail("5.8 发送预订通知", e)


def test_complete_booking_workflow(result: TestResult):
    """测试完整的预订流程"""
    print("\n" + "="*70)
    print("测试模块 6: 完整预订流程 (End-to-End Workflow)")
    print("="*70)
    
    # 6.1 成功的完整预订流程
    try:
        customer_id = 'workflow-test-customer-1'
        
        # Step 1: Search flights
        flights = CatalogService.search_flights("LAX", "SFO", "2025-11-10")
        assert len(flights) > 0
        
        flight_id = flights[0]['id']
        initial_seats = flights[0]['seatCapacity']
        
        # Step 2: Reserve seat
        CatalogService.reserve_flight_seat(flight_id)
        
        # Step 3: Create booking
        booking_data = {
            'outboundFlightId': flight_id,
            'customerId': customer_id,
            'chargeId': 'ch_workflow_test_1'
        }
        booking_id = BookingService.reserve_booking(booking_data)
        
        # Step 4: Collect payment
        payment = PaymentService.collect_payment('ch_workflow_test_1')
        
        # Step 5: Confirm booking
        reference = BookingService.confirm_booking(booking_id)
        
        # Step 6: Add loyalty points
        LoyaltyService.process_booking_loyalty(customer_id, payment['price'])
        
        # Verify results
        booking = BookingService.get_booking(booking_id)
        assert booking['status'] == 'CONFIRMED'
        
        flight = CatalogService.get_flight(flight_id)
        assert flight['seatCapacity'] == initial_seats - 1
        
        loyalty = LoyaltyService.get_customer_loyalty(customer_id)
        assert loyalty['points'] > 0
        
        result.add_pass("6.1 成功的完整预订流程 - 所有步骤成功")
    except Exception as e:
        result.add_fail("6.1 成功的完整预订流程", e)
    
    # 6.2 预订取消流程
    try:
        customer_id = 'workflow-test-customer-2'
        
        # Create a booking
        flights = CatalogService.search_flights("JFK", "LAX", "2025-11-12")
        flight_id = flights[0]['id']
        initial_seats = flights[0]['seatCapacity']
        
        CatalogService.reserve_flight_seat(flight_id)
        
        booking_data = {
            'outboundFlightId': flight_id,
            'customerId': customer_id,
            'chargeId': 'ch_workflow_test_2'
        }
        booking_id = BookingService.reserve_booking(booking_data)
        
        PaymentService.collect_payment('ch_workflow_test_2')
        BookingService.confirm_booking(booking_id)
        
        # Cancel the booking
        BookingService.cancel_booking(booking_id)
        
        # Release the seat
        CatalogService.release_flight_seat(flight_id)
        
        # Refund payment
        PaymentService.refund_payment('ch_workflow_test_2')
        
        # Verify results
        booking = BookingService.get_booking(booking_id)
        assert booking['status'] == 'CANCELLED'
        
        flight = CatalogService.get_flight(flight_id)
        assert flight['seatCapacity'] == initial_seats
        
        result.add_pass("6.2 预订取消流程 - 成功取消并回滚")
    except Exception as e:
        result.add_fail("6.2 预订取消流程", e)


def test_edge_cases(result: TestResult):
    """测试边界情况和错误处理"""
    print("\n" + "="*70)
    print("测试模块 7: 边界情况和错误处理")
    print("="*70)
    
    # 7.1 不存在的预订ID
    try:
        try:
            BookingService.get_booking("nonexistent_booking")
            result.add_fail("7.1 不存在的预订ID", "应该抛出 ValueError")
        except ValueError:
            result.add_pass("7.1 不存在的预订ID - 正确抛出异常")
    except Exception as e:
        result.add_fail("7.1 不存在的预订ID", e)
    
    # 7.2 确认不存在的预订
    try:
        try:
            BookingService.confirm_booking("nonexistent_booking")
            result.add_fail("7.2 确认不存在的预订", "应该抛出 ValueError")
        except ValueError:
            result.add_pass("7.2 确认不存在的预订 - 正确抛出异常")
    except Exception as e:
        result.add_fail("7.2 确认不存在的预订", e)
    
    # 7.3 取消不存在的预订
    try:
        try:
            BookingService.cancel_booking("nonexistent_booking")
            result.add_fail("7.3 取消不存在的预订", "应该抛出 ValueError")
        except ValueError:
            result.add_pass("7.3 取消不存在的预订 - 正确抛出异常")
    except Exception as e:
        result.add_fail("7.3 取消不存在的预订", e)
    
    # 7.4 添加零积分
    try:
        try:
            LoyaltyService.add_loyalty_points("customer", 0)
            result.add_fail("7.4 添加零积分", "应该抛出 ValueError")
        except ValueError:
            result.add_pass("7.4 添加零积分 - 正确拒绝")
    except Exception as e:
        result.add_fail("7.4 添加零积分", e)
    
    # 7.5 空客户ID查询预订
    try:
        bookings = BookingService.get_customer_bookings("")
        assert isinstance(bookings, list)
        result.add_pass("7.5 空客户ID查询预订 - 返回空列表")
    except Exception as e:
        result.add_fail("7.5 空客户ID查询预订", e)
    
    # 7.6 释放不存在的航班座位
    try:
        try:
            CatalogService.release_flight_seat("FL999")
            result.add_fail("7.6 释放不存在的航班座位", "应该抛出 ValueError")
        except ValueError:
            result.add_pass("7.6 释放不存在的航班座位 - 正确抛出异常")
    except Exception as e:
        result.add_fail("7.6 释放不存在的航班座位", e)


def main():
    """运行所有测试"""
    print("\n" + "="*70)
    print("航班预订系统 - 完整业务逻辑测试套件")
    print("="*70)
    
    result = TestResult()
    
    # Run all test modules
    test_auth_service(result)
    test_catalog_service(result)
    test_payment_service(result)
    test_loyalty_service(result)
    test_booking_service(result)
    test_complete_booking_workflow(result)
    test_edge_cases(result)
    
    # Print summary
    result.print_summary()
    
    return 0 if result.failed == 0 else 1


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)

