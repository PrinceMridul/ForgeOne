# Data Model

## Core Entities
- Users → OrgMemberships → Organizations
- Organizations → Projects → Repositories
- Projects → Tasks → AgentRuns → AgentMessages, AgentArtifacts, AgentToolCalls
- Users → Conversations → Messages
- AuditLogs

## Design Decisions
1. Multi-tenancy via Organization scoping
2. UUID primary keys
3. Soft deletes (deleted_at)
4. PostgreSQL enums for status fields
5. See `packages/database/prisma/schema.prisma`
