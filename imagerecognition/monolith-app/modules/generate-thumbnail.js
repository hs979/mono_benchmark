// 使用 ImageMagick（指定安装路径）
const gm = require('gm').subClass({ 
    imageMagick: true,
    appPath: 'D:\\ImageMagick\\ImageMagick-7.1.2-Q16-HDRI\\'
});
const fs = require('fs');
const path = require('path');
const util = require('util');

// 缩略图尺寸限制
const MAX_WIDTH = 250;
const MAX_HEIGHT = 250;

/**
 * 生成图片缩略图
 * @param {string} filePath - 原图路径
 * @param {Object} metadata - 图片元数据
 * @param {string} fileName - 文件名
 * @returns {Promise<Object>} 缩略图信息
 */
async function generateThumbnail(filePath, metadata, fileName) {
    try {
        console.log(`生成缩略图: ${filePath}`);

        const size = metadata.dimensions;
        const format = metadata.format;

        // 计算缩放比例
        const scalingFactor = Math.min(
            MAX_WIDTH / size.width,
            MAX_HEIGHT / size.height
        );
        const width = Math.round(scalingFactor * size.width);
        const height = Math.round(scalingFactor * size.height);

        console.log(`缩略图尺寸: ${width} x ${height}`);

        // 生成缩略图
        const thumbnailBuffer = await resizeImage(filePath, width, height, format);

        // 保存缩略图
        const thumbnailDir = path.join(__dirname, '../uploads/thumbnails');
        if (!fs.existsSync(thumbnailDir)) {
            fs.mkdirSync(thumbnailDir, { recursive: true });
        }

        const thumbnailFileName = `thumb_${fileName}`;
        const thumbnailPath = path.join(thumbnailDir, thumbnailFileName);
        
        fs.writeFileSync(thumbnailPath, thumbnailBuffer);
        console.log(`缩略图已保存: ${thumbnailPath}`);

        return {
            path: thumbnailPath,
            fileName: thumbnailFileName,
            width: width,
            height: height
        };

    } catch (error) {
        console.error('生成缩略图失败:', error);
        throw error;
    }
}

/**
 * 调整图片尺寸
 * @param {string} filePath - 图片路径
 * @param {number} width - 目标宽度
 * @param {number} height - 目标高度
 * @param {string} format - 图片格式
 * @returns {Promise<Buffer>} 缩略图Buffer
 */
function resizeImage(filePath, width, height, format) {
    return new Promise((resolve, reject) => {
        gm(filePath)
            .resize(width, height)
            .toBuffer(format, (err, buffer) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(buffer);
                }
            });
    });
}

module.exports = generateThumbnail;

