/**
 * Project blueprint.
 *
 * Reads a one-line product idea and produces the model every downstream agent
 * works from: a repository name, the resources the system needs, how those
 * resources relate, and the cross-cutting capabilities implied.
 *
 * Resources come from two sources, in priority order:
 *   1. nouns lifted directly out of the prompt (see `domain.ts`) — whatever
 *      the user actually asked for always survives;
 *   2. the canonical resources of the best-matching domain profile, which
 *      supply what the domain implies but the sentence omits.
 *
 * Deterministic and side-effect free. When an LLM provider is configured the
 * Product Manager asks it for the resource list and passes it in, and this
 * becomes the fallback path.
 */

import {
  DOMAIN_PROFILES,
  detectDomain,
  extractPromptNouns,
  singularize,
  type DomainProfile,
} from './domain';

export interface BlueprintField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'timestamp' | 'uuid' | 'json';
  /** Set when this field is a foreign key; names the referenced resource. */
  references?: string;
}

export interface BlueprintEntity {
  /** snake_case singular identifier, e.g. "medical_record". */
  name: string;
  /** Plural form used for routes and tables. */
  plural: string;
  /** PascalCase form used for types. */
  pascal: string;
  fields: BlueprintField[];
}

export type CapabilityId =
  | 'realtime'
  | 'auth'
  | 'billing'
  | 'search'
  | 'storage'
  | 'notifications'
  | 'analytics'
  | 'scheduling'
  | 'ai';

export interface Capability {
  id: CapabilityId;
  label: string;
  implication: string;
}

export interface BlueprintRelation {
  from: string;
  to: string;
  /** Always many-to-one in the generated schema: `from` holds the key. */
  kind: 'many-to-one';
}

export interface ProjectBlueprint {
  name: string;
  displayName: string;
  summary: string;
  /** Label of the detected domain, or null when nothing matched confidently. */
  domain: string | null;
  entities: BlueprintEntity[];
  relations: BlueprintRelation[];
  capabilities: Capability[];
  dependencies: Record<string, string>;
}

