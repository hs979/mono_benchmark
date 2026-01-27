// 配置文件：定义API服务器地址和认证设置
export default {
  apiGateway: {
    REGION: "us-east-1",
    // 使用相对路径，所有API请求都会发送到 /api 路径
    // 开发环境：http://localhost:3000/api
    // 生产环境：使用部署的域名 + /api
    API_URL: process.env.REACT_APP_API_URL || "/api",
  },
  cognito: {
    REGION: "us-east-1",
    // 注意：单体应用使用简化的认证机制（通过x-customer-id请求头）
    // 以下配置仅在需要AWS Cognito认证时使用
    USER_POOL_ID: process.env.REACT_APP_USER_POOL_ID || "",
    APP_CLIENT_ID: process.env.REACT_APP_APP_CLIENT_ID || "",
    IDENTITY_POOL_ID: process.env.REACT_APP_IDENTITY_POOL_ID || ""
  }
};
