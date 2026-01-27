/**
 * API服务
 * 替换AWS Amplify的API和Storage模块
 */

import { getApiClient } from './authService';

const apiClient = getApiClient();

/**
 * 相册相关API
 */
export const albumAPI = {
    // 创建相册
    create: async (name) => {
        const response = await apiClient.post('/api/albums', { name });
        return response.data;
    },

    // 获取所有相册
    list: async (limit = 999) => {
        const response = await apiClient.get('/api/albums', {
            params: { limit }
        });
        return response.data;
    },

    // 获取相册详情
    get: async (albumId) => {
        const response = await apiClient.get(`/api/albums/${albumId}`);
        return response.data;
    },

    // 获取相册的照片列表
    listPhotos: async (albumId, limit = 20, offset = 0) => {
        const response = await apiClient.get(`/api/albums/${albumId}/photos`, {
            params: { limit, offset }
        });
        return response.data;
    },

    // 删除相册
    delete: async (albumId) => {
        const response = await apiClient.delete(`/api/albums/${albumId}`);
        return response.data;
    }
};

/**
 * 照片相关API
 */
export const photoAPI = {
    // 上传照片
    upload: async (albumId, file) => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('albumId', albumId);

        const response = await apiClient.post('/api/photos', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    // 获取所有照片
    list: async (limit = 50, offset = 0) => {
        const response = await apiClient.get('/api/photos', {
            params: { limit, offset }
        });
        return response.data;
    },

    // 获取照片详情
    get: async (photoId) => {
        const response = await apiClient.get(`/api/photos/${photoId}`);
        return response.data;
    }
};

/**
 * 获取图片URL（用于显示）
 * 替换S3Image和Storage.get
 */
export const getImageUrl = (imagePath) => {
    // 移除可能的前缀
    const cleanPath = imagePath.replace(/^(uploads\/|resized\/)/, '');
    return `/uploads/${cleanPath}`;
};

/**
 * 获取缩略图URL
 */
export const getThumbnailUrl = (thumbnailPath) => {
    if (!thumbnailPath) return '';
    
    // 提取文件名（支持Windows和Unix路径）
    const fileName = thumbnailPath.split(/[/\\]/).pop();
    
    // 如果文件名不是以thumb_开头，添加前缀
    const thumbnailFileName = fileName.startsWith('thumb_') ? fileName : `thumb_${fileName}`;
    
    return `/uploads/thumbnails/${thumbnailFileName}`;
};

// 默认导出
const apiService = {
    albumAPI,
    photoAPI,
    getImageUrl,
    getThumbnailUrl
};

export default apiService;

