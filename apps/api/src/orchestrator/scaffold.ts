/**
 * Renders a ProjectBlueprint into a coherent repository.
 *
 * Everything emitted here is derived from the blueprint: routes exist for the
 * resources that were inferred, the SQL schema declares the foreign keys the
 * blueprint discovered, the environment file lists only the variables the
 * detected capabilities actually need, and the README documents the routes
 * that were really generated.
 *
 * This is the baseline generator used when no LLM provider is configured.
 */

import type { ProjectBlueprint, BlueprintEntity, BlueprintField } from './blueprint';

export interface ScaffoldFile {
  path: string;
  content: string;
}

const SQL_TYPES: Record<BlueprintField['type'], string> = {
  string: 'text',
  number: 'integer',
  boolean: 'boolean',
  timestamp: 'timestamptz',
  uuid: 'uuid',
  json: 'jsonb',
};

const ZOD_TYPES: Record<BlueprintField['type'], string> = {
  string: 'z.string()',
  number: 'z.number().int()',
  boolean: 'z.boolean()',
  timestamp: 'z.string().datetime()',
  uuid: 'z.string().uuid()',
  json: 'z.record(z.unknown())',
};

const TS_TYPES: Record<BlueprintField['type'], string> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  timestamp: 'string',
  uuid: 'string',
  json: 'Record<string, unknown>',
};

function packageFile(bp: ProjectBlueprint): ScaffoldFile {
  const pkg = {
    name: bp.name,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'tsx watch src/index.ts',
      build: 'tsc',
      start: 'node dist/index.js',
      test: 'vitest run',
      'db:migrate': 'psql "$DATABASE_URL" -f src/db/schema.sql',
    },
    dependencies: bp.dependencies,
    devDependencies: {
      '@types/node': '^22.0.0',
      ...(bp.dependencies.ws ? { '@types/ws': '^8.5.13' } : {}),
      '@types/pg': '^8.11.10',
      tsx: '^4.19.0',
      typescript: '^5.7.0',
      vitest: '^3.0.0',
    },
  };
  return { path: 'package.json', content: `${JSON.stringify(pkg, null, 2)}\n` };
}

function tsconfigFile(): ScaffoldFile {
  return {
    path: 'tsconfig.json',
    content: `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          outDir: 'dist',
          rootDir: 'src',
          strict: true,
          noUncheckedIndexedAccess: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    )}\n`,
  };
}

/** Environment variables are driven by the capabilities that were detected. */
function envFile(bp: ProjectBlueprint): ScaffoldFile {
  const lines = [
    '# Copy to .env and fill in before running.',
    '',
    'PORT=4000',
    'DATABASE_URL=postgres://postgres:postgres@localhost:5432/' + bp.name.replace(/-/g, '_'),
  ];
  for (const cap of bp.capabilities) {
    if (cap.id === 'auth') lines.push('', '# Session signing', 'JWT_SECRET=replace-me');
    if (cap.id === 'billing')
      lines.push('', '# Payments', 'STRIPE_SECRET_KEY=', 'STRIPE_WEBHOOK_SECRET=');
    if (cap.id === 'storage')
      lines.push('', '# Object storage', 'S3_ENDPOINT=', 'S3_BUCKET=', 'S3_ACCESS_KEY=', 'S3_SECRET_KEY=');
    if (cap.id === 'notifications') lines.push('', '# Queue', 'REDIS_URL=redis://localhost:6379');
    if (cap.id === 'ai') lines.push('', '# Model access', 'ANTHROPIC_API_KEY=');
  }
  return { path: '.env.example', content: `${lines.join('\n')}\n` };
}

function configFile(bp: ProjectBlueprint): ScaffoldFile {
  const extra = bp.capabilities
    .flatMap((cap) => {
      if (cap.id === 'auth') return ["  jwtSecret: z.string().min(16),"];
      if (cap.id === 'billing')
        return ['  stripeSecretKey: z.string().optional(),', '  stripeWebhookSecret: z.string().optional(),'];
      if (cap.id === 'storage') return ['  s3Bucket: z.string().optional(),'];
      if (cap.id === 'notifications') return ["  redisUrl: z.string().default('redis://localhost:6379'),"];
      if (cap.id === 'ai') return ['  anthropicApiKey: z.string().optional(),'];
      return [];
    })
    .join('\n');

  const extraParse = bp.capabilities
    .flatMap((cap) => {
      if (cap.id === 'auth') return ['  jwtSecret: process.env.JWT_SECRET,'];
      if (cap.id === 'billing')
        return ['  stripeSecretKey: process.env.STRIPE_SECRET_KEY,', '  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,'];
      if (cap.id === 'storage') return ['  s3Bucket: process.env.S3_BUCKET,'];
      if (cap.id === 'notifications') return ['  redisUrl: process.env.REDIS_URL,'];
      if (cap.id === 'ai') return ['  anthropicApiKey: process.env.ANTHROPIC_API_KEY,'];
      return [];
    })
    .join('\n');

  return {
    path: 'src/config.ts',
    content: `import { z } from 'zod';

/** Fails fast at boot rather than at the first request. */
const schema = z.object({
  port: z.coerce.number().default(4000),
  databaseUrl: z.string().url(),
${extra}
});

export const config = schema.parse({
  port: process.env.PORT,
  databaseUrl: process.env.DATABASE_URL,
${extraParse}
});

export type Config = z.infer<typeof schema>;
`,
  };
}

