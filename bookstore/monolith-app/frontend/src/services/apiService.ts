/**
 * API 服务
 * 统一封装所有后端 API 调用，替代 AWS Amplify 的 API 模块
 */

import config from '../config';
import authService from './authService';

const API_URL = config.apiGateway.API_URL;

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

class ApiService {
  /**
   * 发送 HTTP 请求
   */
  private async request(endpoint: string, options: RequestOptions = {}): Promise<any> {
    const { method = 'GET', body } = options;
    
    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // 添加认证 token
    const token = authService.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 构建请求配置
    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    // 发送请求
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, fetchOptions);

    // 处理响应
    if (!response.ok) {
      // 如果是 401 错误，尝试刷新 token
      if (response.status === 401 && token) {
        try {
          await authService.refreshAccessToken();
          // 重试请求
          const newToken = authService.getAccessToken();
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            const retryResponse = await fetch(url, { ...fetchOptions, headers });
            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          }
        } catch (refreshError) {
          // 刷新失败，清除认证状态
          authService.logout();
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
      }

      // 其他错误
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `Request failed: ${response.status}`);
    }

    // 返回 JSON 响应（如果有内容）
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return null;
  }

  /**
   * GET 请求
   */
  async get(apiName: string, path: string, init?: any): Promise<any> {
    // apiName 参数保留是为了兼容 Amplify API 的接口
    // 实际上我们不需要它，因为所有请求都发到同一个后端
    return this.request(path, { method: 'GET' });
  }

  /**
   * POST 请求
   */
  async post(apiName: string, path: string, init?: any): Promise<any> {
    return this.request(path, {
      method: 'POST',
      body: init?.body
    });
  }

  /**
   * PUT 请求
   */
  async put(apiName: string, path: string, init?: any): Promise<any> {
    return this.request(path, {
      method: 'PUT',
      body: init?.body
    });
  }

  /**
   * DELETE 请求
   */
  async del(apiName: string, path: string, init?: any): Promise<any> {
    return this.request(path, {
      method: 'DELETE',
      body: init?.body
    });
  }

  /**
   * PATCH 请求
   */
  async patch(apiName: string, path: string, init?: any): Promise<any> {
    return this.request(path, {
      method: 'PATCH',
      body: init?.body
    });
  }
}

// 导出单例
const apiService = new ApiService();

// 为了兼容原来的代码，导出一个与 Amplify API 相同的接口
export const API = {
  get: (apiName: string, path: string, init?: any) => apiService.get(apiName, path, init),
  post: (apiName: string, path: string, init?: any) => apiService.post(apiName, path, init),
  put: (apiName: string, path: string, init?: any) => apiService.put(apiName, path, init),
  del: (apiName: string, path: string, init?: any) => apiService.del(apiName, path, init),
  patch: (apiName: string, path: string, init?: any) => apiService.patch(apiName, path, init),
};

export default apiService;

