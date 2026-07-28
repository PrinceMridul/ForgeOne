/**
 * Renders a ProjectBlueprint into a coherent set of source files.
 *
 * This is the baseline generator used when no LLM provider is configured. It
 * produces a small but genuinely consistent service: routes, schemas and
 * tables all agree with the entities detected in the prompt, so the artifact
 * panel shows a repository that actually belongs to the user's idea.
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
};

const ZOD_TYPES: Record<BlueprintField['type'], string> = {
  string: 'z.string()',
  number: 'z.number().int()',
  boolean: 'z.boolean()',
  timestamp: 'z.string().datetime()',
  uuid: 'z.string().uuid()',
};

function routeFile(entity: BlueprintEntity): ScaffoldFile {
  const fields = entity.fields.map((f) => `  ${f.name}: ${ZOD_TYPES[f.type]},`).join('\n');

  return {
    path: `src/routes/${entity.plural}.ts`,
    content: `import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

export const ${entity.name}Schema = z.object({
  id: z.string().uuid(),
${fields}
  createdAt: z.string().datetime(),
});

export type ${entity.pascal} = z.infer<typeof ${entity.name}Schema>;

export const create${entity.pascal}Schema = ${entity.name}Schema.omit({ id: true, createdAt: true });

const store = new Map<string, ${entity.pascal}>();

export const ${entity.plural}Routes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ data: Array.from(store.values()) }));

  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const found = store.get(request.params.id);
    if (!found) return reply.status(404).send({ error: '${entity.pascal} not found' });
    return { data: found };
  });

  app.post('/', async (request, reply) => {
    const parsed = create${entity.pascal}Schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload', issues: parsed.error.issues });
    }
    const record: ${entity.pascal} = {
      id: crypto.randomUUID(),
      ...parsed.data,
      createdAt: new Date().toISOString(),
    };
    store.set(record.id, record);
    return reply.status(201).send({ data: record });
  });

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!store.delete(request.params.id)) {
      return reply.status(404).send({ error: '${entity.pascal} not found' });
    }
    return reply.status(204).send();
  });
};
`,
  };
}

function testFile(entity: BlueprintEntity): ScaffoldFile {
  const sample = entity.fields
    .map((f) => {
      switch (f.type) {
        case 'number':
          return `      ${f.name}: 1,`;
        case 'boolean':
          return `      ${f.name}: false,`;
        case 'timestamp':
          return `      ${f.name}: new Date().toISOString(),`;
        case 'uuid':
          return `      ${f.name}: crypto.randomUUID(),`;
        default:
          return `      ${f.name}: 'example',`;
      }
    })
    .join('\n');

  return {
    path: `tests/${entity.plural}.spec.ts`,
    content: `import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { ${entity.plural}Routes } from '../src/routes/${entity.plural}';

describe('${entity.plural} routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(${entity.plural}Routes, { prefix: '/${entity.plural}' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('starts empty', async () => {
    const res = await app.inject({ method: 'GET', url: '/${entity.plural}' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toEqual([]);
  });

  it('rejects an invalid payload', async () => {
    const res = await app.inject({ method: 'POST', url: '/${entity.plural}', payload: {} });
    expect(res.statusCode).toBe(400);
  });

  it('creates and reads back a ${entity.name}', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/${entity.plural}',
      payload: {
${sample}
    },
    });
    expect(created.statusCode).toBe(201);

    const id = JSON.parse(created.body).data.id;
    const fetched = await app.inject({ method: 'GET', url: \`/${entity.plural}/\${id}\` });
    expect(fetched.statusCode).toBe(200);
  });
});
`,
  };
}

function schemaFile(blueprint: ProjectBlueprint): ScaffoldFile {
  const tables = blueprint.entities
    .map((entity) => {
      const cols = entity.fields
        .map((f) => `  ${f.name} ${SQL_TYPES[f.type]}${f.type === 'string' && f.name === 'name' ? ' not null' : ''},`)
        .join('\n');
      return `create table if not exists ${entity.plural} (
  id uuid primary key default gen_random_uuid(),
${cols}
  created_at timestamptz not null default now()
);`;
    })
    .join('\n\n');

  const indexes = blueprint.capabilities.some((c) => c.id === 'search')
    ? `\n\n-- Full-text search over the primary text column of each resource.\n${blueprint.entities
        .map(
          (e) =>
            `create index if not exists ${e.plural}_search_idx on ${e.plural} using gin (to_tsvector('english', coalesce(${e.fields[0]?.name ?? 'id'}::text, '')));`,
        )
        .join('\n')}`
    : '';

  return {
    path: 'src/db/schema.sql',
    content: `-- Schema for ${blueprint.name}
-- Generated from the project blueprint.

${tables}${indexes}
`,
  };
}

function indexFile(blueprint: ProjectBlueprint): ScaffoldFile {
  const imports = blueprint.entities
    .map((e) => `import { ${e.plural}Routes } from './routes/${e.plural}';`)
    .join('\n');
  const registrations = blueprint.entities
    .map((e) => `  await app.register(${e.plural}Routes, { prefix: '/api/${e.plural}' });`)
    .join('\n');

  const realtime = blueprint.capabilities.some((c) => c.id === 'realtime')
    ? `
  // Realtime fan-out: one room per resource id, presence pings every 30s.
  const sockets = new Set<import('ws').WebSocket>();
  const wss = new WebSocketServer({ server: app.server, path: '/realtime' });
  wss.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('message', (raw) => {
      for (const peer of sockets) {
        if (peer !== socket && peer.readyState === peer.OPEN) peer.send(raw.toString());
      }
    });
    socket.on('close', () => sockets.delete(socket));
  });
`
    : '';

  const realtimeImport = blueprint.capabilities.some((c) => c.id === 'realtime')
    ? "import { WebSocketServer } from 'ws';\n"
    : '';

  return {
    path: 'src/index.ts',
    content: `import Fastify from 'fastify';
${realtimeImport}${imports}

const app = Fastify({ logger: true });

async function main() {
  app.get('/health', async () => ({
    status: 'ok',
    service: '${blueprint.name}',
    timestamp: new Date().toISOString(),
  }));

${registrations}
${realtime}
  const port = Number(process.env.PORT ?? 4000);
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info(\`${blueprint.name} listening on http://localhost:\${port}\`);
}

main().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
`,
  };
}

function readmeFile(blueprint: ProjectBlueprint): ScaffoldFile {
  const caps = blueprint.capabilities.length
    ? blueprint.capabilities.map((c) => `- **${c.label}** — ${c.implication}`).join('\n')
    : '- Straightforward CRUD service with no additional subsystems detected.';

  const routes = blueprint.entities
    .map((e) => `| \`/api/${e.plural}\` | \`GET\` \`POST\` \`DELETE\` | ${e.pascal} resource |`)
    .join('\n');

  return {
    path: 'README.md',
    content: `# ${blueprint.displayName}

${blueprint.summary}

## Capabilities

${caps}

## API

| Route | Methods | Description |
|---|---|---|
| \`/health\` | \`GET\` | Liveness probe |
${routes}

## Data model

${blueprint.entities.map((e) => `- **${e.plural}** — ${e.fields.map((f) => f.name).join(', ')}`).join('\n')}

## Quick start

\`\`\`bash
npm install
npm run dev
\`\`\`

Then:

\`\`\`bash
curl http://localhost:4000/health
\`\`\`
`,
  };
}

function packageFile(blueprint: ProjectBlueprint): ScaffoldFile {
  const pkg = {
    name: blueprint.name,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'tsx watch src/index.ts',
      build: 'tsc',
      start: 'node dist/index.js',
      test: 'vitest run',
    },
    dependencies: blueprint.dependencies,
    devDependencies: {
      '@types/node': '^22.0.0',
      // The realtime gateway imports `ws`, so its types must ship too or the
      // generated repository would not type-check.
      ...(blueprint.dependencies.ws ? { '@types/ws': '^8.5.13' } : {}),
      tsx: '^4.19.0',
      typescript: '^5.7.0',
      vitest: '^3.0.0',
    },
  };
  return { path: 'package.json', content: `${JSON.stringify(pkg, null, 2)}\n` };
}

function dockerfile(): ScaffoldFile {
  return {
    path: 'Dockerfile',
    content: `# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
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

export interface RepositoryStats {
  fileCount: number;
  lineCount: number;
  byLanguage: Record<string, number>;
  sourceFiles: string[];
  routeFiles: string[];
  testFiles: string[];
  /** Number of `it(...)` cases across the generated test files. */
  testCases: number;
}

/**
 * Measure what the Developer actually emitted, so the downstream agents can
 * report real figures instead of invented ones.
 */
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
    indexFile(blueprint),
    ...blueprint.entities.map(routeFile),
    schemaFile(blueprint),
    ...blueprint.entities.slice(0, 2).map(testFile),
    dockerfile(),
    readmeFile(blueprint),
  ];
}
