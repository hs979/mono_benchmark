const fs = require('fs');
const util = require('util');

/**
 * 检测图片中的物体标签
 * 
 * 注意：此函数需要AWS Rekognition服务
 * 如果没有配置AWS凭证，将返回模拟数据
 * 
 * @param {string} filePath - 图片路径
 * @returns {Promise<Array>} 检测到的标签列表
 */
async function detectLabels(filePath) {
    console.log(`物体识别: ${filePath}`);

    try {
        // 尝试加载AWS SDK
        const AWS = require('aws-sdk');
        
        // 检查是否配置了AWS凭证
        const credentials = AWS.config.credentials;
        if (!credentials || !credentials.accessKeyId) {
            console.warn('未配置AWS凭证，使用模拟数据');
            return getMockLabels();
        }

        // 使用AWS Rekognition服务
        const rekognition = new AWS.Rekognition({ region: process.env.AWS_REGION || 'us-east-1' });

        // 读取图片文件
        const imageBuffer = fs.readFileSync(filePath);

        const params = {
            Image: {
                Bytes: imageBuffer
            },
            MaxLabels: 10,
            MinConfidence: 60
        };

        console.log('调用AWS Rekognition服务...');
        const result = await rekognition.detectLabels(params).promise();
        
        console.log(`识别到 ${result.Labels.length} 个标签`);
        return result.Labels;

    } catch (error) {
        console.warn(`AWS Rekognition调用失败: ${error.message}`);
        console.warn('返回模拟数据');
        return getMockLabels();
    }
}

/**
 * 获取模拟的标签数据
 * 用于在没有AWS凭证时测试
 */
function getMockLabels() {
    return [
        { Name: 'Photo', Confidence: 99.5 },
        { Name: 'Image', Confidence: 98.3 },
        { Name: 'Picture', Confidence: 95.7 }
    ];
}

module.exports = detectLabels;

