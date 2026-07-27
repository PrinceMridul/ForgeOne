# Local Development

## Prerequisites
- Node.js 22.x, pnpm 9.x, Python 3.12+, uv, Docker

## Setup
```bash
git clone https://github.com/forgeone/forgeone.git
cd forgeone
make setup
```

## Daily
```bash
make infra    # Start PG, Redis, Qdrant, MinIO
make dev      # Start all servers
make test     # Run tests
make lint     # Lint
```

## Database
```bash
make db-migrate
make db-seed
make db-studio
```
