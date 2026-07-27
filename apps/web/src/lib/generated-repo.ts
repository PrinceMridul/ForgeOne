/**
 * Deterministic source that the Developer agent "writes" while its stage is
 * `generating`. Each entry is emitted one-by-one on the pipeline tick, so
 * the repository tree fills up in a believable order.
 */

export interface GeneratedFile {
  path: string;
  language: "ts" | "tsx" | "json" | "md" | "sql" | "yaml" | "toml" | "html";
  adds: number;
  dels: number;
  source: string;
  /** Reviewer annotations that surface once the Reviewer agent starts. */
  reviews?: Array<{ line: number; severity: "warn" | "info" | "ok"; msg: string }>;
  /** Whether Tester exercises this file. */
  tested?: boolean;
  /** Whether Security scans this file (server / infra / migrations). */
  scanned?: boolean;
}

export const GENERATED_FILES: GeneratedFile[] = [
  {
    path: "package.json",
    language: "json",
    adds: 48,
    dels: 0,
    scanned: true,
    source: `{
  "name": "meridian-api",
  "version": "0.4.82",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "start": "node .output/server/index.mjs",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@tanstack/react-router": "^1.87.0",
    "@tanstack/react-start": "^1.87.0",
    "drizzle-orm": "^0.36.4",
    "postgres": "^3.4.5",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "drizzle-kit": "^0.30.0",
    "typescript": "^5.7.2",
    "vite": "^7.0.0",
    "vitest": "^2.1.8"
  }
}
`,
  },
  {
    path: "README.md",
    language: "md",
    adds: 62,
    dels: 0,
    source: `# meridian-api

Multi-tenant billing engine with usage-based metering.

## Quick start

\`\`\`bash
bun install
bun run db:push
bun run dev
\`\`\`

## Architecture

- **Edge** — TanStack Start on Cloudflare Workers
- **DB** — Postgres 16 (Neon) with Drizzle ORM
- **Queue** — Redpanda for async metering events
- **Auth** — passkey + service tokens

See \`docs/adr/021-cache-invalidation.md\` for the caching contract.

## Endpoints

| Method | Path                     | Notes                          |
|--------|--------------------------|--------------------------------|
| GET    | \`/api/projects\`          | cursor-paginated               |
| POST   | \`/api/projects\`          | idempotent via \`X-Request-Id\`  |
| POST   | \`/api/webhooks/stripe\`   | signature-verified             |
`,
  },
  {
    path: "tsconfig.json",
    language: "json",
    adds: 24,
    dels: 0,
    source: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "tests"]
}
`,
  },
  {
    path: "src/db/schema.ts",
    language: "ts",
    adds: 84,
    dels: 0,
    scanned: true,
    reviews: [{ line: 12, severity: "warn", msg: "Add unique index on (tenant_id, slug)" }],
    source: `import { pgTable, uuid, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  tenantIdx: index("projects_tenant_idx").on(t.tenantId),
}));

export const usageEvents = pgTable("usage_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  kind: text("kind").notNull(),
  quantity: integer("quantity").notNull(),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
});
`,
  },
  {
    path: "migrations/0001_init.sql",
    language: "sql",
    adds: 42,
    dels: 0,
    scanned: true,
    source: `CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_tenant_idx ON projects(tenant_id);
CREATE UNIQUE INDEX projects_tenant_slug_idx ON projects(tenant_id, slug);
`,
  },
  {
    path: "src/lib/retry-policy.ts",
    language: "ts",
    adds: 38,
    dels: 4,
    tested: true,
    reviews: [
      { line: 6, severity: "warn", msg: "Rename `n` to `attempt` for clarity" },
      { line: 14, severity: "ok", msg: "Fixed in revision — jitter clamped" },
    ],
    source: `export interface RetryOptions {
  maxAttempts?: number;
  baseMs?: number;
  capMs?: number;
}

export async function withRetry<T>(fn: (attempt: number) => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { maxAttempts = 5, baseMs = 120, capMs = 4_000 } = opts;
  let lastErr: unknown;
  for (let n = 1; n <= maxAttempts; n++) {
    try {
      return await fn(n);
    } catch (err) {
      lastErr = err;
      const backoff = Math.min(capMs, baseMs * 2 ** (n - 1));
      const jitter = Math.floor(Math.random() * (backoff / 4));
      await new Promise((r) => setTimeout(r, backoff + jitter));
    }
  }
  throw lastErr;
}
`,
  },
  {
    path: "src/routes/api/projects.ts",
    language: "ts",
    adds: 142,
    dels: 18,
    tested: true,
    scanned: true,
    reviews: [
      { line: 22, severity: "warn", msg: "Missing input validation on cursor" },
      { line: 41, severity: "warn", msg: "Prefer explicit return type" },
      { line: 55, severity: "ok", msg: "Fixed in revision — cursor now zod-parsed" },
    ],
    source: `import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { db } from "@/db/client";