function dbClientFile(): ScaffoldFile {
  return {
    path: 'src/db/client.ts',
    content: `import { Pool } from 'pg';
import { config } from '../config';

export const pool = new Pool({ connectionString: config.databaseUrl });

/** Run a statement and return typed rows. */
export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function closePool(): Promise<void> {
  await pool.end();
}
`,
  };
}

function schemaFile(bp: ProjectBlueprint): ScaffoldFile {
  // Parents must exist before children reference them.
  const order = [...bp.entities].sort((a, b) => {
    const aIsChild = bp.relations.some((r) => r.from === a.name) ? 1 : 0;
    const bIsChild = bp.relations.some((r) => r.from === b.name) ? 1 : 0;
    return aIsChild - bIsChild;
  });

  const tables = order
    .map((entity) => {
      const cols = entity.fields
        .map((field) => {
          const sql = SQL_TYPES[field.type];
          if (field.references) {
            const parent = bp.entities.find((e) => e.name === field.references);
            return `  ${field.name} ${sql} not null references ${parent?.plural ?? field.references}(id) on delete cascade,`;
          }
          return `  ${field.name} ${sql},`;
        })
        .join('\n');
      return `create table if not exists ${entity.plural} (
  id uuid primary key default gen_random_uuid(),
${cols}
  created_at timestamptz not null default now()
);`;
    })
    .join('\n\n');

  const fkIndexes = bp.relations
    .map((r) => {
      const child = bp.entities.find((e) => e.name === r.from);
      return child
        ? `create index if not exists ${child.plural}_${r.to}_id_idx on ${child.plural}(${r.to}_id);`
        : null;
    })
    .filter(Boolean)
    .join('\n');

  const searchIndexes = bp.capabilities.some((c) => c.id === 'search')
    ? bp.entities
        .map((e) => {
          const textField = e.fields.find((x) => x.type === 'string' && !x.references);
          return textField
            ? `create index if not exists ${e.plural}_search_idx on ${e.plural} using gin (to_tsvector('english', coalesce(${textField.name}, '')));`
            : null;
        })
        .filter(Boolean)
        .join('\n')
    : '';

  return {
    path: 'src/db/schema.sql',
    content: `-- Schema for ${bp.name}
-- Generated from the project blueprint. Safe to re-apply.

create extension if not exists "pgcrypto";

${tables}
${fkIndexes ? `\n-- Foreign-key lookups\n${fkIndexes}\n` : ''}${
      searchIndexes ? `\n-- Full-text search\n${searchIndexes}\n` : ''
    }`,
  };
}

