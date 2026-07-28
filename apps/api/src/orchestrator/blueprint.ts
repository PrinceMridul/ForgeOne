/**
 * Deterministic project blueprint.
 *
 * When no LLM key is configured the pipeline still has to produce artifacts,
 * and those artifacts are the demo's proof of work. Previously every run
 * produced the *same* output regardless of the prompt — the Architect even
 * emitted a blueprint of ForgeOne's own monorepo rather than of the thing the
 * user asked for.
 *
 * This module reads the prompt and derives a small, honest project model:
 * a name, the domain entities it mentions, and the capabilities it implies.
 * Every downstream agent renders its artifact from that model, so a run for a
 * chat app produces chat epics, a chat architecture, and chat routes.
 *
 * This is a template engine, not a language model. It is deterministic and
 * side-effect free, and agents are explicit in their telemetry that it is the
 * baseline generator. Configure an API key and the real provider output takes
 * precedence.
 */

export interface BlueprintField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'timestamp' | 'uuid';
}

export interface BlueprintEntity {
  /** Singular lower-case identifier, e.g. "channel". */
  name: string;
  /** Plural form used for routes and tables, e.g. "channels". */
  plural: string;
  /** PascalCase form used for types, e.g. "Channel". */
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
  /** Concrete technical consequence, used in architecture + task output. */
  implication: string;
}

