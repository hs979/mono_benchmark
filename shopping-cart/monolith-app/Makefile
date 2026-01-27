.PHONY: help install frontend-install frontend-build frontend-dev run clean test dynamodb-test dynamodb-local dev-local

help:
	@echo "Shopping Cart Monolith Application (DynamoDB版本)"
	@echo ""
	@echo "可用命令:"
	@echo "  make install          - 安装后端Python依赖"
	@echo "  make frontend-install - 安装前端依赖"
	@echo "  make frontend-build   - 构建前端生产版本"
	@echo "  make frontend-dev     - 启动前端开发服务器"
	@echo "  make run              - 运行完整应用(需要先构建前端)"
	@echo "  make dev              - 开发模式(前后端分离)"
	@echo "  make dev-local        - 本地开发模式(使用本地DynamoDB)"
	@echo "  make dynamodb-test    - 测试DynamoDB连接"
	@echo "  make dynamodb-local   - 启动本地DynamoDB(Docker)"
	@echo "  make clean            - 清理生成的文件"
	@echo "  make test             - 运行测试"

install:
	pip install -r requirements.txt

frontend-install:
	cd frontend && npm install

frontend-build: frontend-install
	cd frontend && npm run build

frontend-dev:
	cd frontend && npm run serve

run: frontend-build
	python app.py

dev:
	@echo "开发模式："
	@echo "1. 在一个终端运行: python app.py"
	@echo "2. 在另一个终端运行: cd frontend && npm run serve"
	@echo "3. 访问: http://localhost:8080"

clean:
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

dynamodb-test:
	@echo "测试DynamoDB连接..."
	python test_dynamodb_connection.py

dynamodb-local:
	@echo "启动本地DynamoDB (需要Docker)..."
	docker run -p 8000:8000 amazon/dynamodb-local

dev-local:
	@echo "本地开发模式（使用本地DynamoDB）"
	@echo "================================================"
	@echo "请确保本地DynamoDB已启动："
	@echo "  make dynamodb-local"
	@echo ""
	@echo "然后在不同终端运行："
	@echo "  1. export DYNAMODB_ENDPOINT=http://localhost:8000 && python app.py"
	@echo "  2. cd frontend && npm run serve"
	@echo "  3. 访问: http://localhost:8080"
	@echo "================================================"

test:
	python run_complete_test.py