import { projects } from "@/db/schema";
import { eq, and, lt, desc } from "drizzle-orm";
import { requireTenant } from "@/lib/auth";

const cursorSchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const Route = createFileRoute("/api/projects")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const tenant = await requireTenant(request);
        const url = new URL(request.url);
        const parsed = cursorSchema.safeParse({
          cursor: url.searchParams.get("cursor") ?? undefined,
          limit: url.searchParams.get("limit") ?? undefined,
        });
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        const { cursor, limit } = parsed.data;
        const rows = await db
          .select()
          .from(projects)
          .where(and(
            eq(projects.tenantId, tenant.id),
            cursor ? lt(projects.createdAt, new Date(cursor)) : undefined,
          ))
          .orderBy(desc(projects.createdAt))
          .limit(limit + 1);

        const hasMore = rows.length > limit;
        const items = hasMore ? rows.slice(0, limit) : rows;
        const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

        return Response.json({ items, nextCursor });
      },
    },
  },
});
`,
  },
  {
    path: "src/routes/api/webhooks.stripe.ts",
    language: "ts",
    adds: 96,
    dels: 0,
    scanned: true,
    reviews: [
      { line: 11, severity: "warn", msg: "Verify signature before parsing JSON" },
      { line: 18, severity: "ok", msg: "Fixed in revision — timingSafeEqual added" },
    ],
    source: `import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { recordUsage } from "@/lib/usage";

export const Route = createFileRoute("/api/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const sig = request.headers.get("stripe-signature") ?? "";
        const expected = createHmac("sha256", process.env.STRIPE_SECRET!)
          .update(raw)
          .digest("hex");
        if (
          sig.length !== expected.length ||
          !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
        ) {
          return new Response("invalid signature", { status: 401 });
        }
        const event = JSON.parse(raw) as { type: string; data: unknown };
        await recordUsage(event);
        return new Response("ok");
      },
    },
  },
});
`,
  },
  {
    path: "src/components/project-card.tsx",
    language: "tsx",
    adds: 91,
    dels: 22,
    reviews: [{ line: 8, severity: "info", msg: "Consider memoizing derived usage" }],
    source: `import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import type { Project } from "@/db/schema";

export function ProjectCard({ project }: { project: Project }) {
  const usage = (project.meta as { usage?: number }).usage ?? 0;
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <Link to="/projects/$slug" params={{ slug: project.slug }} className="block">
        <p className="text-sm font-medium">{project.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">{usage.toLocaleString()} events / 30d</p>
      </Link>
    </Card>
  );
}
`,
  },
  {
    path: "tests/api/projects.spec.ts",
    language: "ts",
    adds: 188,
    dels: 0,
    tested: true,
    source: `import { describe, it, expect, beforeEach } from "vitest";
import { createTestTenant, seedProjects, GET } from "./_helpers";

describe("/api/projects", () => {
  beforeEach(async () => {
    await createTestTenant();
  });

  it("paginates with a cursor", async () => {
    await seedProjects(45);
    const first = await GET("/api/projects?limit=20");
    expect(first.items).toHaveLength(20);
    expect(first.nextCursor).toBeTruthy();

    const second = await GET(\`/api/projects?limit=20&cursor=\${first.nextCursor}\`);
    expect(second.items).toHaveLength(20);
    expect(second.items[0].id).not.toEqual(first.items[0].id);
  });

  it("rejects an invalid cursor", async () => {
    const res = await fetch("/api/projects?cursor=not-a-date");
    expect(res.status).toBe(400);
  });
});
`,
  },
  {
    path: "openapi.yaml",
    language: "yaml",
    adds: 64,
    dels: 0,
    source: `openapi: 3.1.0
info:
  title: meridian-api
  version: 0.4.82
paths:
  /api/projects:
    get:
      summary: List projects
      parameters:
        - in: query
          name: cursor
          schema: { type: string, format: date-time }
        - in: query
          name: limit
          schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
      responses:
        "200":
          description: paginated project list
`,
  },
  {
    path: "wrangler.toml",
    language: "toml",
    adds: 18,
    dels: 2,
    scanned: true,
    source: `name = "meridian-api"
main = ".output/server/index.mjs"
compatibility_date = "2026-07-01"
compatibility_flags = ["nodejs_compat"]

[vars]
LOG_LEVEL = "info"

[[d1_databases]]
binding = "DB"
database_name = "meridian"
`,
  },
];
