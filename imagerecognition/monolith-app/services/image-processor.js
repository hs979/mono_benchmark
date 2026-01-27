const extractMetadata = require('../modules/extract-metadata');
const transformMetadata = require('../modules/transform-metadata');
const generateThumbnail = require('../modules/generate-thumbnail');
const detectLabels = require('../modules/detect-labels');

async function processImage(input) {
    const { photoId, filePath, fileName, userId, albumId } = input;

    console.log(`开始处理图片: ${photoId}`);

    try {
        // 步骤1: 提取图片元数据
        console.log(`[步骤1] 提取元数据...`);
        const rawMetadata = await extractMetadata(filePath);

        // 步骤2: 验证图片格式
        console.log(`[步骤2] 验证图片格式...`);
        const supportedFormats = ['JPEG', 'PNG'];
        if (!supportedFormats.includes(rawMetadata.format)) {
            throw new Error(`不支持的图片格式: ${rawMetadata.format}. 仅支持 JPEG 和 PNG`);
        }

        // 步骤3: 转换元数据格式
        console.log(`[步骤3] 转换元数据...`);
        const metadata = transformMetadata(rawMetadata);

        // 步骤4: 并行处理 - 同时执行缩略图生成和物体识别
        console.log(`[步骤4] 并行处理: 生成缩略图 & 物体识别...`);
        
        const parallelTasks = [
            // 分支A: 物体识别
            detectLabels(filePath).catch(err => {
                console.warn('物体识别失败（将继续处理）:', err.message);
                return [];
            }),
            // 分支B: 生成缩略图
            generateThumbnail(filePath, metadata, fileName).catch(err => {
                console.warn('生成缩略图失败（将继续处理）:', err.message);
                return null;
            })
        ];

        const [rekognitionLabels, thumbnailInfo] = await Promise.all(parallelTasks);

        // 步骤5: 组装最终结果
        console.log(`[步骤5] 组装处理结果...`);
        const result = {
            id: photoId,
            userId: userId,
            albumId: albumId,
            fileName: fileName,
            filePath: filePath,
            metadata: metadata,
            thumbnailInfo: thumbnailInfo,
            rekognitionLabels: rekognitionLabels,
            processingStatus: 'SUCCEEDED',
            processedAt: new Date().toISOString()
        };

        console.log(`图片处理完成: ${photoId}`);
        return result;

    } catch (error) {
        console.error(`图片处理失败: ${photoId}`, error);
        throw error;
    }
}

module.exports = {
    processImage
};

