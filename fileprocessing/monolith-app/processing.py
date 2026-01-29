import os
import markdown
import boto3

def convert_to_html(input_filepath, output_dir='output/html'):
    """
    将Markdown文件转换为HTML文件
    
    参数
    ----------
    input_filepath: str
        输入的Markdown文件路径
    output_dir: str
        输出HTML文件的目录，默认为 'output/html'
    
    返回
    -------
    str
        生成的HTML文件路径
    """
    try:
        # 确保输出目录存在
        os.makedirs(output_dir, exist_ok=True)
        
        # 读取Markdown文件内容
        with open(input_filepath, 'r', encoding='utf-8') as f:
            markdown_text = f.read()
        
        # 转换为HTML
        html_content = markdown.markdown(markdown_text)
        
        # 生成输出文件路径
        filename = os.path.basename(input_filepath)
        html_filename = os.path.splitext(filename)[0] + '.html'
        output_filepath = os.path.join(output_dir, html_filename)
        
        # 写入HTML文件
        with open(output_filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"[格式转换] 转换成功: {filename} -> {html_filename}")
        print(f"[格式转换] HTML文件已保存至: {output_filepath}")
        
        return output_filepath
    
    except FileNotFoundError:
        print(f"[格式转换错误] 文件未找到: {input_filepath}")
        raise
    except Exception as e:
        print(f"[格式转换错误] 转换失败: {e}")
        raise

def analyze_sentiment(input_filepath):
    """
    使用AWS Comprehend分析文本文件的情感
    
    参数
    ----------
    input_filepath: str
        输入的文本文件路径
    
    返回
    -------
    dict
        包含情感分析结果的字典，包括:
        - Sentiment: 总体情感 (POSITIVE/NEGATIVE/NEUTRAL/MIXED)
        - SentimentScore: 包含各情感的信度分数
            - Positive: 积极情感分数 (0到1之间)
            - Negative: 消极情感分数 (0到1之间)
            - Neutral: 中性情感分数 (0到1之间)
            - Mixed: 混合情感分数 (0到1之间)
    """
    try:
        # 读取文件内容
        with open(input_filepath, 'r', encoding='utf-8') as f:
            text = f.read()
        
        # 检查文本长度（Comprehend有5000字节的限制）
        if len(text.encode('utf-8')) > 5000:
            print(f"[情感分析警告] 文本过长，将截取前5000字节")
            # 截取文本以符合Comprehend限制
            while len(text.encode('utf-8')) > 5000:
                text = text[:-100]
        
        # 初始化AWS Comprehend客户端
        aws_region = os.getenv('AWS_REGION', 'us-east-1')
        comprehend_client = boto3.client('comprehend', region_name=aws_region)
        
        # 使用AWS Comprehend进行情感分析
        response = comprehend_client.detect_sentiment(
            Text=text,
            LanguageCode='en'
        )
        
        overall_sentiment = response['Sentiment']
        sentiment_score = response['SentimentScore']
        
        sentiment_data = {
            'Sentiment': overall_sentiment,
            'SentimentScore': sentiment_score
        }
        
        print(f"[情感分析] 分析完成")
        print(f"[情感分析] 总体情感: {overall_sentiment}")
        print(f"[情感分析] 情感分数: Positive={sentiment_score['Positive']:.3f}, "
              f"Negative={sentiment_score['Negative']:.3f}, "
              f"Neutral={sentiment_score['Neutral']:.3f}, "
              f"Mixed={sentiment_score['Mixed']:.3f}")
        
        return sentiment_data
    
    except FileNotFoundError:
        print(f"[情感分析错误] 文件未找到: {input_filepath}")
        raise
    except Exception as e:
        print(f"[情感分析错误] 分析失败: {e}")
        raise

