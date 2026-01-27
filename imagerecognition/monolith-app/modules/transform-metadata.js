const util = require('util');

/**
 * 转换和规范化元数据格式
 * @param {Object} rawMetadata - 原始元数据
 * @returns {Object} 转换后的元数据
 */
function transformMetadata(rawMetadata) {
    console.log("转换元数据:", util.inspect(rawMetadata, { depth: 3 }));

    const result = {};

    // 严格遵循原 serverless 版本逻辑：
    // 只有当 Properties 存在时，才提取所有字段
    if (rawMetadata.Properties) {
        // 提取创建时间
        if (rawMetadata.Properties["exif:DateTimeOriginal"]) {
            result.creationTime = rawMetadata.Properties["exif:DateTimeOriginal"];
        }

        // 提取地理位置信息
        if (rawMetadata.Properties["exif:GPSLatitude"] && 
            rawMetadata.Properties["exif:GPSLatitudeRef"] && 
            rawMetadata.Properties["exif:GPSLongitude"] && 
            rawMetadata.Properties["exif:GPSLongitudeRef"]) {
            try {
                const lat = parseCoordinate(
                    rawMetadata.Properties["exif:GPSLatitude"], 
                    rawMetadata.Properties["exif:GPSLatitudeRef"]
                );
                const long = parseCoordinate(
                    rawMetadata.Properties["exif:GPSLongitude"], 
                    rawMetadata.Properties["exif:GPSLongitudeRef"]
                );
                
                console.log("解析的纬度:", lat);
                console.log("解析的经度:", long);
                
                result.geo = {
                    latitude: lat, 
                    longitude: long
                };
            } catch (err) {
                // 忽略坐标解析失败
                console.log("解析地理坐标失败:", err.message);
            }
        }

        // 提取相机制造商
        if (rawMetadata.Properties["exif:Make"]) {
            result.exifMake = rawMetadata.Properties["exif:Make"];
        }

        // 提取相机型号
        if (rawMetadata.Properties["exif:Model"]) {
            result.exifModel = rawMetadata.Properties["exif:Model"];
        }

        // 与原版一致：在 Properties 条件内提取基本字段
        result.dimensions = rawMetadata.size || { width: 0, height: 0 };
        result.fileSize = rawMetadata.Filesize || rawMetadata.filesize || 0;
        result.format = rawMetadata.format || 'UNKNOWN';
    }
    
    console.log("转换后的元数据:", util.inspect(result, { depth: 3 }));

    return result;
}

/**
 * 解析GPS坐标
 * @param {string} coordinate - 坐标字符串 (格式: "DDD/number, MM/number, SSSS/number")
 * @param {string} coordinateDirection - 方向 (N, S, E, W)
 * @returns {Object} 解析后的坐标
 */
function parseCoordinate(coordinate, coordinateDirection) {
    const degreeArray = coordinate.split(",")[0].trim().split("/");
    const minuteArray = coordinate.split(",")[1].trim().split("/");
    const secondArray = coordinate.split(",")[2].trim().split("/");

    return {
        D: parseInt(degreeArray[0]) / parseInt(degreeArray[1]),
        M: parseInt(minuteArray[0]) / parseInt(minuteArray[1]),
        S: parseInt(secondArray[0]) / parseInt(secondArray[1]),
        Direction: coordinateDirection
    };
}

module.exports = transformMetadata;

