/**
 * DynamoDB 数据访问层
 * 
 * 注意：表创建请使用 scripts/init-db.js 或运行 npm run init-db
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// 配置 AWS SDK
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1'
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();

// 表名配置（可通过环境变量自定义）
const TABLES = {
    USERS: process.env.DYNAMODB_USERS_TABLE || 'ImageRecognition-Users',
    ALBUMS: process.env.DYNAMODB_ALBUMS_TABLE || 'ImageRecognition-Albums',
    PHOTOS: process.env.DYNAMODB_PHOTOS_TABLE || 'ImageRecognition-Photos'
};

// ============================================================================
// 用户相关函数
// ============================================================================

/**
 * 创建新用户
 * @param {Object} userData - 用户数据 { username, email, password }
 * @returns {Promise<Object>} 创建的用户信息
 */
async function createUser(userData) {
    const { username, email, password } = userData;
    
    // 检查用户是否已存在
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
        throw new Error('用户名已存在');
    }

    const user = {
        username,
        email,
        password,  // 已经是哈希后的密码
        id: username,  // 使用 username 作为 id（方便兼容）
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const params = {
        TableName: TABLES.USERS,
        Item: user,
        ConditionExpression: 'attribute_not_exists(username)'  // 确保不会覆盖已存在的用户
    };

    try {
        await dynamoDB.put(params).promise();
        console.log(`用户创建成功: ${username}`);
        
        // 返回格式与 SQLite 版本一致
        return {
            id: username,
            username,
            email
        };
    } catch (error) {
        if (error.code === 'ConditionalCheckFailedException') {
            throw new Error('用户名已存在');
        }
        throw error;
    }
}

/**
 * 根据用户名查找用户
 * @param {string} username - 用户名
 * @returns {Promise<Object|null>} 用户信息或 null
 */
async function findUserByUsername(username) {
    const params = {
        TableName: TABLES.USERS,
        Key: { username }
    };

    try {
        const result = await dynamoDB.get(params).promise();
        return result.Item || null;
    } catch (error) {
        console.error('查找用户失败:', error);
        throw error;
    }
}

/**
 * 根据用户名查找用户（别名，兼容旧接口）
 * @param {string} username - 用户名
 * @returns {Promise<Object|null>} 用户信息或 null
 */
async function getUserByUsername(username) {
    return findUserByUsername(username);
}

/**
 * 根据 ID 查找用户（在我们的设计中，ID 就是 username）
 * @param {string} id - 用户ID（username）
 * @returns {Promise<Object|null>} 用户信息或 null
 */
async function findUserById(id) {
    return findUserByUsername(id);
}

// ============================================================================
// 相册相关函数
// ============================================================================

/**
 * 创建相册
 * @param {Object} albumData - 相册数据 { name, owner, userId }
 * @returns {Promise<Object>} 创建的相册信息
 */
