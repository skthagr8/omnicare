.PHONY: help up down restart logs migrate seed test lint format clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

logs: ## Tail logs from all services
	docker-compose logs -f

logs-backend: ## Tail backend logs
	docker-compose logs -f backend

logs-postgres: ## Tail postgres logs
	docker-compose logs -f postgres

migrate: ## Run database migrations
	docker-compose exec backend alembic upgrade head

migrate-create: ## Create new migration (usage: make migrate-create msg="description")
	docker-compose exec backend alembic revision --autogenerate -m "$(msg)"

seed: ## Seed database with test data
	docker-compose exec backend python scripts/seed_data.py

test: ## Run tests
	docker-compose exec backend pytest

test-unit: ## Run unit tests
	docker-compose exec backend pytest tests/unit

test-integration: ## Run integration tests
	docker-compose exec backend pytest tests/integration

lint: ## Run linters
	docker-compose exec backend flake8 app/
	docker-compose exec backend mypy app/

format: ## Format code
	docker-compose exec backend black app/
	docker-compose exec backend isort app/

shell: ## Open shell in backend container
	docker-compose exec backend bash

psql: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U omnicare

redis-cli: ## Open Redis CLI
	docker-compose exec redis redis-cli

clean: ## Clean up Docker resources
	docker-compose down -v
	docker system prune -f
