// 使用 ImageMagick（指定安装路径）
const gm = require('gm').subClass({ 
    imageMagick: true,
    appPath: 'D:\\ImageMagick\\ImageMagick-7.1.2-Q16-HDRI\\'
});
const fs = require('fs');
const util = require('util');
const Promise = require('bluebird');

// Promisify gm methods
Promise.promisifyAll(gm.prototype);

/**
 * 提取图片元数据
 * @param {string} filePath - 图片文件路径
 * @returns {Promise<Object>} 图片元数据
 */
async function extractMetadata(filePath) {
    try {
        console.log(`提取元数据: ${filePath}`);

        // 读取文件
        const fileBuffer = fs.readFileSync(filePath);

        // 使用 ImageMagick 识别图片信息
        const metadata = await gm(fileBuffer).identifyAsync();

        console.log("识别的元数据:", util.inspect(metadata, { depth: 3 }));

        return metadata;

    } catch (error) {
        console.error('提取元数据失败:', error);
        throw new Error(`ImageIdentifyError: ${error.message}`);
    }
}

module.exports = extractMetadata;

