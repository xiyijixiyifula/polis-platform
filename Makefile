# ============================================================================
# Polis — 极简命令集
# ============================================================================

# 🚀 一键启动 (Docker - 最简单)
up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

# 🔧 本地开发 (不需要 Docker)
dev:
	bash scripts/start.sh dev

stop:
	bash scripts/start.sh stop

# 📦 编译
build:
	cargo build --release --workspace

# 🗄️ 数据库
db-init:
	docker compose up -d postgres
	sleep 3
	cat migrations/*.sql | docker compose exec -T postgres psql -U polis -d polis

db-seed:
	cat migrations/002_seed_data.sql | docker compose exec -T postgres psql -U polis -d polis

# ✅ 测试
test:
	cargo test --workspace

test-api:
	bash scripts/test_api.sh

# 🧹 清理
clean:
	docker compose down -v
	cargo clean

# 📖 帮助
help:
	@echo "╔═══════════════════════════════════════════════╗"
	@echo "║  Polis 命令                                    ║"
	@echo "╠═══════════════════════════════════════════════╣"
	@echo "║  🔥 make up      - 一键启动 (Docker)          ║"
	@echo "║  🔥 make dev     - 本地开发启动               ║"
	@echo "║  🔥 make down    - 停止                       ║"
	@echo "║  🔥 make logs    - 查看日志                   ║"
	@echo "║                                               ║"
	@echo "║  📦 make build   - 编译全部                    ║"
	@echo "║  📦 make test    - 运行测试                    ║"
	@echo "║  📦 make db-init - 初始化数据库                ║"
	@echo "║  📦 make db-seed - 导入测试数据                ║"
	@echo "║                                               ║"
	@echo "║  🧹 make clean   - 清理所有                    ║"
	@echo "╚═══════════════════════════════════════════════╝"
