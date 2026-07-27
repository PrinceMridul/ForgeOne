# ADR-003: Database Selection

## Status: Accepted

## Decision
PostgreSQL 16 + Redis 7 + Qdrant + MinIO/S3

## Rationale
- PostgreSQL: reliable RDBMS with Prisma
- Redis: cache + BullMQ job queue
- Qdrant: purpose-built vector DB
- MinIO: S3-compatible local dev
