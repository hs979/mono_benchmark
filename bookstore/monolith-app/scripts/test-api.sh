#!/bin/bash

# API测试脚本
# 测试所有API端点是否正常工作

API_URL="http://localhost:3000"
CUSTOMER_ID="test-customer-123"

echo "========================================"
echo "AWS Bookstore API 测试"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 测试函数
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -n "测试: $description ... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "x-customer-id: $CUSTOMER_ID" \
            "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Content-Type: application/json" \
            -H "x-customer-id: $CUSTOMER_ID" \
            -d "$data" \
            "$API_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        echo -e "${GREEN}✓ 成功 (HTTP $http_code)${NC}"
    else
        echo -e "${RED}✗ 失败 (HTTP $http_code)${NC}"
    fi
}

echo "1. 测试根路径"
test_endpoint "GET" "/" "" "获取API信息"
echo ""

echo "2. 测试书籍API"
test_endpoint "GET" "/books" "" "获取所有书籍"
test_endpoint "GET" "/books?category=programming" "" "按分类获取书籍"
test_endpoint "GET" "/books/book-001" "" "获取单本书籍详情"
echo ""

echo "3. 测试购物车API"
test_endpoint "POST" "/cart" '{"bookId":"book-001","quantity":2,"price":99.00}' "添加到购物车"
test_endpoint "GET" "/cart" "" "获取购物车"
test_endpoint "GET" "/cart/book-001" "" "获取购物车中的单本书"
test_endpoint "PUT" "/cart" '{"bookId":"book-001","quantity":3}' "更新购物车"
echo ""

echo "4. 测试订单API"
test_endpoint "POST" "/orders" '{"books":[{"bookId":"book-001","quantity":1,"price":99.00}]}' "创建订单"
test_endpoint "GET" "/orders" "" "获取订单列表"
echo ""

echo "5. 测试其他功能API"
test_endpoint "GET" "/bestsellers" "" "获取畅销书榜单"
test_endpoint "GET" "/recommendations" "" "获取推荐书籍"
test_endpoint "GET" "/search?q=javascript" "" "搜索书籍"
echo ""

echo "6. 测试购物车清理"
test_endpoint "DELETE" "/cart" '{"bookId":"book-001"}' "从购物车删除"
echo ""

echo "========================================"
echo "测试完成"
echo "========================================"