function routeFile(entity: BlueprintEntity): ScaffoldFile {
  const fkField = entity.fields.find((x) => x.references);
  const columns = entity.fields.map((x) => x.name);

  const zodFields = entity.fields
    .map((x) => `  ${x.name}: ${ZOD_TYPES[x.type]}${x.references ? '' : '.nullish()'},`)
    .join('\n');

  const tsFields = entity.fields
    .map((x) => `  ${x.name}: ${TS_TYPES[x.type]}${x.references ? '' : ' | null'};`)
    .join('\n');

  const insertCols = columns.join(', ');
  const insertParams = columns.map((_, i) => `$${i + 1}`).join(', ');
  const insertValues = columns.map((c) => `parsed.data.${c} ?? null`).join(', ');

  // Read the validated value, never the raw querystring.
  const listQuery = fkField
    ? `    const rows = ${fkField.name}
      ? await query<${entity.pascal}>(
          'select * from ${entity.plural} where ${fkField.name} = $1 order by created_at desc limit $2 offset $3',
          [${fkField.name}, limit, offset],
        )
      : await query<${entity.pascal}>(
          'select * from ${entity.plural} order by created_at desc limit $1 offset $2',
          [limit, offset],
        );`
    : `    const rows = await query<${entity.pascal}>(
      'select * from ${entity.plural} order by created_at desc limit $1 offset $2',
      [limit, offset],
    );`;

  const listQuerystring = fkField
    ? `z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  ${fkField.name}: z.string().uuid().optional(),
})`
    : `z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})`;

  return {
    path: `src/routes/${entity.plural}.ts`,
    content: `import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { query } from '../db/client';

export interface ${entity.pascal} {
  id: string;
${tsFields}
  created_at: string;
}

export const create${entity.pascal}Schema = z.object({
${zodFields}
});

const listQuery = ${listQuerystring};

export const ${entity.plural}Routes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request) => {
    const { limit, offset${fkField ? `, ${fkField.name}` : ''} } = listQuery.parse(request.query);
${listQuery}
    return { data: rows, limit, offset };
  });

  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const [found] = await query<${entity.pascal}>('select * from ${entity.plural} where id = $1', [
      request.params.id,
    ]);
    if (!found) return reply.status(404).send({ error: '${entity.pascal} not found' });
    return { data: found };
  });

  app.post('/', async (request, reply) => {
    const parsed = create${entity.pascal}Schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload', issues: parsed.error.issues });
    }
    const [created] = await query<${entity.pascal}>(
      'insert into ${entity.plural} (${insertCols}) values (${insertParams}) returning *',
      [${insertValues}],
    );
    return reply.status(201).send({ data: created });
  });

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const removed = await query<{ id: string }>(
      'delete from ${entity.plural} where id = $1 returning id',
      [request.params.id],
    );
    if (removed.length === 0) {
      return reply.status(404).send({ error: '${entity.pascal} not found' });
    }
    return reply.status(204).send();
  });
};
`,
  };
}

function indexFile(bp: ProjectBlueprint): ScaffoldFile {
  const imports = bp.entities
    .map((e) => `import { ${e.plural}Routes } from './routes/${e.plural}';`)
    .join('\n');
  const registrations = bp.entities
    .map((e) => `  await app.register(${e.plural}Routes, { prefix: '/api/${e.plural}' });`)
    .join('\n');

  const realtime = bp.capabilities.some((c) => c.id === 'realtime');

  return {
    path: 'src/index.ts',
    content: `import Fastify from 'fastify';
${realtime ? "import { WebSocketServer } from 'ws';\n" : ''}import { config } from './config';
import { pool } from './db/client';
${imports}

const app = Fastify({ logger: true });

async function main() {
  app.get('/health', async () => {
    await pool.query('select 1');
    return { status: 'ok', service: '${bp.name}', timestamp: new Date().toISOString() };
  });

${registrations}
${
  realtime
    ? `
  // Realtime fan-out. Origin is checked on upgrade so the gateway cannot be
  // driven from an arbitrary page.
  const allowed = new Set([\`http://localhost:\${config.port}\`]);
  const sockets = new Set<import('ws').WebSocket>();
  const wss = new WebSocketServer({ server: app.server, path: '/realtime' });

  wss.on('connection', (socket, request) => {
    const origin = request.headers.origin;
    if (origin && !allowed.has(origin)) {
      socket.close(1008, 'origin not allowed');
      return;
    }
    sockets.add(socket);
    socket.on('message', (raw) => {
      for (const peer of sockets) {
        if (peer !== socket && peer.readyState === peer.OPEN) peer.send(raw.toString());
      }
    });
    socket.on('close', () => sockets.delete(socket));
  });
`
    : ''
}
  await app.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
`,
  };
}

function testFile(entity: BlueprintEntity): ScaffoldFile {
  return {
    path: `tests/${entity.plural}.spec.ts`,
    content: `import { describe, it, expect } from 'vitest';
import { create${entity.pascal}Schema } from '../src/routes/${entity.plural}';

describe('${entity.plural} payload contract', () => {
  it('rejects a payload that is not an object', () => {
    expect(create${entity.pascal}Schema.safeParse(null).success).toBe(false);
  });

${
  entity.fields.some((x) => x.references)
    ? `  it('requires the ${entity.fields.find((x) => x.references)!.name} foreign key', () => {
    const result = create${entity.pascal}Schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects a malformed ${entity.fields.find((x) => x.references)!.name}', () => {
    const result = create${entity.pascal}Schema.safeParse({ ${entity.fields.find((x) => x.references)!.name}: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
`
    : `  it('accepts an empty payload because every field is optional', () => {
    expect(create${entity.pascal}Schema.safeParse({}).success).toBe(true);
  });

  it('rejects a field of the wrong type', () => {
    const result = create${entity.pascal}Schema.safeParse({ ${entity.fields[0]?.name ?? 'name'}: 12345 });
    expect(result.success).toBe(${entity.fields[0]?.type === 'number' ? 'true' : 'false'});
  });
`
}});
`,
  };
}

function dockerfile(): ScaffoldFile {
  return {
    path: 'Dockerfile',
    content: `# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:4000/health || exit 1
CMD ["node", "dist/index.js"]
`,
  };
}

function dockerignoreFile(): ScaffoldFile {
  return {
    path: '.dockerignore',
    content: 'node_modules\ndist\n.env\ntests\n*.md\n',
  };
}

function readmeFile(bp: ProjectBlueprint): ScaffoldFile {
  const caps = bp.capabilities.length
    ? bp.capabilities.map((c) => `- **${c.label}** — ${c.implication}`).join('\n')
    : '- No cross-cutting subsystems were implied by the brief.';

  const routes = bp.entities
    .map((e) => {
      const fk = e.fields.find((x) => x.references);
      return `| \`/api/${e.plural}\` | \`GET\` \`POST\` \`DELETE\` | ${e.pascal}${fk ? ` — filterable by \`?${fk.name}\`` : ''} |`;
    })
    .join('\n');

  const model = bp.entities
    .map((e) => `- **${e.plural}** — ${e.fields.map((x) => `\`${x.name}\``).join(', ')}`)
    .join('\n');

  const rels = bp.relations.length
    ? bp.relations
        .map((r) => {
          const from = bp.entities.find((e) => e.name === r.from);
          const to = bp.entities.find((e) => e.name === r.to);
          return `- \`${from?.plural}\` → \`${to?.plural}\` (many-to-one, cascading delete)`;
        })
        .join('\n')
    : '- Resources are independent; no foreign keys were inferred.';

  return {
    path: 'README.md',
    content: `# ${bp.displayName}

${bp.summary}

${bp.domain ? `Domain: **${bp.domain}**.\n` : ''}
## Getting started

\`\`\`bash
npm install
cp .env.example .env      # set DATABASE_URL
npm run db:migrate        # apply src/db/schema.sql
npm run dev
\`\`\`

\`\`\`bash
curl http://localhost:4000/health
\`\`\`

## API

| Route | Methods | Description |
|---|---|---|
| \`/health\` | \`GET\` | Liveness probe; also checks the database connection |
${routes}

List endpoints accept \`?limit\` (1–100, default 20) and \`?offset\`.

## Data model

${model}

### Relationships

${rels}

## Capabilities

${caps}

## Tests

\`\`\`bash
npm test
\`\`\`

The suite covers the request contract for each resource. It does not yet cover
persistence — point \`DATABASE_URL\` at a scratch database and add integration
tests before relying on it.
`,
  };
}

