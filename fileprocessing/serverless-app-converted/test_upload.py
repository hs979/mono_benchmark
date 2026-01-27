#!/usr/bin/env python3
"""
测试脚本：上传文件并查询情感分析结果

用法：
    python test_upload.py <API_ENDPOINT> <FILE_PATH>

示例：
    python test_upload.py "https://abc123.execute-api.us-east-1.amazonaws.com/prod" sample.md
"""

import requests
import json
import time
import sys
import os

def main():
    if len(sys.argv) < 3:
        print("用法: python test_upload.py <API_ENDPOINT> <FILE_PATH>")
        print("示例: python test_upload.py 'https://abc123.execute-api.us-east-1.amazonaws.com/prod' sample.md")
        sys.exit(1)

    api_endpoint = sys.argv[1].rstrip('/')
    file_path = sys.argv[2]

    # 检查文件是否存在
    if not os.path.exists(file_path):
        print(f"错误: 文件不存在: {file_path}")
        sys.exit(1)

    # 读取文件内容
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"错误: 无法读取文件: {e}")
        sys.exit(1)

    filename = os.path.basename(file_path)

    print("=" * 60)
    print("文件处理 Serverless 应用 - 测试脚本")
    print("=" * 60)
    print(f"API 端点: {api_endpoint}")
    print(f"文件路径: {file_path}")
    print(f"文件名: {filename}")
    print()

    # 1. 上传文件
    print("-" * 60)
    print("步骤 1: 上传文件")
    print("-" * 60)
    
    upload_url = f"{api_endpoint}/upload"
    data = {
        "filename": filename,
        "content": content,
        "isBase64": False
    }

    try:
        response = requests.post(upload_url, json=data, timeout=30)
        response.raise_for_status()
        result = response.json()
        print(f"✓ 上传成功!")
        print(f"  Bucket: {result.get('bucket', 'N/A')}")
        print(f"  Key: {result.get('key', 'N/A')}")
        print(f"  消息: {result.get('message', 'N/A')}")
    except requests.exceptions.RequestException as e:
        print(f"✗ 上传失败: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"  响应内容: {e.response.text}")
        sys.exit(1)

    print()

    # 2. 等待处理
    print("-" * 60)
    print("步骤 2: 等待文件处理")
    print("-" * 60)
    
    wait_time = 10
    print(f"等待 {wait_time} 秒...")
    for i in range(wait_time):
        time.sleep(1)
        print(".", end="", flush=True)
    print()
    print()

    # 3. 查询结果
    print("-" * 60)
    print("步骤 3: 查询情感分析结果")
    print("-" * 60)
    
    result_url = f"{api_endpoint}/result/{filename}"
    
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            response = requests.get(result_url, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            if response.status_code == 200 and 'data' in result:
                print("✓ 查询成功!")
                print()
                print("情感分析结果:")
                print(json.dumps(result['data'], indent=2, ensure_ascii=False))
                break
            elif response.status_code == 404:
                if attempt < max_retries:
                    print(f"结果尚未准备好，重试 {attempt}/{max_retries}...")
                    time.sleep(5)
                else:
                    print(f"✗ 未找到结果: {result.get('message', 'N/A')}")
                    print("  提示: 文件可能仍在处理中，请稍后再试")
            else:
                print(f"✗ 查询失败: {result.get('message', 'N/A')}")
                break
        except requests.exceptions.RequestException as e:
            print(f"✗ 查询失败: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"  响应内容: {e.response.text}")
            if attempt < max_retries:
                print(f"重试 {attempt}/{max_retries}...")
                time.sleep(5)
            else:
                sys.exit(1)

    print()
    print("=" * 60)
    print("测试完成")
    print("=" * 60)

if __name__ == '__main__':
    main()








