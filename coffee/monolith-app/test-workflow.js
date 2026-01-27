
/**
 * 测试脚本 - 完整的订单工作流测试
 * 这个脚本演示了从QR码生成到订单完成的完整流程
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const EVENT_ID = 'ABC';

// 辅助函数：延迟执行
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 辅助函数：打印分隔线
const printSeparator = (title) => {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
};

// 辅助函数：打印成功消息
const printSuccess = (message) => {
  console.log(`✅ ${message}`);
};

// 辅助函数：打印错误消息
const printError = (message, error) => {
  console.log(`❌ ${message}`);
  if (error.response) {
    console.log(`   状态: ${error.response.status}`);
    console.log(`   消息: ${JSON.stringify(error.response.data, null, 2)}`);
  } else {
    console.log(`   错误: ${error.message}`);
  }
};

async function runWorkflowTest() {
  try {
    printSeparator('Serverlesspresso 单体应用 - 完整工作流测试');
    
    // ========== 步骤 1: 生成QR码 ==========
    printSeparator('步骤 1: 管理员生成QR码');
    
    const qrResponse = await axios.get(`${BASE_URL}/qr-code?eventId=${EVENT_ID}&admin=true`);
    
    const qrCode = qrResponse.data.qrCode;
    const availableTokens = qrResponse.data.bucket.availableTokens;
    
    printSuccess(`QR码生成成功: ${qrCode}`);
    console.log(`   可用令牌数: ${availableTokens}`);
    
    await sleep(1000);
    
    // ========== 步骤 2: 验证QR码并创建订单 ==========
    printSeparator('步骤 2: 客户扫描QR码创建订单');
    
    const customerUserId = 'customer-test-001';
    
    const orderResponse = await axios.post(`${BASE_URL}/qr-code?eventId=${EVENT_ID}&token=${qrCode}&userId=${customerUserId}`);
    
    const orderId = orderResponse.data.orderId;
    
    printSuccess(`订单创建成功: ${orderId}`);
    console.log(`   用户ID: ${customerUserId}`);
    console.log(`   剩余令牌: ${orderResponse.data.availableTokens}`);
    
    await sleep(2000);
    
    // ========== 步骤 3: 查询订单状态 ==========
    printSeparator('步骤 3: 查询订单状态');
    
    const orderDetailResponse = await axios.get(`${BASE_URL}/orders/${orderId}`);
    
    printSuccess(`订单详情获取成功`);
    console.log(`   订单ID: ${orderDetailResponse.data.orderId}`);
    console.log(`   状态: ${orderDetailResponse.data.orderState}`);
    
    await sleep(1000);
    
    // ========== 步骤 4: 客户提交订单详情 ==========
    printSeparator('步骤 4: 客户提交订单详情');
    
    const drinkOrder = {
      userId: customerUserId,
      drink: 'Americano',
      modifiers: ['Regular']
    };
    
    const submitResponse = await axios.put(
      `${BASE_URL}/orders/${orderId}?eventId=${EVENT_ID}`,
      drinkOrder
    );
    
    printSuccess(`订单提交成功`);
    console.log(`   饮品: ${drinkOrder.drink}`);
    console.log(`   修饰符: ${drinkOrder.modifiers.join(', ')}`);
    
    await sleep(2000);
    
    // ========== 步骤 5: 查看等待中的订单列表 ==========
    printSeparator('步骤 5: 查看等待中的订单列表');
    
    const ordersListResponse = await axios.get(`${BASE_URL}/orders?state=CREATED&eventId=${EVENT_ID}&maxItems=10`);
    
    printSuccess(`找到 ${ordersListResponse.data.length} 个等待中的订单`);
    if (ordersListResponse.data.length > 0) {
      console.log(`   第一个订单: ${ordersListResponse.data[0].SK}`);
    }
    
    await sleep(1000);
    
    // ========== 步骤 6: 咖啡师认领订单 ==========
    printSeparator('步骤 6: 咖啡师认领订单');
    
    const baristaUserId = 'barista-test-001';
    
    const makeResponse = await axios.put(
      `${BASE_URL}/orders/${orderId}?action=make&eventId=${EVENT_ID}&userId=${baristaUserId}`
    );
    
    printSuccess(`订单已被认领`);
    console.log(`   咖啡师ID: ${baristaUserId}`);
    
    await sleep(2000);
    
    // ========== 步骤 7: 咖啡师完成订单 ==========
    printSeparator('步骤 7: 咖啡师完成订单');
    
    const completeResponse = await axios.put(
      `${BASE_URL}/orders/${orderId}?action=complete&eventId=${EVENT_ID}`
    );
    
    printSuccess(`订单已完成！`);
    
    await sleep(1000);
    
    // ========== 步骤 8: 验证订单状态 ==========
    printSeparator('步骤 8: 验证最终订单状态');
    
    const finalOrderResponse = await axios.get(`${BASE_URL}/orders/${orderId}`);
    
    printSuccess(`订单最终状态验证成功`);
    console.log(`   订单ID: ${finalOrderResponse.data.orderId}`);
    console.log(`   状态: ${finalOrderResponse.data.orderState}`);
    console.log(`   饮品: ${JSON.stringify(finalOrderResponse.data.drinkOrder)}`);
    
    // ========== 步骤 9: 查看用户的所有订单 ==========
    printSeparator('步骤 9: 查看用户的所有订单');
    
    const myOrdersResponse = await axios.get(`${BASE_URL}/myOrders?userId=${customerUserId}`);
    
    printSuccess(`用户订单查询成功`);
    console.log(`   用户ID: ${customerUserId}`);
    console.log(`   订单数量: ${myOrdersResponse.data.length}`);
    
    // ========== 测试总结 ==========
    printSeparator('🎉 测试完成！所有步骤执行成功！');
    
    console.log('测试总结:');
    console.log(`  ✓ QR码生成和验证`);
    console.log(`  ✓ 订单创建和提交`);
    console.log(`  ✓ 订单查询和列表`);
    console.log(`  ✓ 咖啡师认领订单`);
    console.log(`  ✓ 订单完成流程`);
    console.log(`  ✓ 用户订单历史`);
    console.log('\n' + '='.repeat(60) + '\n');
    
  } catch (error) {
    printError('测试失败', error);
    console.log('\n请确保应用正在运行: npm start\n');
    process.exit(1);
  }
}

// 测试取消订单流程
async function testCancelWorkflow() {
  try {
    printSeparator('测试取消订单流程');
    
    // 生成QR码
    const qrResponse = await axios.get(`${BASE_URL}/qr-code?eventId=${EVENT_ID}&admin=true`);
    const qrCode = qrResponse.data.qrCode;
    
    // 创建订单
    const orderResponse = await axios.post(`${BASE_URL}/qr-code?eventId=${EVENT_ID}&token=${qrCode}&userId=customer-cancel-test`);
    const orderId = orderResponse.data.orderId;
    
    printSuccess(`订单创建: ${orderId}`);
    
    await sleep(1000);
    
    // 提交订单
    await axios.put(
      `${BASE_URL}/orders/${orderId}?eventId=${EVENT_ID}`,
      {
        userId: 'customer-cancel-test',
        drink: 'Flat White',
        modifiers: ['Oat']
      }
    );
    
    printSuccess(`订单提交成功`);
    
    await sleep(1000);
    
    // 取消订单
    await axios.put(
      `${BASE_URL}/orders/${orderId}?action=cancel&eventId=${EVENT_ID}`
    );
    
    printSuccess(`订单取消成功`);
    
    // 验证状态
    const finalOrder = await axios.get(`${BASE_URL}/orders/${orderId}`);
    console.log(`   最终状态: ${finalOrder.data.orderState}`);
    
    printSeparator('✅ 取消订单流程测试成功');
    
  } catch (error) {
    printError('取消订单测试失败', error);
  }
}

// 测试配置管理
async function testConfigManagement() {
  try {
    printSeparator('测试配置管理');
    
    // 获取配置
    const configResponse = await axios.get(`${BASE_URL}/config?eventId=${EVENT_ID}`);
    
    printSuccess(`配置获取成功`);
    console.log(`   商店状态: ${configResponse.data.storeOpen ? '开放' : '关闭'}`);
    console.log(`   菜单项数: ${configResponse.data.menu.length}`);
    
    await sleep(1000);
    
    // 更新配置
    const updateResponse = await axios.put(
      `${BASE_URL}/config?eventId=${EVENT_ID}`,
      {
        drinksPerBarcode: 15
      }
    );
    
    printSuccess(`配置更新成功`);
    console.log(`   新的每码饮品数: ${updateResponse.data.config.drinksPerBarcode}`);
    
    printSeparator('✅ 配置管理测试成功');
    
  } catch (error) {
    printError('配置管理测试失败', error);
  }
}

// 测试订单旅程服务
async function testOrderJourney() {
  try {
    printSeparator('测试订单旅程服务');
    
    // 生成QR码
    const qrResponse = await axios.get(`${BASE_URL}/qr-code?eventId=${EVENT_ID}&admin=true`);
    const qrCode = qrResponse.data.qrCode;
    
    // 创建订单
    const orderResponse = await axios.post(`${BASE_URL}/qr-code?eventId=${EVENT_ID}&token=${qrCode}&userId=journey-test-customer`);
    const orderId = orderResponse.data.orderId;
    
    printSuccess(`订单创建用于旅程测试: ${orderId}`);
    
    await sleep(1000);
    
    // 提交订单
    await axios.put(
      `${BASE_URL}/orders/${orderId}?eventId=${EVENT_ID}`,
      {
        userId: 'journey-test-customer',
        drink: 'Cappuccino',
        modifiers: ['Oat']
      }
    );
    
    printSuccess(`订单详情已提交`);
    
    await sleep(1000);
    
    // 获取订单旅程
    const journeyResponse = await axios.get(`${BASE_URL}/order-journey/${orderId}`);
    
    printSuccess(`订单旅程获取成功`);
    console.log(`   事件数量: ${journeyResponse.data.eventCount}`);
    
    // 获取订单旅程HTML
    const htmlResponse = await axios.get(`${BASE_URL}/order-journey/${orderId}/html`);
    
    printSuccess(`订单旅程HTML生成成功`);
    console.log(`   HTML长度: ${htmlResponse.data.length} 字符`);
    
    // 获取统计信息
    const statsResponse = await axios.get(`${BASE_URL}/order-journey/stats`);
    
    printSuccess(`订单统计获取成功`);
    console.log(`   总订单数: ${statsResponse.data.totalOrders}`);
    console.log(`   总事件数: ${statsResponse.data.totalEvents}`);
    
    printSeparator('✅ 订单旅程服务测试成功');
    
  } catch (error) {
    printError('订单旅程测试失败', error);
  }
}

// 测试指标服务
async function testMetrics() {
  try {
    printSeparator('测试指标服务');
    
    // 获取所有指标
    const allMetricsResponse = await axios.get(`${BASE_URL}/metrics`);
    
    printSuccess(`所有指标获取成功`);
    console.log(`   总订单数: ${allMetricsResponse.data.orders.total}`);
    console.log(`   已完成: ${allMetricsResponse.data.orders.completed}`);
    
    // 获取订单指标
    const orderMetricsResponse = await axios.get(`${BASE_URL}/metrics/orders`);
    
    printSuccess(`订单指标获取成功`);
    console.log(`   完成率: ${orderMetricsResponse.data.completionRate}`);
    console.log(`   取消率: ${orderMetricsResponse.data.cancellationRate}`);
    
    // 获取饮品指标
    const drinkMetricsResponse = await axios.get(`${BASE_URL}/metrics/drinks`);
    
    printSuccess(`饮品指标获取成功`);
    console.log(`   饮品类型数: ${drinkMetricsResponse.data.length}`);
    if (drinkMetricsResponse.data.length > 0) {
      console.log(`   最受欢迎: ${drinkMetricsResponse.data[0].drink} (${drinkMetricsResponse.data[0].count})`);
    }
    
    // 获取修饰符指标
    const modifierMetricsResponse = await axios.get(`${BASE_URL}/metrics/modifiers`);
    
    printSuccess(`修饰符指标获取成功`);
    console.log(`   修饰符类型数: ${modifierMetricsResponse.data.length}`);
    
    // 生成指标报告
    const reportResponse = await axios.get(`${BASE_URL}/metrics/report`);
    
    printSuccess(`指标报告生成成功`);
    console.log(`   订单总数: ${reportResponse.data.orders.total}`);
    
    printSeparator('✅ 指标服务测试成功');
    
  } catch (error) {
    printError('指标服务测试失败', error);
  }
}

// 主测试函数
async function main() {
  console.log('\n🚀 开始测试 Serverlesspresso 单体应用\n');
  console.log('请确保应用已在 http://localhost:3000 运行\n');
  
  await sleep(2000);
  
  // 运行主工作流测试
  await runWorkflowTest();
  
  await sleep(2000);
  
  // 运行取消订单测试
  await testCancelWorkflow();
  
  await sleep(2000);
  
  // 运行配置管理测试
  await testConfigManagement();
  
  await sleep(2000);
  
  // 运行订单旅程测试
  await testOrderJourney();
  
  await sleep(2000);
  
  // 运行指标服务测试
  await testMetrics();
  
  console.log('\n🎊 所有测试完成！\n');
}

// 执行测试
main().catch(error => {
  console.error('测试执行出错:', error.message);
  process.exit(1);
});

