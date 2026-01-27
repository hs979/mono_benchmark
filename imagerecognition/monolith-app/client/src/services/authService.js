/**
 * 本地认证服务
 * 替换AWS Amplify的Auth模块
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// 创建axios实例
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 请求拦截器：自动添加token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器：处理认证错误
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token过期或无效，清除并跳转登录
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

/**
 * 用户注册
 */
export const signUp = async (username, email, password) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
            username,
            email,
            password
        });
        
        if (response.data.success) {
            const { user, token } = response.data.data;
            localStorage.setItem('authToken', token);
            localStorage.setItem('currentUser', JSON.stringify(user));
            return user;
        } else {
            throw new Error(response.data.error || '注册失败');
        }
    } catch (error) {
        throw new Error(error.response?.data?.error || error.message || '注册失败');
    }
};

/**
 * 用户登录
 */
export const signIn = async (username, password) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
            username,
            password
        });
        
        if (response.data.success) {
            const { user, token } = response.data.data;
            localStorage.setItem('authToken', token);
            localStorage.setItem('currentUser', JSON.stringify(user));
            return user;
        } else {
            throw new Error(response.data.error || '登录失败');
        }
    } catch (error) {
        throw new Error(error.response?.data?.error || error.message || '登录失败');
    }
};

/**
 * 用户登出
 */
export const signOut = async () => {
    try {
        await apiClient.post('/api/auth/logout');
    } catch (error) {
        console.error('登出请求失败:', error);
    } finally {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = '/';
    }
};

/**
 * 获取当前已认证的用户
 */
export const currentAuthenticatedUser = () => {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('currentUser');
    
    if (!token || !userStr) {
        throw new Error('未登录');
    }
    
    try {
        const user = JSON.parse(userStr);
        return user;
    } catch (error) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        throw new Error('用户信息无效');
    }
};

/**
 * 检查用户是否已登录
 */
export const isAuthenticated = () => {
    const token = localStorage.getItem('authToken');
    return !!token;
};

/**
 * 获取API客户端（已配置认证）
 */
export const getApiClient = () => {
    return apiClient;
};

// 默认导出
const authService = {
    signUp,
    signIn,
    signOut,
    currentAuthenticatedUser,
    isAuthenticated,
    getApiClient
};

export default authService;

