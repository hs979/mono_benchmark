/**
 * 数据库访问层入口
 * 使用 Amazon DynamoDB 作为数据存储
 */

const database = require('./dynamodb');

console.log('使用数据库: Amazon DynamoDB');

// 初始化 DynamoDB 表
database.initializeTables().catch(error => {
    console.error('初始化 DynamoDB 表失败:', error);
    console.error('请确保 AWS 凭证配置正确，并且有创建表的权限');
    console.error('');
    console.error('配置方法:');
    console.error('  1. 运行: aws configure');
    console.error('  2. 或设置环境变量: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION');
});

// 导出数据库访问层
module.exports = database;

