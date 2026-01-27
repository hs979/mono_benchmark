"""
API端点测试脚本
测试所有HTTP API端点的功能和认证

注意: 运行此测试前需要先启动服务器
    python run.py
"""

import requests
import json
import sys
import time


class Colors:
    """终端颜色"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'


class APITester:
    """API测试器"""
    
    def __init__(self, base_url='http://localhost:5000'):
        self.base_url = base_url
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.errors = []
        
        # 存储测试数据
        self.test_user_token = None
        self.test_user_id = None
        self.admin_token = None
        self.test_booking_id = None
        
    def test_pass(self, test_name):
        """记录测试通过"""
        self.total_tests += 1
        self.passed_tests += 1
        print(f"{Colors.GREEN}✓{Colors.END} {test_name}")
    
    def test_fail(self, test_name, error):
        """记录测试失败"""
        self.total_tests += 1
        self.failed_tests += 1
        self.errors.append((test_name, str(error)))
        print(f"{Colors.RED}✗{Colors.END} {test_name}: {error}")
    
    def print_section(self, title):
        """打印测试章节"""
        print(f"\n{Colors.BLUE}{'='*70}")
        print(f"{title}")
        print(f"{'='*70}{Colors.END}")
    
    def print_summary(self):
        """打印测试总结"""
        print(f"\n{Colors.BLUE}{'='*70}")
        print(f"测试总结: {self.passed_tests}/{self.total_tests} 通过")
        print(f"{'='*70}{Colors.END}")
        
        if self.failed_tests > 0:
            print(f"\n{Colors.RED}❌ 失败的测试 ({self.failed_tests}):{Colors.END}")
            for test_name, error in self.errors:
                print(f"  - {test_name}")
                print(f"    错误: {error}")
        else:
            print(f"\n{Colors.GREEN}✅ 所有测试通过!{Colors.END}")
    
    def check_server(self):
        """检查服务器是否运行"""
        try:
            response = requests.get(f"{self.base_url}/api", timeout=2)
            return response.status_code == 200
        except requests.exceptions.ConnectionError:
            return False
    
    def test_authentication(self):
        """测试认证端点"""
        self.print_section("测试模块 1: 认证 API (Authentication)")
        
        # 1.1 注册新用户
        try:
            response = requests.post(
                f"{self.base_url}/auth/register",
                json={
                    "email": f"apitest_{int(time.time())}@example.com",
                    "password": "testpass123"
                }
            )
            
            if response.status_code == 201:
                data = response.json()
                if 'sub' in data and 'email' in data:
                    self.test_pass("1.1 注册新用户")
                else:
                    self.test_fail("1.1 注册新用户", "响应缺少必要字段")
            else:
                self.test_fail("1.1 注册新用户", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("1.1 注册新用户", e)
        
        # 1.2 重复注册应失败
        try:
            response = requests.post(
                f"{self.base_url}/auth/register",
                json={
                    "email": "user@example.com",
                    "password": "password123"
                }
            )
            
            if response.status_code == 400:
                self.test_pass("1.2 重复注册检测")
            else:
                self.test_fail("1.2 重复注册检测", f"应返回400，实际返回{response.status_code}")
        except Exception as e:
            self.test_fail("1.2 重复注册检测", e)
        
        # 1.3 用户登录
        try:
            response = requests.post(
                f"{self.base_url}/auth/login",
                json={
                    "email": "user@example.com",
                    "password": "password123"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data and 'user' in data:
                    self.test_user_token = data['access_token']
                    self.test_user_id = data['user']['sub']
                    self.test_pass("1.3 用户登录")
                else:
                    self.test_fail("1.3 用户登录", "响应缺少令牌或用户信息")
            else:
                self.test_fail("1.3 用户登录", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("1.3 用户登录", e)
        
        # 1.4 错误密码登录
        try:
            response = requests.post(
                f"{self.base_url}/auth/login",
                json={
                    "email": "user@example.com",
                    "password": "wrongpassword"
                }
            )
            
            if response.status_code == 401:
                self.test_pass("1.4 错误密码登录")
            else:
                self.test_fail("1.4 错误密码登录", f"应返回401，实际返回{response.status_code}")
        except Exception as e:
            self.test_fail("1.4 错误密码登录", e)
        
        # 1.5 获取当前用户信息
        try:
            if not self.test_user_token:
                self.test_fail("1.5 获取当前用户", "没有可用的令牌")
            else:
                response = requests.get(
                    f"{self.base_url}/auth/me",
                    headers={"Authorization": f"Bearer {self.test_user_token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'sub' in data and 'email' in data:
                        self.test_pass("1.5 获取当前用户")
                    else:
                        self.test_fail("1.5 获取当前用户", "响应缺少必要字段")
                else:
                    self.test_fail("1.5 获取当前用户", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("1.5 获取当前用户", e)
        
        # 1.6 管理员登录
        try:
            response = requests.post(
                f"{self.base_url}/auth/login",
                json={
                    "email": "admin@example.com",
                    "password": "admin123"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get('access_token')
                if 'admin' in data['user'].get('groups', []):
                    self.test_pass("1.6 管理员登录")
                else:
                    self.test_fail("1.6 管理员登录", "用户不是管理员")
            else:
                self.test_fail("1.6 管理员登录", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("1.6 管理员登录", e)
        
        # 1.7 列出所有用户（仅管理员）
        try:
            if not self.admin_token:
                self.test_fail("1.7 列出所有用户", "没有管理员令牌")
            else:
                response = requests.get(
                    f"{self.base_url}/auth/users",
                    headers={"Authorization": f"Bearer {self.admin_token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'users' in data:
                        self.test_pass("1.7 列出所有用户（管理员）")
                    else:
                        self.test_fail("1.7 列出所有用户", "响应格式不正确")
                else:
                    self.test_fail("1.7 列出所有用户", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("1.7 列出所有用户", e)
    
    def test_catalog(self):
        """测试航班目录端点"""
        self.print_section("测试模块 2: 航班目录 API (Flight Catalog)")
        
        # 2.1 搜索航班
        try:
            response = requests.get(
                f"{self.base_url}/flights/search",
                params={
                    "departureCode": "LAX",
                    "arrivalCode": "SFO",
                    "departureDate": "2025-11-10"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'flights' in data and len(data['flights']) > 0:
                    self.test_pass("2.1 搜索航班")
                else:
                    self.test_fail("2.1 搜索航班", "未找到航班")
            else:
                self.test_fail("2.1 搜索航班", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("2.1 搜索航班", e)
        
        # 2.2 缺少参数的搜索
        try:
            response = requests.get(
                f"{self.base_url}/flights/search",
                params={"departureCode": "LAX"}
            )
            
            if response.status_code == 400:
                self.test_pass("2.2 缺少参数的搜索")
            else:
                self.test_fail("2.2 缺少参数的搜索", f"应返回400，实际返回{response.status_code}")
        except Exception as e:
            self.test_fail("2.2 缺少参数的搜索", e)
        
        # 2.3 获取航班详情
        try:
            response = requests.get(f"{self.base_url}/flights/FL001")
            
            if response.status_code == 200:
                data = response.json()
                if 'id' in data and data['id'] == 'FL001':
                    self.test_pass("2.3 获取航班详情")
                else:
                    self.test_fail("2.3 获取航班详情", "航班ID不匹配")
            else:
                self.test_fail("2.3 获取航班详情", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("2.3 获取航班详情", e)
        
        # 2.4 获取不存在的航班
        try:
            response = requests.get(f"{self.base_url}/flights/FL999")
            
            if response.status_code == 400:
                self.test_pass("2.4 获取不存在的航班")
            else:
                self.test_fail("2.4 获取不存在的航班", f"应返回400，实际返回{response.status_code}")
        except Exception as e:
            self.test_fail("2.4 获取不存在的航班", e)
        
        # 2.5 预订座位
        try:
            response = requests.post(f"{self.base_url}/flights/FL001/reserve")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'SUCCESS':
                    self.test_pass("2.5 预订座位")
                else:
                    self.test_fail("2.5 预订座位", "状态不是SUCCESS")
            else:
                self.test_fail("2.5 预订座位", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("2.5 预订座位", e)
        
        # 2.6 释放座位
        try:
            response = requests.post(f"{self.base_url}/flights/FL001/release")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'SUCCESS':
                    self.test_pass("2.6 释放座位")
                else:
                    self.test_fail("2.6 释放座位", "状态不是SUCCESS")
            else:
                self.test_fail("2.6 释放座位", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("2.6 释放座位", e)
    
    def test_bookings(self):
        """测试预订端点"""
        self.print_section("测试模块 3: 预订管理 API (Bookings)")
        
        # 3.1 未认证创建预订
        try:
            response = requests.post(
                f"{self.base_url}/bookings",
                json={
                    "outboundFlightId": "FL001",
                    "chargeId": "ch_test_123"
                }
            )
            
            if response.status_code == 401:
                self.test_pass("3.1 未认证创建预订（应失败）")
            else:
                self.test_fail("3.1 未认证创建预订", f"应返回401，实际返回{response.status_code}")
        except Exception as e:
            self.test_fail("3.1 未认证创建预订", e)
        
        # 3.2 创建预订（已认证）
        try:
            if not self.test_user_token:
                self.test_fail("3.2 创建预订", "没有可用的令牌")
            else:
                response = requests.post(
                    f"{self.base_url}/bookings",
                    headers={"Authorization": f"Bearer {self.test_user_token}"},
                    json={
                        "outboundFlightId": "FL001",
                        "chargeId": f"ch_api_test_{int(time.time())}"
                    }
                )
                
                if response.status_code == 201:
                    data = response.json()
                    if 'bookingId' in data and data.get('status') == 'CONFIRMED':
                        self.test_booking_id = data['bookingId']
                        self.test_pass("3.2 创建预订（已认证）")
                    else:
                        self.test_fail("3.2 创建预订", "响应格式不正确")
                else:
                    self.test_fail("3.2 创建预订", f"状态码 {response.status_code}: {response.text}")
        except Exception as e:
            self.test_fail("3.2 创建预订", e)
        
        # 3.3 查询预订详情
        try:
            if not self.test_booking_id or not self.test_user_token:
                self.test_fail("3.3 查询预订详情", "没有可用的预订ID或令牌")
            else:
                response = requests.get(
                    f"{self.base_url}/bookings/{self.test_booking_id}",
                    headers={"Authorization": f"Bearer {self.test_user_token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('id') == self.test_booking_id:
                        self.test_pass("3.3 查询预订详情")
                    else:
                        self.test_fail("3.3 查询预订详情", "预订ID不匹配")
                else:
                    self.test_fail("3.3 查询预订详情", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("3.3 查询预订详情", e)
        
        # 3.4 查询客户的所有预订
        try:
            if not self.test_user_id or not self.test_user_token:
                self.test_fail("3.4 查询客户预订", "没有可用的用户ID或令牌")
            else:
                response = requests.get(
                    f"{self.base_url}/customers/{self.test_user_id}/bookings",
                    headers={"Authorization": f"Bearer {self.test_user_token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'bookings' in data:
                        self.test_pass("3.4 查询客户的所有预订")
                    else:
                        self.test_fail("3.4 查询客户预订", "响应格式不正确")
                else:
                    self.test_fail("3.4 查询客户预订", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("3.4 查询客户预订", e)
        
        # 3.5 按状态过滤预订
        try:
            if not self.test_user_id or not self.test_user_token:
                self.test_fail("3.5 按状态过滤预订", "没有可用的用户ID或令牌")
            else:
                response = requests.get(
                    f"{self.base_url}/customers/{self.test_user_id}/bookings",
                    params={"status": "CONFIRMED"},
                    headers={"Authorization": f"Bearer {self.test_user_token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'bookings' in data:
                        # 验证所有预订都是CONFIRMED状态
                        all_confirmed = all(b.get('status') == 'CONFIRMED' for b in data['bookings'])
                        if all_confirmed:
                            self.test_pass("3.5 按状态过滤预订")
                        else:
                            self.test_fail("3.5 按状态过滤预订", "过滤不正确")
                    else:
                        self.test_fail("3.5 按状态过滤预订", "响应格式不正确")
                else:
                    self.test_fail("3.5 按状态过滤预订", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("3.5 按状态过滤预订", e)
        
        # 3.6 取消预订
        try:
            if not self.test_booking_id or not self.test_user_token:
                self.test_fail("3.6 取消预订", "没有可用的预订ID或令牌")
            else:
                response = requests.post(
                    f"{self.base_url}/bookings/{self.test_booking_id}/cancel",
                    headers={"Authorization": f"Bearer {self.test_user_token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('status') == 'CANCELLED':
                        self.test_pass("3.6 取消预订")
                    else:
                        self.test_fail("3.6 取消预订", "状态不是CANCELLED")
                else:
                    self.test_fail("3.6 取消预订", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("3.6 取消预订", e)
    
    def test_payments(self):
        """测试支付端点"""
        self.print_section("测试模块 4: 支付处理 API (Payments)")
        
        # 4.1 收取付款
        try:
            charge_id = f"ch_payment_test_{int(time.time())}"
            response = requests.post(
                f"{self.base_url}/payments/collect",
                json={"chargeId": charge_id}
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'receiptUrl' in data and 'price' in data:
                    self.test_pass("4.1 收取付款")
                else:
                    self.test_fail("4.1 收取付款", "响应格式不正确")
            else:
                self.test_fail("4.1 收取付款", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("4.1 收取付款", e)
        
        # 4.2 无效的charge ID
        try:
            response = requests.post(
                f"{self.base_url}/payments/collect",
                json={"chargeId": ""}
            )
            
            if response.status_code == 400:
                self.test_pass("4.2 无效的charge ID")
            else:
                self.test_fail("4.2 无效的charge ID", f"应返回400，实际返回{response.status_code}")
        except Exception as e:
            self.test_fail("4.2 无效的charge ID", e)
        
        # 4.3 退款
        try:
            charge_id = f"ch_refund_test_{int(time.time())}"
            # 先收款
            requests.post(
                f"{self.base_url}/payments/collect",
                json={"chargeId": charge_id}
            )
            
            # 然后退款
            response = requests.post(
                f"{self.base_url}/payments/refund",
                json={"chargeId": charge_id}
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'refundId' in data:
                    self.test_pass("4.3 退款")
                else:
                    self.test_fail("4.3 退款", "响应格式不正确")
            else:
                self.test_fail("4.3 退款", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("4.3 退款", e)
        
        # 4.4 查询付款详情
        try:
            charge_id = f"ch_query_test_{int(time.time())}"
            # 先创建付款
            requests.post(
                f"{self.base_url}/payments/collect",
                json={"chargeId": charge_id}
            )
            
            # 查询
            response = requests.get(f"{self.base_url}/payments/{charge_id}")
            
            if response.status_code == 200:
                data = response.json()
                if 'chargeId' in data:
                    self.test_pass("4.4 查询付款详情")
                else:
                    self.test_fail("4.4 查询付款详情", "响应格式不正确")
            else:
                self.test_fail("4.4 查询付款详情", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("4.4 查询付款详情", e)
    
    def test_loyalty(self):
        """测试会员积分端点"""
        self.print_section("测试模块 5: 会员积分 API (Loyalty)")
        
        # 5.1 查询客户积分（未认证）
        try:
            response = requests.get(f"{self.base_url}/loyalty/some_customer")
            
            if response.status_code == 401:
                self.test_pass("5.1 未认证查询积分（应失败）")
            else:
                self.test_fail("5.1 未认证查询积分", f"应返回401，实际返回{response.status_code}")
        except Exception as e:
            self.test_fail("5.1 未认证查询积分", e)
        
        # 5.2 查询客户积分（已认证）
        try:
            if not self.test_user_id or not self.test_user_token:
                self.test_fail("5.2 查询客户积分", "没有可用的用户ID或令牌")
            else:
                response = requests.get(
                    f"{self.base_url}/loyalty/{self.test_user_id}",
                    headers={"Authorization": f"Bearer {self.test_user_token}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'points' in data and 'level' in data and 'remainingPoints' in data:
                        self.test_pass("5.2 查询客户积分（已认证）")
                    else:
                        self.test_fail("5.2 查询客户积分", "响应格式不正确")
                else:
                    self.test_fail("5.2 查询客户积分", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("5.2 查询客户积分", e)
        
        # 5.3 普通用户添加积分（应失败）
        try:
            if not self.test_user_id or not self.test_user_token:
                self.test_fail("5.3 普通用户添加积分", "没有可用的用户ID或令牌")
            else:
                response = requests.post(
                    f"{self.base_url}/loyalty/{self.test_user_id}/points",
                    headers={"Authorization": f"Bearer {self.test_user_token}"},
                    json={"points": 1000}
                )
                
                if response.status_code == 403:
                    self.test_pass("5.3 普通用户添加积分（应失败）")
                else:
                    self.test_fail("5.3 普通用户添加积分", f"应返回403，实际返回{response.status_code}")
        except Exception as e:
            self.test_fail("5.3 普通用户添加积分", e)
        
        # 5.4 管理员添加积分（应成功）
        try:
            if not self.admin_token:
                self.test_fail("5.4 管理员添加积分", "没有管理员令牌")
            else:
                response = requests.post(
                    f"{self.base_url}/loyalty/test_customer_loyalty/points",
                    headers={"Authorization": f"Bearer {self.admin_token}"},
                    json={"points": 1000}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'message' in data and 'pointsAdded' in data:
                        self.test_pass("5.4 管理员添加积分（应成功）")
                    else:
                        self.test_fail("5.4 管理员添加积分", "响应格式不正确")
                else:
                    self.test_fail("5.4 管理员添加积分", f"状态码 {response.status_code}")
        except Exception as e:
            self.test_fail("5.4 管理员添加积分", e)
        
        # 5.5 添加无效积分（负数）
        try:
            if not self.admin_token:
                self.test_fail("5.5 添加无效积分", "没有管理员令牌")
            else:
                response = requests.post(
                    f"{self.base_url}/loyalty/test_customer/points",
                    headers={"Authorization": f"Bearer {self.admin_token}"},
                    json={"points": -100}
                )
                
                if response.status_code == 400:
                    self.test_pass("5.5 添加无效积分（负数）")
                else:
                    self.test_fail("5.5 添加无效积分", f"应返回400，实际返回{response.status_code}")
        except Exception as e:
            self.test_fail("5.5 添加无效积分", e)
    
    def run_all_tests(self):
        """运行所有测试"""
        print(f"\n{Colors.BLUE}{'='*70}")
        print("航班预订系统 - API端点测试套件")
        print(f"{'='*70}{Colors.END}")
        
        # 检查服务器是否运行
        print(f"\n{Colors.YELLOW}检查服务器连接...{Colors.END}")
        if not self.check_server():
            print(f"{Colors.RED}错误: 无法连接到服务器 {self.base_url}{Colors.END}")
            print("请先启动服务器: python run.py")
            return 1
        print(f"{Colors.GREEN}✓ 服务器正在运行{Colors.END}")
        
        # 运行所有测试模块
        self.test_authentication()
        self.test_catalog()
        self.test_bookings()
        self.test_payments()
        self.test_loyalty()
        
        # 打印总结
        self.print_summary()
        
        return 0 if self.failed_tests == 0 else 1


def main():
    """主函数"""
    tester = APITester()
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)


if __name__ == '__main__':
    main()