export interface ProjectBlueprint {
  /** kebab-case repository name derived from the prompt. */
  name: string;
  /** Human-readable title. */
  displayName: string;
  /** The original prompt, trimmed. */
  summary: string;
  entities: BlueprintEntity[];
  capabilities: Capability[];
  /** Runtime dependencies implied by the detected capabilities. */
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
    implication: 'Session-based auth with per-tenant row scoping',
    keywords: ['auth', 'login', 'sign in', 'signin', 'sso', 'oauth', 'account', 'seat', 'tenant', 'permission', 'role'],
  },
  {
    id: 'billing',
    label: 'Billing & subscriptions',
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
    implication: 'S3-compatible object storage with presigned upload URLs',
    keywords: ['upload', 'file', 'image', 'video', 'media', 'attachment', 'recording', 'asset', 'photo'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    implication: 'Queue-backed delivery with retry and idempotency keys',
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

/** Domain nouns worth modelling as first-class resources, with their fields. */
const ENTITY_RULES: Array<{ match: string[]; name: string; fields: BlueprintField[] }> = [
  { match: ['channel'], name: 'channel', fields: [f('name'), f('topic'), f('isPrivate', 'boolean')] },
  { match: ['thread'], name: 'thread', fields: [f('parentId', 'uuid'), f('title'), f('replyCount', 'number')] },
  { match: ['message', 'chat', 'messaging'], name: 'message', fields: [f('body'), f('authorId', 'uuid'), f('sentAt', 'timestamp')] },
  { match: ['document', 'docs', 'doc', 'notion'], name: 'document', fields: [f('title'), f('body'), f('ownerId', 'uuid')] },
  { match: ['page'], name: 'page', fields: [f('title'), f('slug'), f('body')] },
  { match: ['comment'], name: 'comment', fields: [f('body'), f('authorId', 'uuid')] },
  { match: ['board', 'kanban'], name: 'board', fields: [f('name'), f('columnOrder')] },
  { match: ['card'], name: 'card', fields: [f('title'), f('description'), f('position', 'number')] },
  { match: ['issue'], name: 'issue', fields: [f('title'), f('status'), f('assigneeId', 'uuid')] },
  { match: ['task'], name: 'task', fields: [f('title'), f('status'), f('dueAt', 'timestamp')] },
  { match: ['project', 'tracker'], name: 'project', fields: [f('name'), f('slug'), f('archived', 'boolean')] },
  { match: ['product', 'storefront', 'ecommerce', 'commerce'], name: 'product', fields: [f('name'), f('priceCents', 'number'), f('sku')] },
  { match: ['order', 'cart', 'checkout'], name: 'order', fields: [f('status'), f('totalCents', 'number'), f('placedAt', 'timestamp')] },
  { match: ['subscription', 'billing', 'seat'], name: 'subscription', fields: [f('plan'), f('status'), f('renewsAt', 'timestamp')] },
  { match: ['invoice'], name: 'invoice', fields: [f('number'), f('amountCents', 'number'), f('paidAt', 'timestamp')] },
  { match: ['video', 'conferencing', 'conference', 'zoom', 'call', 'webrtc'], name: 'room', fields: [f('name'), f('startedAt', 'timestamp'), f('participantCount', 'number')] },
  { match: ['recording'], name: 'recording', fields: [f('roomId', 'uuid'), f('durationSeconds', 'number'), f('url')] },
  { match: ['whiteboard', 'canvas', 'excalidraw', 'figma'], name: 'canvas', fields: [f('name'), f('sceneVersion', 'number')] },
  { match: ['shape', 'stroke'], name: 'shape', fields: [f('canvasId', 'uuid'), f('kind'), f('payload')] },
  { match: ['dashboard'], name: 'dashboard', fields: [f('name'), f('layout')] },
  { match: ['widget'], name: 'widget', fields: [f('dashboardId', 'uuid'), f('kind'), f('config')] },
  { match: ['event', 'analytics'], name: 'event', fields: [f('kind'), f('payload'), f('occurredAt', 'timestamp')] },
  { match: ['workspace', 'team', 'organization', 'org'], name: 'workspace', fields: [f('name'), f('slug')] },
  { match: ['user', 'member', 'people', 'account'], name: 'user', fields: [f('email'), f('displayName'), f('avatarUrl')] },
  { match: ['note'], name: 'note', fields: [f('title'), f('body')] },
  { match: ['post', 'feed', 'social'], name: 'post', fields: [f('body'), f('authorId', 'uuid'), f('likeCount', 'number')] },
  { match: ['playlist', 'movie', 'show', 'netflix', 'stream'], name: 'title', fields: [f('name'), f('synopsis'), f('releaseYear', 'number')] },
  { match: ['booking', 'reservation', 'appointment'], name: 'booking', fields: [f('startsAt', 'timestamp'), f('endsAt', 'timestamp'), f('status')] },
  { match: ['ticket', 'support', 'helpdesk'], name: 'ticket', fields: [f('subject'), f('status'), f('priority')] },
];

function f(name: string, type: BlueprintField['type'] = 'string'): BlueprintField {
  return { name, type };
}

/**
 * Whole-word match allowing a plural or gerund suffix.
 *
 * Resource keywords must not match inside longer words: a plain substring
 * test made "Postgres" match the `post` rule, so a docs app came back with a
 * `posts` resource it never asked for. Capability keywords keep using
 * substring matching because several of them are deliberate stems
 * ("collaborat", "recommend").
 */
function matchesWord(haystack: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}(s|es|ing)?\\b`).test(haystack);
}

/** Verbs and filler that should never appear in a repository name. */
const NAME_STOPWORDS = new Set([
  'build', 'ship', 'create', 'design', 'prototype', 'add', 'make', 'develop', 'implement', 'a', 'an', 'the',
  'with', 'and', 'for', 'on', 'of', 'to', 'in', 'using', 'that', 'me', 'my', 'app', 'application', 'platform',
  'system', 'tool', 'service', 'website', 'site', 'clone', 'style', 'like', 'top', 'its', 'their', 'some',
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

function deriveName(text: string): { name: string; displayName: string } {
  // Keep the original tokens so capitalisation survives ("ForgeOne", "iOS"),
  // and only lower-case for the stopword comparison.
  const words = text
    .replace(/[^A-Za-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !NAME_STOPWORDS.has(w.toLowerCase()));

  const picked = words.slice(0, 3);
  if (picked.length === 0) return { name: 'forgeone-service', displayName: 'ForgeOne Service' };

  return {
    name: picked.join('-').toLowerCase(),
    // A word that already carries internal capitals is a proper noun — leave
    // it alone rather than flattening it to Title Case.
    displayName: picked.map((w) => (/[A-Z]/.test(w.slice(1)) ? w : toPascal(w))).join(' '),
  };
}

/**
 * Derive a project model from the user's prompt. Pure and deterministic:
 * the same prompt always yields the same blueprint.
 */
export function deriveBlueprint(title: string, description: string): ProjectBlueprint {
  const source = `${title} ${description}`.toLowerCase();

  const capabilities: Capability[] = CAPABILITY_RULES.filter((rule) =>
    rule.keywords.some((kw) => source.includes(kw)),
  ).map(({ id, label, implication }) => ({ id, label, implication }));

  const seen = new Set<string>();
  const entities: BlueprintEntity[] = [];
  for (const rule of ENTITY_RULES) {
    if (seen.has(rule.name)) continue;
    if (rule.match.some((kw) => matchesWord(source, kw))) {
      seen.add(rule.name);
      entities.push({
        name: rule.name,
        plural: pluralize(rule.name),
        pascal: toPascal(rule.name),
        fields: rule.fields,
      });
    }
    if (entities.length >= 4) break;
  }

  // Always model an owner/actor so generated code has something to scope by.
  if (!seen.has('user') && entities.length < 4) {
    entities.push({
      name: 'user',
      plural: 'users',
      pascal: 'User',
      fields: [f('email'), f('displayName'), f('avatarUrl')],
    });
  }

  // Nothing recognised — fall back to a single generic resource rather than
  // pretending to understand the prompt.
  if (entities.length === 0) {
    entities.push({
      name: 'resource',
      plural: 'resources',
      pascal: 'Resource',
      fields: [f('name'), f('description')],
    });
  }

  const dependencies: Record<string, string> = {
    fastify: '^5.0.0',
    zod: '^3.23.0',
  };
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
    entities,
    capabilities,
    dependencies,
  };
}