const CAPABILITY_RULES: Array<{ id: CapabilityId; label: string; implication: string; keywords: string[] }> = [
  {
    id: 'realtime',
    label: 'Realtime collaboration',
    implication: 'WebSocket gateway with per-room fan-out and presence heartbeats',
    keywords: ['realtime', 'real-time', 'live', 'cursor', 'presence', 'collaborat', 'websocket', 'socket', 'sync', 'multiplayer'],
  },
  {
    id: 'auth',
    label: 'Authentication & tenancy',
    implication: 'Session auth with per-tenant row scoping on every query',
    keywords: ['auth', 'login', 'sign in', 'signin', 'sso', 'oauth', 'account', 'seat', 'tenant', 'permission', 'role'],
  },
  {
    id: 'billing',
    label: 'Billing & payments',
    implication: 'Stripe webhooks reconciled against a local subscription ledger',
    keywords: ['billing', 'stripe', 'subscription', 'payment', 'invoice', 'metering', 'checkout', 'pricing', 'dunning'],
  },
  {
    id: 'search',
    label: 'Search',
    implication: 'Postgres full-text search with a GIN index and ranked results',
    keywords: ['search', 'full-text', 'fulltext', 'query', 'filter', 'index', 'elasticsearch', 'clickhouse'],
  },
  {
    id: 'storage',
    label: 'Media & file storage',
    implication: 'S3-compatible object storage with scoped, short-lived presigned URLs',
    keywords: ['upload', 'file', 'image', 'video', 'media', 'attachment', 'recording', 'asset', 'photo', 'pdf', 'export'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    implication: 'Queue-backed delivery with retries and idempotency keys',
    keywords: ['notification', 'email', 'webhook', 'alert', 'digest', 'reminder', 'push'],
  },
  {
    id: 'analytics',
    label: 'Analytics & reporting',
    implication: 'Pre-aggregated rollup tables refreshed on write',
    keywords: ['analytics', 'metric', 'dashboard', 'chart', 'report', 'insight', 'stats', 'telemetry'],
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    implication: 'Cron-driven worker with timezone-aware recurrence rules',
    keywords: ['calendar', 'schedule', 'booking', 'cron', 'recurring', 'appointment', 'roadmap', 'cycle'],
  },
  {
    id: 'ai',
    label: 'AI features',
    implication: 'Embedding pipeline backed by a vector index for semantic recall',
    keywords: ['ai', 'llm', 'gpt', 'embedding', 'semantic', 'recommend', 'transcript', 'summar', 'agent'],
  },
];

const CAPABILITY_BY_ID = new Map(CAPABILITY_RULES.map((r) => [r.id, r]));

const NAME_STOPWORDS = new Set([
  'build', 'ship', 'create', 'design', 'prototype', 'add', 'make', 'develop', 'implement', 'a', 'an', 'the',
  'with', 'and', 'for', 'on', 'of', 'to', 'in', 'using', 'that', 'me', 'my', 'app', 'application', 'platform',
  'system', 'tool', 'service', 'website', 'site', 'style', 'like', 'top', 'its', 'their', 'some',
]);

function pluralize(word: string): string {
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

function toPascal(word: string): string {
  return word
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function f(
  name: string,
  type: BlueprintField['type'] = 'string',
  references?: string,
): BlueprintField {
  return references ? { name, type, references } : { name, type };
}

/**
 * Choose fields that suit the resource.
 *
 * Driven by what the name denotes rather than by a per-entity table, so a
 * resource nobody anticipated ("lab_result", "availability_slot") still gets a
 * sensible shape instead of a generic name/description pair.
 */
function inferFields(name: string): BlueprintField[] {
  const n = name.toLowerCase();
  const has = (...needles: string[]) => needles.some((needle) => n.includes(needle));

  if (has('user', 'player', 'member', 'customer', 'patient', 'doctor', 'guest', 'agent', 'contact', 'profile', 'author', 'student', 'driver', 'participant'))
    return [f('email'), f('display_name'), f('avatar_url')];

  if (has('message', 'comment', 'reply', 'post', 'note'))
    return [f('body'), f('author_id', 'uuid'), f('sent_at', 'timestamp')];

  if (has('invoice', 'payment', 'order', 'transaction', 'ledger', 'billing'))
    return [f('amount_cents', 'number'), f('currency'), f('status')];

  if (has('subscription', 'plan', 'enrollment'))
    return [f('plan'), f('status'), f('renews_at', 'timestamp')];

  if (has('appointment', 'booking', 'meeting', 'reservation', 'slot', 'session'))
    return [f('starts_at', 'timestamp'), f('ends_at', 'timestamp'), f('status')];

  if (has('event', 'activity', 'view_', 'log', 'delivery'))
    return [f('kind'), f('payload', 'json'), f('occurred_at', 'timestamp')];

  if (has('rating', 'score', 'benchmark', 'metric'))
    return [f('value', 'number'), f('scale'), f('recorded_at', 'timestamp')];

  if (has('game', 'match', 'experiment', 'run', 'tournament', 'shipment'))
    return [f('status'), f('started_at', 'timestamp'), f('finished_at', 'timestamp')];

  if (has('move', 'step', 'action'))
    return [f('sequence', 'number'), f('notation'), f('played_at', 'timestamp')];

  if (has('record', 'result', 'report', 'prescription', 'transcript'))
    return [f('summary'), f('body'), f('issued_at', 'timestamp')];

  if (has('document', 'paper', 'page', 'resume', 'article', 'lesson', 'block'))
    return [f('title'), f('body'), f('status')];

  if (has('file', 'export', 'recording', 'asset', 'media', 'dataset', 'attachment'))
    return [f('url'), f('content_type'), f('size_bytes', 'number')];

  if (has('product', 'listing', 'title', 'episode', 'course', 'template', 'puzzle'))
    return [f('name'), f('description'), f('published', 'boolean')];

  if (has('inventory', 'stock'))
    return [f('sku'), f('quantity', 'number'), f('warehouse')];

  if (has('ticket', 'issue', 'task'))
    return [f('title'), f('status'), f('priority')];

  if (has('dashboard', 'widget', 'query', 'view'))
    return [f('name'), f('config', 'json')];

  if (has('skill', 'label', 'tag', 'category'))
    return [f('name'), f('weight', 'number')];

  if (has('follow', 'like', 'reaction'))
    return [f('actor_id', 'uuid'), f('kind')];

  if (has('organization', 'company', 'workspace', 'club', 'team', 'channel', 'project', 'account'))
    return [f('name'), f('slug')];

  return [f('name'), f('description')];
}

function deriveName(text: string): { name: string; displayName: string } {
  const words = text
    .replace(/[^A-Za-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !NAME_STOPWORDS.has(w.toLowerCase()));

  const picked = words.slice(0, 3);
  if (picked.length === 0) return { name: 'forgeone-service', displayName: 'ForgeOne Service' };

  return {
    name: picked.join('-').toLowerCase(),
    displayName: picked.map((w) => (/[A-Z]/.test(w.slice(1)) ? w : toPascal(w))).join(' '),
  };
}

function toEntity(name: string): BlueprintEntity {
  const singular = singularize(name);
  return {
    name: singular,
    plural: pluralize(singular),
    pascal: toPascal(singular),
    fields: inferFields(singular),
  };
}

/** Cap on generated resources: enough to be interesting, few enough to read. */
const MAX_ENTITIES = 6;

export interface DeriveOptions {
  /**
   * Resource names supplied by an LLM. When present these take priority over
   * everything derived locally, and the domain profile only fills gaps.
   */
  suppliedResources?: string[];
}

export function deriveBlueprint(
  title: string,
  description: string,
  options: DeriveOptions = {},
): ProjectBlueprint {
  const prompt = `${title} ${description}`;
  const source = prompt.toLowerCase();

  const { profile, score } = detectDomain(prompt);
  // Require corroboration before trusting a domain — a single incidental word
  // should not drag an unrelated prompt into a domain's resource set.
  const domain: DomainProfile | null = score >= 2 ? profile : null;

  // 1. Whatever the caller or the prompt named explicitly.
  const ordered: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string): void => {
    const name = singularize(raw.toLowerCase().replace(/[\s-]+/g, '_'));
    if (!name || seen.has(name) || ordered.length >= MAX_ENTITIES) return;
    seen.add(name);
    ordered.push(name);
  };

  for (const supplied of options.suppliedResources ?? []) add(supplied);
  if (!options.suppliedResources?.length) {
    for (const noun of extractPromptNouns(prompt)) add(noun);
  }

  // 2. Canonical resources for the domain fill the remainder.
  if (domain) for (const resource of domain.resources) add(resource);

  // 3. Nothing recognised at all — model one generic resource plus an actor
  //    rather than pretending to have understood the prompt.
  if (ordered.length === 0) {
    add('resource');
    add('user');
  }

  const entities = ordered.map(toEntity);
  const byName = new Map(entities.map((e) => [e.name, e]));

  // Relations: only edges whose both ends were actually modelled.
  const relations: BlueprintRelation[] = [];
  for (const [child, parent] of domain?.relations ?? []) {
    const c = singularize(child);
    const p = singularize(parent);
    if (c === p || !byName.has(c) || !byName.has(p)) continue;
    if (relations.some((r) => r.from === c && r.to === p)) continue;
    relations.push({ from: c, to: p, kind: 'many-to-one' });
  }

  // Materialise each relation as a real foreign-key column on the child.
  for (const relation of relations) {
    const child = byName.get(relation.from)!;
    const column = `${relation.to}_id`;
    if (!child.fields.some((field) => field.name === column)) {
      child.fields.unshift(f(column, 'uuid', relation.to));
    }
  }

  // Capabilities: stated in the prompt, plus what the domain implies.
  const capabilityIds = new Set<CapabilityId>();
  for (const rule of CAPABILITY_RULES) {
    if (rule.keywords.some((kw) => source.includes(kw))) capabilityIds.add(rule.id);
  }
  for (const implied of domain?.implies ?? []) {
    if (CAPABILITY_BY_ID.has(implied as CapabilityId)) capabilityIds.add(implied as CapabilityId);
  }

  const capabilities: Capability[] = CAPABILITY_RULES.filter((r) => capabilityIds.has(r.id)).map(
    ({ id, label, implication }) => ({ id, label, implication }),
  );

  const dependencies: Record<string, string> = { fastify: '^5.0.0', zod: '^3.23.0', pg: '^8.13.0' };
  for (const cap of capabilities) {
    if (cap.id === 'realtime') dependencies.ws = '^8.18.0';
    if (cap.id === 'auth') dependencies['@fastify/jwt'] = '^9.0.0';
    if (cap.id === 'billing') dependencies.stripe = '^17.0.0';
    if (cap.id === 'storage') dependencies['@aws-sdk/client-s3'] = '^3.700.0';
    if (cap.id === 'notifications') dependencies.bullmq = '^5.0.0';
    if (cap.id === 'ai') dependencies['@anthropic-ai/sdk'] = '^0.32.0';
  }

  const { name, displayName } = deriveName(title || description);

  return {
    name,
    displayName,
    summary: (description || title).trim(),
    domain: domain?.label ?? null,
    entities,
    relations,
    capabilities,
    dependencies,
  };
}

export { DOMAIN_PROFILES };
