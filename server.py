#!/usr/bin/env python3
"""
简单的HTTP服务器，用于本地运行智慧学习笔记应用
支持Python 3.x
"""

import http.server
import socketserver
import os
import sys
import webbrowser
from pathlib import Path

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """自定义HTTP请求处理器，添加CORS支持"""
    
    def end_headers(self):
        # 添加CORS头部，允许跨域请求
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        # 设置缓存策略
        if self.path.endswith(('.js', '.css')):
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
    
    def do_OPTIONS(self):
        """处理OPTIONS请求"""
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[{self.log_date_time_string()}] {format % args}")

def find_free_port(start_port=8000, max_port=8100):
    """查找可用端口"""
    import socket
    
    for port in range(start_port, max_port):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('localhost', port))
                return port
        except OSError:
            continue
    
    raise RuntimeError(f"无法在 {start_port}-{max_port} 范围内找到可用端口")

def main():
    """主函数"""
    # 检查是否在正确的目录
    if not os.path.exists('index.html'):
        print("❌ 错误：未找到 index.html 文件")
        print("请确保在项目根目录下运行此脚本")
        sys.exit(1)
    
    # 查找可用端口
    try:
        port = find_free_port()
    except RuntimeError as e:
        print(f"❌ 错误：{e}")
        sys.exit(1)
    
    # 创建服务器
    try:
        with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
            server_url = f"http://localhost:{port}"
            
            print("🚀 智慧学习笔记应用服务器启动成功！")
            print(f"📍 服务器地址: {server_url}")
            print(f"📁 服务目录: {os.getcwd()}")
            print("⏹️  按 Ctrl+C 停止服务器")
            print("-" * 50)
            
            # 自动打开浏览器
            try:
                webbrowser.open(server_url)
                print("🌐 已自动打开浏览器")
            except Exception as e:
                print(f"⚠️  无法自动打开浏览器: {e}")
                print(f"请手动访问: {server_url}")
            
            print("-" * 50)
            
            # 启动服务器
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n👋 服务器已停止")
    except Exception as e:
        print(f"❌ 服务器启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()