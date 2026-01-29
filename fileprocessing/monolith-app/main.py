import argparse
import os
import sys
from processing import convert_to_html, analyze_sentiment
from database import save_sentiment

def main():
    """主程序入口"""
    # 设置命令行参数解析
    parser = argparse.ArgumentParser(
        description='文件处理工具 - 将Markdown文件转换为HTML并进行情感分析'
    )
    parser.add_argument(
        'file',
        type=str,
        help='要处理的Markdown文件路径 (例如: sample.md)'
    )
    
    args = parser.parse_args()
    input_file = args.file
    
    # 检查文件是否存在
    if not os.path.exists(input_file):
        print(f"[错误] 文件不存在: {input_file}")
        sys.exit(1)
    
    # 检查文件扩展名
    if not (input_file.endswith('.md') or input_file.endswith('.markdown')):
        print(f"[警告] 文件似乎不是Markdown格式(.md/.markdown)，但仍将继续处理")
    
    print("=" * 60)
    print("文件处理工具")
    print("=" * 60)
    print(f"处理文件: {input_file}")
    print()
    
    print("-" * 60)
    print("功能1: 格式转换 (Markdown -> HTML)")
    print("-" * 60)
    try:
        html_file = convert_to_html(input_file)
        print()
    except Exception as e:
        print(f"[致命错误] 格式转换失败，程序终止")
        sys.exit(1)

    print("-" * 60)
    print("功能2: 情感分析")
    print("-" * 60)
    try:
        sentiment_data = analyze_sentiment(input_file)
        print()
    except Exception as e:
        print(f"[致命错误] 情感分析失败，程序终止")
        sys.exit(1)
    
    # 保存情感分析结果到数据库
    print("-" * 60)
    print("保存结果到数据库")
    print("-" * 60)
    try:
        filename = os.path.basename(input_file)
        save_sentiment(filename, sentiment_data)
        print()
    except Exception as e:
        print(f"[致命错误] 保存结果失败，程序终止")
        sys.exit(1)
    
    # 完成
    print("=" * 60)
    print("处理完成！")
    print("=" * 60)
    print(f"HTML文件: {html_file}")
    print(f"情感结果: 已保存到DynamoDB数据库")
    print()

if __name__ == '__main__':
    main()

