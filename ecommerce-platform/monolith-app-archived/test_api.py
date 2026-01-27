"""
API Test Script
Simple script to test the main functionality of the ecommerce monolith application
"""

import requests
import json
import sys

BASE_URL = "http://localhost:5000"

def test_root():
    """Test root endpoint"""
    print("\n=== Testing Root Endpoint ===")
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    return response.status_code == 200

def test_get_products():
    """Test getting all products"""
    print("\n=== Testing Get Products ===")
    response = requests.get(f"{BASE_URL}/products")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Number of products: {len(data.get('products', []))}")
    if data.get('products'):
        print(f"First product: {json.dumps(data['products'][0], indent=2, ensure_ascii=False)}")
        return response.status_code == 200, data['products'][0]
    return response.status_code == 200, None

def test_create_payment_token(amount):
    """Test creating payment token"""
    print("\n=== Testing Create Payment Token ===")
    response = requests.post(
        f"{BASE_URL}/payment-3p/preauth",
        json={
            "cardNumber": "1234567890123456",
            "amount": amount
        }
    )
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Payment Token: {data.get('paymentToken')}")
    return response.status_code == 200, data.get('paymentToken')

def test_calculate_delivery_price(product, address):
    """Test calculating delivery price"""
    print("\n=== Testing Calculate Delivery Price ===")
    response = requests.post(
        f"{BASE_URL}/delivery-pricing/pricing",
        json={
            "products": [product],
            "address": address
        }
    )
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Delivery Price: {data.get('pricing')}")
    return response.status_code == 200, data.get('pricing', 0)

def test_create_order(user_id, product, address, delivery_price, payment_token):
    """Test creating an order"""
    print("\n=== Testing Create Order ===")
    response = requests.post(
        f"{BASE_URL}/orders",
        json={
            "userId": user_id,
            "products": [product],
            "address": address,
            "deliveryPrice": delivery_price,
            "paymentToken": payment_token
        }
    )
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Success: {data.get('success')}")
    print(f"Message: {data.get('message')}")
    if data.get('order'):
        print(f"Order ID: {data['order']['orderId']}")
        print(f"Total: {data['order']['total']}")
        return response.status_code == 200, data['order']['orderId']
    if data.get('errors'):
        print(f"Errors: {data.get('errors')}")
    return response.status_code == 200, None

def test_get_order(order_id):
    """Test getting an order"""
    print("\n=== Testing Get Order ===")
    response = requests.get(f"{BASE_URL}/orders/{order_id}")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Order Status: {data['order']['status']}")
    return response.status_code == 200

def test_complete_workflow():
    """Test complete order workflow"""
    print("\n" + "="*60)
    print("STARTING COMPLETE WORKFLOW TEST")
    print("="*60)
    
    try:
        # Test 1: Root endpoint
        if not test_root():
            print("FAILED: Root endpoint test failed")
            return False
        
        # Test 2: Get products
        success, product = test_get_products()
        if not success or not product:
            print("FAILED: Get products test failed")
            return False
        
        # Prepare test data
        test_address = {
            "name": "Test User",
            "streetAddress": "123 Test Street",
            "city": "Beijing",
            "country": "CN",
            "phoneNumber": "13800138000"
        }
        
        # Test 3: Calculate delivery price
        success, delivery_price = test_calculate_delivery_price(product, test_address)
        if not success:
            print("FAILED: Calculate delivery price test failed")
            return False
        
        # Calculate total amount
        total_amount = product['price'] * product.get('quantity', 1) + delivery_price
        
        # Test 4: Create payment token
        success, payment_token = test_create_payment_token(total_amount)
        if not success or not payment_token:
            print("FAILED: Create payment token test failed")
            return False
        
        # Test 5: Create order
        success, order_id = test_create_order(
            "test-user-001",
            product,
            test_address,
            delivery_price,
            payment_token
        )
        if not success or not order_id:
            print("FAILED: Create order test failed")
            return False
        
        # Test 6: Get order
        if not test_get_order(order_id):
            print("FAILED: Get order test failed")
            return False
        
        print("\n" + "="*60)
        print("ALL TESTS PASSED!")
        print("="*60)
        return True
        
    except requests.exceptions.ConnectionError:
        print("\nERROR: Cannot connect to server. Make sure the app is running on http://localhost:5000")
        return False
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Ecommerce Monolith Application - API Test")
    print("Make sure the application is running before executing this script")
    print("Start the app with: python app.py")
    
    input("\nPress Enter to start testing...")
    
    success = test_complete_workflow()
    sys.exit(0 if success else 1)