async function createAlbum(albumData) {
    const { name, owner, userId } = albumData;
    const id = uuidv4();

    const album = {
        id,
        name,
        owner,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const params = {
        TableName: TABLES.ALBUMS,
        Item: album
    };

    try {
        await dynamoDB.put(params).promise();
        console.log(`相册创建成功: ${name} (${id})`);
        return album;
    } catch (error) {
        console.error('创建相册失败:', error);
        throw error;
    }
}

/**
 * 根据用户列出相册
 * @param {string} userId - 用户ID（username）
 * @param {number} limit - 限制数量
 * @returns {Promise<Array>} 相册列表
 */
async function listAlbumsByUser(userId, limit = 999) {
    const params = {
        TableName: TABLES.ALBUMS,
        IndexName: 'OwnerIndex',
        KeyConditionExpression: '#owner = :owner',
        ExpressionAttributeNames: {
            '#owner': 'owner'
        },
        ExpressionAttributeValues: {
            ':owner': userId
        },
        Limit: limit
    };

    try {
        const result = await dynamoDB.query(params).promise();
        
        // 转换字段名以兼容前端
        const albums = result.Items.map(item => ({
            id: item.id,
            name: item.name,
            owner: item.owner,
            userId: item.userId,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
        }));

        return albums;
    } catch (error) {
        console.error('列出相册失败:', error);
        throw error;
    }
}

/**
 * 获取相册详情
 * @param {string} albumId - 相册ID
 * @returns {Promise<Object|null>} 相册信息或 null
 */
async function getAlbum(albumId) {
    const params = {
        TableName: TABLES.ALBUMS,
        Key: { id: albumId }
    };

    try {
        const result = await dynamoDB.get(params).promise();
        
        if (!result.Item) {
            return null;
        }

        // 转换字段名以兼容前端
        return {
            id: result.Item.id,
            name: result.Item.name,
            owner: result.Item.owner,
            userId: result.Item.userId,
            createdAt: result.Item.createdAt,
            updatedAt: result.Item.updatedAt
        };
    } catch (error) {
        console.error('获取相册详情失败:', error);
        throw error;
    }
}

/**
 * 删除相册
 * @param {string} albumId - 相册ID
 * @returns {Promise<void>}
 */
async function deleteAlbum(albumId) {
    const params = {
        TableName: TABLES.ALBUMS,
        Key: { id: albumId }
    };

    try {
        await dynamoDB.delete(params).promise();
        console.log(`相册删除成功: ${albumId}`);
    } catch (error) {
        console.error('删除相册失败:', error);
        throw error;
    }
}

// ============================================================================
// 照片相关函数
// ============================================================================

/**
 * 保存图片信息
 * @param {Object} photoData - 图片数据
 * @returns {Promise<Object>} 保存结果
 */
async function savePhoto(photoData) {
    const {
        id, userId, albumId, fileName, filePath,
        metadata, thumbnailInfo, rekognitionLabels
    } = photoData;

    const photo = {
        id,
        userId,
        albumId,
        fileName,
        filePath,
        uploadTime: new Date().toISOString(),
        
        // 格式和尺寸信息
        format: metadata.format,
        fileSize: metadata.fileSize,
        width: metadata.dimensions.width,
        height: metadata.dimensions.height,
        
        // 缩略图信息
        thumbnailPath: thumbnailInfo ? thumbnailInfo.path : null,
        thumbnailWidth: thumbnailInfo ? thumbnailInfo.width : null,
        thumbnailHeight: thumbnailInfo ? thumbnailInfo.height : null,
        
        // EXIF 信息
        exifMake: metadata.exifMake || null,
        exifModel: metadata.exifModel || null,
        creationTime: metadata.creationTime || null,
        
        // 地理位置信息（如果有）
        geoLocation: metadata.geo ? {
            latitude: metadata.geo.latitude,
            longitude: metadata.geo.longitude
        } : null,
        
        // 识别的标签
        detectedLabels: rekognitionLabels || [],
        
        // 处理状态
        processingStatus: 'SUCCEEDED'
    };

    const params = {
        TableName: TABLES.PHOTOS,
        Item: photo
    };

    try {
        await dynamoDB.put(params).promise();
        console.log(`图片信息保存成功: ${id}`);
        return { id };
    } catch (error) {
        console.error('保存图片信息失败:', error);
        throw error;
    }
}

/**
 * 关联照片到相册（DynamoDB 中这个操作已经在 savePhoto 中完成）
 * @param {string} albumId - 相册ID
 * @param {string} photoId - 照片ID
 * @param {string} userId - 用户ID
 * @returns {Promise<void>}
 */
async function addPhotoToAlbum(albumId, photoId, userId) {
    // 在 DynamoDB 版本中，照片已经包含了 albumId
    // 这个函数保留是为了兼容性，实际不需要额外操作
    console.log(`照片 ${photoId} 已关联到相册 ${albumId}`);
    return Promise.resolve();
}

/**
 * 列出相册中的照片
 * @param {string} albumId - 相册ID
 * @param {number} limit - 限制数量
 * @param {number} offset - 偏移量（注意：DynamoDB 不直接支持 offset，这里用 LastEvaluatedKey 实现）
 * @returns {Promise<Array>} 照片列表
 */
async function listPhotosByAlbum(albumId, limit = 20, offset = 0) {
    const params = {
        TableName: TABLES.PHOTOS,
        IndexName: 'AlbumIndex',
        KeyConditionExpression: 'albumId = :albumId',
        ExpressionAttributeValues: {
            ':albumId': albumId
        },
        Limit: limit,
        ScanIndexForward: false  // 倒序排列（最新的在前）
    };

    try {
        const result = await dynamoDB.query(params).promise();
        
        // 转换数据格式以匹配前端需求
        const photos = result.Items.map(item => {
            // 解析标签数据
            let labels = [];
            if (item.detectedLabels && Array.isArray(item.detectedLabels)) {
                labels = item.detectedLabels.map(label => 
                    typeof label === 'string' ? label : label.Name
                );
            }

            return {
                id: item.id,
                albumId: item.albumId,
                uploadTime: item.uploadTime,
                ProcessingStatus: item.processingStatus || 'SUCCEEDED',
                fullsize: {
                    width: item.width,
                    height: item.height,
                    key: item.fileName
                },
                thumbnail: item.thumbnailPath ? {
                    key: item.thumbnailPath,
                    width: item.thumbnailWidth,
                    height: item.thumbnailHeight
                } : null,
                objectDetected: labels,
                geoLocation: item.geoLocation ? {
                    Latitude: item.geoLocation.latitude,
                    Longtitude: item.geoLocation.longitude
                } : null,
                exifMake: item.exifMake,
                exifModel: item.exifModel
            };
        });

        return photos;
    } catch (error) {
        console.error('列出相册照片失败:', error);
        throw error;
    }
}

/**
 * 列出所有图片
 * @param {number} limit - 限制数量
 * @param {number} offset - 偏移量
 * @returns {Promise<Array>} 照片列表
 */
async function listPhotos(limit = 50, offset = 0) {
    const params = {
        TableName: TABLES.PHOTOS,
        Limit: limit
    };

    try {
        const result = await dynamoDB.scan(params).promise();
        
        const photos = result.Items.map(item => ({
            id: item.id,
            userId: item.userId,
            albumId: item.albumId,
            fileName: item.fileName,
            filePath: item.filePath,
            uploadTime: item.uploadTime,
            format: item.format,
            fileSize: item.fileSize,
            width: item.width,
            height: item.height,
            thumbnailPath: item.thumbnailPath,
            thumbnailWidth: item.thumbnailWidth,
            thumbnailHeight: item.thumbnailHeight,
            exifMake: item.exifMake,
            exifModel: item.exifModel,
            creationTime: item.creationTime,
            detectedLabels: item.detectedLabels || [],
            processingStatus: item.processingStatus || 'SUCCEEDED'
        }));

        return photos;
    } catch (error) {
        console.error('列出所有照片失败:', error);
        throw error;
    }
}

/**
 * 获取单个图片信息
 * @param {string} id - 图片ID
 * @returns {Promise<Object|null>} 图片信息或 null
 */
async function getPhoto(id) {
    const params = {
        TableName: TABLES.PHOTOS,
        Key: { id }
    };

    try {
        const result = await dynamoDB.get(params).promise();
        
        if (!result.Item) {
            return null;
        }

        const item = result.Item;

        return {
            id: item.id,
            userId: item.userId,
            albumId: item.albumId,
            fileName: item.fileName,
            filePath: item.filePath,
            uploadTime: item.uploadTime,
            format: item.format,
            fileSize: item.fileSize,
            width: item.width,
            height: item.height,
            thumbnailPath: item.thumbnailPath,
            thumbnailWidth: item.thumbnailWidth,
            thumbnailHeight: item.thumbnailHeight,
            exifMake: item.exifMake,
            exifModel: item.exifModel,
            creationTime: item.creationTime,
            detectedLabels: item.detectedLabels || [],
            geoLocation: item.geoLocation,
            processingStatus: item.processingStatus || 'SUCCEEDED'
        };
    } catch (error) {
        console.error('获取图片信息失败:', error);
        throw error;
    }
}

// ============================================================================
// 其他函数
// ============================================================================

/**
 * 关闭连接（DynamoDB 不需要显式关闭连接）
 * 这个函数保留是为了兼容性
 */
function close() {
    console.log('DynamoDB 客户端不需要显式关闭连接');
    return Promise.resolve();
}

// ============================================================================
// 导出所有函数
// ============================================================================

module.exports = {
    // User functions
    createUser,
    findUserByUsername,
    getUserByUsername,
    findUserById,
    
    // Album functions
    createAlbum,
    listAlbumsByUser,
    getAlbum,
    deleteAlbum,
    addPhotoToAlbum,
    listPhotosByAlbum,
    
    // Photo functions
    savePhoto,
    listPhotos,
    getPhoto,
    
    // General
    close,
    
    // 导出表名配置（用于测试和调试）
    TABLES
};