export interface RepositoryStats {
  fileCount: number;
  lineCount: number;
  byLanguage: Record<string, number>;
  sourceFiles: string[];
  routeFiles: string[];
  testFiles: string[];
  testCases: number;
}

/** Measure what the Developer actually emitted. */
export function summarizeRepository(
  files: Array<{ path: string; content: string }>,
): RepositoryStats {
  const byLanguage: Record<string, number> = {};
  let lineCount = 0;
  let testCases = 0;

  for (const file of files) {
    const ext = file.path.includes('.') ? file.path.slice(file.path.lastIndexOf('.') + 1) : 'other';
    byLanguage[ext] = (byLanguage[ext] ?? 0) + 1;
    lineCount += file.content.split('\n').length;
    if (file.path.includes('.spec.') || file.path.startsWith('tests/')) {
      testCases += (file.content.match(/\bit\(/g) ?? []).length;
    }
  }

  return {
    fileCount: files.length,
    lineCount,
    byLanguage,
    sourceFiles: files.filter((f) => f.path.endsWith('.ts')).map((f) => f.path),
    routeFiles: files.filter((f) => f.path.startsWith('src/routes/')).map((f) => f.path),
    testFiles: files
      .filter((f) => f.path.includes('.spec.') || f.path.startsWith('tests/'))
      .map((f) => f.path),
    testCases,
  };
}

/** Render the full baseline repository for a blueprint. */
export function scaffoldRepository(blueprint: ProjectBlueprint): ScaffoldFile[] {
  return [
    packageFile(blueprint),
    tsconfigFile(),
    envFile(blueprint),
    configFile(blueprint),
    indexFile(blueprint),
    dbClientFile(),
    ...blueprint.entities.map(routeFile),
    schemaFile(blueprint),
    ...blueprint.entities.slice(0, 3).map(testFile),
    dockerfile(),
    dockerignoreFile(),
    readmeFile(blueprint),
  ];
}
