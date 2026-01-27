# presso 咖啡系统 - 快速入门指南 🚀

本指南将帮助你在5分钟内启动并运行presso咖啡订单管理系统。

## 第一步：准备AWS环境 ☁️

### 1.1 配置AWS凭证

选择以下任一方式配置：

**方式一：使用AWS CLI（推荐）**
```bash
aws configure
```
按提示输入：
- AWS Access Key ID
- AWS Secret Access Key
- Default region name（建议：us-west-2）
- Default output format（直接回车）

**方式二：设置环境变量**
```bash
export AWS_ACCESS_KEY_ID=你的访问密钥ID
export AWS_SECRET_ACCESS_KEY=你的访问密钥
export AWS_REGION=us-west-2
```

### 1.2 创建DynamoDB表

我们为你准备了自动化脚本！

**Linux/Mac用户：**
```bash
cd monolith-app
chmod +x scripts/create-dynamodb-tables.sh
./scripts/create-dynamodb-tables.sh
```

**Windows用户：**
```bash
cd monolith-app
scripts\create-dynamodb-tables.bat
```

> 💡 这将创建6张DynamoDB表，使用按需计费模式，你只需为实际使用付费。

## 第二步：安装依赖 📦

```bash
# 确保你在 monolith-app 目录中
npm install
```

这将安装所有必要的依赖包，包括：
- AWS SDK（连接DynamoDB）
- JWT（用户认证）
- bcryptjs（密码加密）
- Express（Web框架）
- 等等...

## 第三步：启动应用 🎉

```bash
npm start
```

看到以下输出表示启动成功：
```
🚀 应用已启动
📍 服务地址: http://localhost:3000
```

## 第四步：测试功能 ✅

### 4.1 注册管理员账号

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "role": "admin"
  }'
```

保存返回的`token`，你将需要它！

### 4.2 注册普通用户

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "customer1",
    "password": "password123",
    "role": "user"
  }'
```

同样保存返回的`token`。

### 4.3 生成QR码（使用管理员token）

```bash
curl http://localhost:3000/qr-code?eventId=ABC \
  -H "Authorization: Bearer 你的管理员TOKEN"
```

保存返回的`qrCode`值。

### 4.4 创建订单（使用用户token）

```bash
curl -X POST "http://localhost:3000/qr-code?eventId=ABC&token=刚才的QR码" \
  -H "Authorization: Bearer 你的用户TOKEN"
```

### 4.5 查看我的订单

```bash
curl http://localhost:3000/myOrders \
  -H "Authorization: Bearer 你的用户TOKEN"
```

## 常见问题 ❓

### Q: 启动时报错"Unable to connect to DynamoDB"
**A:** 检查：
1. AWS凭证是否正确配置
2. DynamoDB表是否已创建
3. AWS区域设置是否正确

### Q: 登录后Token无效
**A:** 确保：
1. Token格式为 `Bearer <token>`
2. Token没有过期（默认24小时）
3. 复制token时没有多余的空格

### Q: 管理员权限被拒绝
**A:** 确认：
1. 注册时`role`设置为`"admin"`
2. 使用的是管理员账号的token

### Q: 表已存在但应用报错
**A:** 等待几秒钟，DynamoDB表创建后需要时间变为可用状态。

## 下一步 🎯

✅ **查看完整文档**: 阅读`README.md`了解所有API和功能  
✅ **运行测试**: 执行`npm test`运行自动化测试  
✅ **自定义配置**: 复制`env.example`为`.env`并修改配置  
✅ **探索代码**: 查看`services/`目录了解各个服务的实现

## 获取帮助 💬

- 查看控制台日志了解详细错误信息
- 检查`README.md`中的故障排查部分
- 确保所有DynamoDB表都已正确创建

---

**祝你使用愉快！☕**

