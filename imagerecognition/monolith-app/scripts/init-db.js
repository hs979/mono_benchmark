/**
 * DynamoDB 表初始化脚本
 * 用于创建图像识别应用所需的 DynamoDB 表
 * 
 * 使用方法：
 *   node scripts/init-db.js
 *   或
 *   npm run init-db
 */

const AWS = require('aws-sdk');

// 配置 AWS SDK
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1'
});

// 如果提供了访问密钥
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
}

const dynamoDBClient = new AWS.DynamoDB();

// 表名配置（可通过环境变量自定义）
const TABLES = {
    USERS: process.env.DYNAMODB_USERS_TABLE || 'ImageRecognition-Users',
    ALBUMS: process.env.DYNAMODB_ALBUMS_TABLE || 'ImageRecognition-Albums',
    PHOTOS: process.env.DYNAMODB_PHOTOS_TABLE || 'ImageRecognition-Photos'
};

/**
 * 检查表是否存在
 */
async function tableExists(tableName) {
    try {
        await dynamoDBClient.describeTable({ TableName: tableName }).promise();
        return true;
    } catch (error) {
        if (error.code === 'ResourceNotFoundException') {
            return false;
        }
        throw error;
    }
}

/**
 * 等待表变为 ACTIVE 状态
 */
async function waitForTable(tableName) {
    console.log(`  等待表 ${tableName} 变为 ACTIVE 状态...`);
    await dynamoDBClient.waitFor('tableExists', { TableName: tableName }).promise();
    console.log(`  ✓ 表 ${tableName} 已准备就绪`);
}

/**
 * 创建 Users 表
 */
async function createUsersTable() {
    console.log(`\n[1/3] Users 表`);
    
    if (await tableExists(TABLES.USERS)) {
        console.log(`  ✓ 表已存在: ${TABLES.USERS}`);
        return;
    }
    
    console.log(`  创建表: ${TABLES.USERS}`);
    await dynamoDBClient.createTable({
        TableName: TABLES.USERS,
        KeySchema: [
            { AttributeName: 'username', KeyType: 'HASH' }  // Partition key
        ],
        AttributeDefinitions: [
            { AttributeName: 'username', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST'  // 按需付费模式
    }).promise();
    
    await waitForTable(TABLES.USERS);
}

/**
 * 创建 Albums 表
 */
async function createAlbumsTable() {
    console.log(`\n[2/3] Albums 表`);
    
    if (await tableExists(TABLES.ALBUMS)) {
        console.log(`  ✓ 表已存在: ${TABLES.ALBUMS}`);
        return;
    }
    
    console.log(`  创建表: ${TABLES.ALBUMS}`);
    await dynamoDBClient.createTable({
        TableName: TABLES.ALBUMS,
        KeySchema: [
            { AttributeName: 'id', KeyType: 'HASH' }  // Partition key
        ],
        AttributeDefinitions: [
            { AttributeName: 'id', AttributeType: 'S' },
            { AttributeName: 'owner', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'OwnerIndex',
                KeySchema: [
                    { AttributeName: 'owner', KeyType: 'HASH' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    }).promise();
    
    await waitForTable(TABLES.ALBUMS);
}

/**
 * 创建 Photos 表
 */
async function createPhotosTable() {
    console.log(`\n[3/3] Photos 表`);
    
    if (await tableExists(TABLES.PHOTOS)) {
        console.log(`  ✓ 表已存在: ${TABLES.PHOTOS}`);
        return;
    }
    
    console.log(`  创建表: ${TABLES.PHOTOS}`);
    await dynamoDBClient.createTable({
        TableName: TABLES.PHOTOS,
        KeySchema: [
            { AttributeName: 'id', KeyType: 'HASH' }  // Partition key
        ],
        AttributeDefinitions: [
            { AttributeName: 'id', AttributeType: 'S' },
            { AttributeName: 'albumId', AttributeType: 'S' },
            { AttributeName: 'uploadTime', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'AlbumIndex',
                KeySchema: [
                    { AttributeName: 'albumId', KeyType: 'HASH' },
                    { AttributeName: 'uploadTime', KeyType: 'RANGE' }
                ],
                Projection: { ProjectionType: 'ALL' }
            }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    }).promise();
    
    await waitForTable(TABLES.PHOTOS);
}

/**
 * 主函数
 */
async function main() {
    console.log('========================================');
    console.log('图像识别应用 - DynamoDB 表初始化');
    console.log('========================================');
    console.log(`区域: ${AWS.config.region}`);
    console.log('');
    
    try {
        // 创建所有表
        await createUsersTable();
        await createAlbumsTable();
        await createPhotosTable();
        
        console.log('\n========================================');
        console.log('✓ 所有表初始化完成！');
        console.log('========================================');
        console.log('\n创建的表：');
        console.log(`  - ${TABLES.USERS} (用户表)`);
        console.log(`  - ${TABLES.ALBUMS} (相册表，含 OwnerIndex)`);
        console.log(`  - ${TABLES.PHOTOS} (照片表，含 AlbumIndex)`);
        console.log('\n提示: 现在可以启动应用了！');
        
    } catch (error) {
        console.error('\n❌ 初始化失败:', error.message);
        
        if (error.code === 'UnrecognizedClientException') {
            console.error('提示: 请检查 AWS 凭证配置');
        } else if (error.code === 'NetworkingError') {
            console.error('提示: 网络连接失败，请检查网络设置和 AWS 区域配置');
        }
        
        process.exit(1);
    }
}

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = {
    createUsersTable,
    createAlbumsTable,
    createPhotosTable,
    TABLES
};
