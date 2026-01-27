"""
应用启动文件
用于启动Flask开发服务器
"""
import os
from app import create_app

# 从环境变量获取配置名称，默认为development
config_name = os.environ.get('FLASK_CONFIG', 'development')

# 创建应用实例
app = create_app(config_name)

if __name__ == '__main__':
    # 从环境变量读取主机和端口
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"Starting ecommerce monolith application...")
    print(f"Environment: {config_name}")
    print(f"Server running on http://{host}:{port}")
    
    # 启动应用
    app.run(host=host, port=port, debug=debug)

