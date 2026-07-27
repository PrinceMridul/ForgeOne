.PHONY: help setup dev build test lint type-check clean infra infra-down db-migrate db-seed format

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## First-time project setup
	corepack enable
	pnpm install
	cp -n .env.example .env 2>/dev/null || true
	$(MAKE) infra
	$(MAKE) db-migrate
	@echo "\n✅ ForgeOne setup complete! Run 'make dev' to start."

dev: ## Start all dev servers
	pnpm turbo run dev

build: ## Build all packages
	pnpm turbo run build

test: ## Run all tests
	pnpm turbo run test

lint: ## Lint all packages
	pnpm turbo run lint

type-check: ## Type-check all packages
	pnpm turbo run type-check

clean: ## Clean all build artifacts
	pnpm turbo run clean
	rm -rf node_modules

infra: ## Start dev infrastructure
	docker compose up -d
	@echo "\n⏳ Waiting for services..."
	@sleep 5
	@echo "✅ Infrastructure ready."

infra-down: ## Stop dev infrastructure
	docker compose down

infra-reset: ## Reset infrastructure (destroy data)
	docker compose down -v
	$(MAKE) infra

db-migrate: ## Run database migrations
	pnpm --filter @forgeone/database prisma migrate dev

db-seed: ## Seed the database
	pnpm --filter @forgeone/database prisma db seed

db-studio: ## Open Prisma Studio
	pnpm --filter @forgeone/database prisma studio

format: ## Format all files
	pnpm prettier --write .
