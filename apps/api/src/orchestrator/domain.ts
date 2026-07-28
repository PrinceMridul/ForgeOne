/**
 * Domain inference.
 *
 * Turning a one-line product idea into a resource model is the part of the
 * pipeline that most has to *look* like understanding. A flat keyword table
 * cannot do it: "Build a chess platform" contains no nouns worth modelling,
 * yet the right answer is players, games, moves, ratings and tournaments.
 *
 * Two complementary signals are used, in priority order:
 *
 *  1. **Nouns lifted from the prompt itself.** Whatever the user explicitly
 *     asked for is authoritative and always survives. This is genuine
 *     extraction, not matching — it works for domains nobody anticipated.
 *  2. **A domain profile.** Each profile is scored against the prompt, and
 *     the best-scoring one contributes the canonical resources that the
 *     domain implies but the sentence omits. Profiles carry the knowledge a
 *     product engineer would bring to the conversation.
 *
 * When an LLM provider is configured the Product Manager asks it for the
 * resource list instead, and this module becomes the fallback.
 */

export interface DomainProfile {
  id: string;
  label: string;
  /**
   * Terms that hint at this domain. Worth 1 point each, so two are needed
   * before a domain is accepted — an incidental word should not drag an
   * unrelated prompt into a domain's resource set.
   */
  signals: string[];
  /**
   * Terms that are conclusive on their own, worth 2 points. "chess" or
   * "hospital" in a product brief leaves no real ambiguity.
   */
  strongSignals?: string[];
  /** Canonical resources for the domain, most central first. */
  resources: string[];
  /** Capability ids this domain implies even if unstated. */
  implies: string[];
  /**
   * Foreign-key edges as [child, parent]. Only edges that are unambiguously
   * correct for the domain — the schema generator turns these into real
   * references, so a wrong guess would produce a wrong database.
   */
  relations?: Array<[string, string]>;
}

/**
 * Ordered by specificity: narrow domains are listed before broad ones so a
 * tie resolves toward the more specific reading.
 */
export const DOMAIN_PROFILES: DomainProfile[] = [
  {
    id: 'chess',
    label: 'Chess platform',
    signals: ['chess', 'checkmate', 'elo', 'pgn', 'grandmaster', 'chessboard', 'opening repertoire'],
    strongSignals: ['chess', 'checkmate', 'chessboard'],
    resources: ['player', 'game', 'move', 'rating', 'tournament', 'puzzle', 'club'],
    implies: ['realtime', 'auth'],
    relations: [['move', 'game'], ['rating', 'player'], ['game', 'tournament']],
  },
  {
    id: 'healthcare',
    label: 'Healthcare management',
    signals: ['hospital', 'clinic', 'patient', 'doctor', 'medical', 'health record', 'ehr', 'emr', 'prescription', 'diagnosis', 'physician', 'nurse'],
    strongSignals: ['hospital', 'clinic', 'ehr', 'emr', 'patient', 'physician'],
    resources: ['patient', 'doctor', 'appointment', 'medical_record', 'prescription', 'lab_result', 'invoice'],
    implies: ['auth', 'notifications'],
    relations: [['appointment', 'patient'], ['medical_record', 'patient'], ['prescription', 'patient'], ['lab_result', 'patient'], ['invoice', 'patient']],
  },
  {
    id: 'streaming',
    label: 'Media streaming',
    signals: ['netflix', 'streaming', 'movie', 'episode', 'series', 'watchlist', 'binge', 'spotify', 'video on demand', 'vod'],
    strongSignals: ['netflix', 'streaming', 'watchlist', 'video on demand'],
    resources: ['title', 'episode', 'profile', 'watchlist', 'view_event', 'subscription'],
    implies: ['storage', 'ai', 'billing'],
    relations: [['episode', 'title'], ['watchlist', 'profile'], ['view_event', 'profile'], ['subscription', 'profile']],
  },
  {
    id: 'research',
    label: 'Research platform',
    signals: ['research', 'paper', 'dataset', 'experiment', 'benchmark', 'citation', 'preprint', 'arxiv', 'hypothesis', 'reproducib'],
    strongSignals: ['arxiv', 'preprint', 'research platform', 'dataset'],
    resources: ['paper', 'dataset', 'experiment', 'model', 'benchmark', 'run'],
    implies: ['storage', 'search', 'ai'],
    relations: [['experiment', 'dataset'], ['run', 'experiment'], ['benchmark', 'model']],
  },
  {
    id: 'ecommerce',
    label: 'Commerce',
    signals: ['ecommerce', 'e-commerce', 'storefront', 'shop', 'cart', 'checkout', 'product catalog', 'merchandis', 'sku', 'retail'],
    strongSignals: ['ecommerce', 'e-commerce', 'storefront', 'shopping cart'],
    resources: ['product', 'order', 'customer', 'inventory_item', 'payment', 'review'],
    implies: ['billing', 'search'],
    relations: [['order', 'customer'], ['payment', 'order'], ['review', 'product'], ['inventory_item', 'product']],
  },
  {
    id: 'chat',
    label: 'Team messaging',
    signals: ['slack', 'chat', 'messaging', 'channel', 'thread', 'presence', 'discord', 'direct message'],
    strongSignals: ['slack', 'discord', 'team chat'],
    resources: ['channel', 'message', 'thread', 'member', 'reaction'],
    implies: ['realtime', 'auth', 'search'],
    relations: [['message', 'channel'], ['thread', 'channel'], ['reaction', 'message']],
  },
  {
    id: 'meetings',
    label: 'Video meetings',
    signals: ['zoom', 'video conferenc', 'webrtc', 'meeting', 'call', 'breakout', 'screen shar', 'transcript'],
    strongSignals: ['zoom', 'video conferenc', 'webrtc'],
    resources: ['meeting', 'participant', 'recording', 'transcript'],
    implies: ['realtime', 'storage'],
    relations: [['participant', 'meeting'], ['recording', 'meeting'], ['transcript', 'recording']],
  },
  {
    id: 'project_management',
    label: 'Project management',
    signals: ['linear', 'jira', 'kanban', 'issue tracker', 'project tracker', 'sprint', 'backlog', 'roadmap', 'cycle', 'task manage'],
    strongSignals: ['jira', 'kanban', 'issue tracker', 'project tracker', 'linear-style'],
    resources: ['project', 'issue', 'cycle', 'comment', 'label'],
    implies: ['auth', 'notifications'],
    relations: [['issue', 'project'], ['comment', 'issue'], ['cycle', 'project']],
  },
  {
    id: 'crm',
    label: 'CRM',
    signals: ['crm', 'salesforce', 'hubspot', 'lead', 'pipeline', 'deal', 'sales', 'prospect', 'contact manage'],
    strongSignals: ['crm', 'salesforce', 'hubspot'],
    resources: ['contact', 'company', 'deal', 'activity', 'pipeline_stage'],
    implies: ['auth', 'notifications', 'analytics'],
    relations: [['deal', 'company'], ['contact', 'company'], ['activity', 'deal']],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    signals: ['analytics', 'clickhouse', 'metrics dashboard', 'telemetry', 'reporting', 'bi ', 'business intelligence', 'saved quer'],
    strongSignals: ['clickhouse', 'business intelligence', 'analytics dashboard'],
    resources: ['event', 'dashboard', 'widget', 'query', 'data_source'],
    implies: ['analytics', 'search'],
    relations: [['widget', 'dashboard'], ['query', 'data_source'], ['event', 'data_source']],
  },
  {
    id: 'docs',
    label: 'Collaborative documents',
    signals: ['notion', 'docs app', 'document editor', 'wiki', 'knowledge base', 'collaborative doc', 'google docs'],
    strongSignals: ['notion', 'wiki', 'knowledge base'],
    resources: ['document', 'page', 'block', 'comment', 'workspace'],
    implies: ['realtime', 'search', 'auth'],
    relations: [['page', 'document'], ['block', 'page'], ['comment', 'document'], ['document', 'workspace']],
  },
  {
    id: 'resume',
    label: 'Resume builder',
    signals: ['resume', 'cv builder', 'curriculum vitae', 'cover letter', 'portfolio builder'],
    strongSignals: ['resume', 'curriculum vitae', 'cv builder'],
    resources: ['resume', 'template', 'section', 'skill', 'export'],
    implies: ['storage', 'auth'],
    relations: [['section', 'resume'], ['skill', 'resume'], ['export', 'resume']],
  },
  {
    id: 'lms',
    label: 'Learning platform',
    signals: ['course', 'lms', 'learning platform', 'student', 'quiz', 'lesson', 'curriculum', 'e-learning'],
    strongSignals: ['lms', 'learning platform', 'e-learning'],
    resources: ['course', 'lesson', 'enrollment', 'quiz', 'submission'],
    implies: ['auth', 'storage'],
    relations: [['lesson', 'course'], ['enrollment', 'course'], ['quiz', 'lesson'], ['submission', 'quiz']],
  },
  {
    id: 'booking',
    label: 'Booking & reservations',
    signals: ['booking', 'reservation', 'appointment schedul', 'calendly', 'airbnb', 'hotel', 'restaurant table'],
    strongSignals: ['airbnb', 'calendly', 'reservation'],
    resources: ['listing', 'booking', 'guest', 'availability_slot', 'review'],
    implies: ['scheduling', 'billing', 'notifications'],
    relations: [['booking', 'listing'], ['availability_slot', 'listing'], ['review', 'listing']],
  },
  {
    id: 'social',
    label: 'Social network',
    signals: ['social network', 'twitter', 'instagram', 'feed', 'follower', 'timeline', 'newsfeed'],
    strongSignals: ['social network', 'twitter', 'instagram'],
    resources: ['post', 'profile', 'follow', 'comment', 'like'],
    implies: ['realtime', 'storage', 'search'],
    relations: [['post', 'profile'], ['comment', 'post'], ['like', 'post'], ['follow', 'profile']],
  },
  {
    id: 'fintech',
    label: 'Financial services',
    signals: ['banking', 'fintech', 'wallet', 'ledger', 'transaction', 'payment', 'expense', 'accounting', 'invoicing'],
    strongSignals: ['fintech', 'banking', 'accounting'],
    resources: ['account', 'transaction', 'ledger_entry', 'invoice', 'payment_method'],
    implies: ['auth', 'billing'],
    relations: [['transaction', 'account'], ['ledger_entry', 'transaction'], ['payment_method', 'account'], ['invoice', 'account']],
  },
  {
    id: 'logistics',
    label: 'Logistics & delivery',
    signals: ['logistics', 'delivery', 'shipment', 'fleet', 'courier', 'warehouse', 'tracking number', 'last mile'],
    strongSignals: ['logistics', 'courier', 'last mile'],
    resources: ['shipment', 'driver', 'vehicle', 'route', 'delivery_event'],
    implies: ['realtime', 'notifications'],
    relations: [['shipment', 'driver'], ['route', 'driver'], ['delivery_event', 'shipment'], ['driver', 'vehicle']],
  },
  {
    id: 'support',
    label: 'Customer support',
    signals: ['helpdesk', 'support ticket', 'zendesk', 'service desk', 'customer support', 'sla'],
    strongSignals: ['helpdesk', 'zendesk', 'service desk'],
    resources: ['ticket', 'customer', 'agent', 'reply', 'sla_policy'],
    implies: ['auth', 'notifications', 'search'],
    relations: [['ticket', 'customer'], ['reply', 'ticket'], ['ticket', 'agent']],
  },
  {
    id: 'saas',
    label: 'SaaS platform',
    signals: ['saas', 'subscription billing', 'team seat', 'usage metering', 'multi-tenant', 'billing portal'],
    strongSignals: ['saas', 'multi-tenant'],
    resources: ['organization', 'member', 'subscription', 'invoice', 'usage_record'],
    implies: ['billing', 'auth'],
    relations: [['member', 'organization'], ['subscription', 'organization'], ['invoice', 'subscription'], ['usage_record', 'subscription']],
  },
];

/** Words that are never resources, however they appear in a sentence. */
const NON_RESOURCE_WORDS = new Set([
  'app', 'apps', 'application', 'applications', 'platform', 'platforms', 'system', 'systems',
  'tool', 'tools', 'service', 'services', 'website', 'websites', 'site', 'sites', 'clone',
  'clones', 'backend', 'frontend', 'api', 'apis', 'database', 'databases', 'server', 'servers',
  'feature', 'features', 'support', 'style', 'time', 'user_experience', 'thing', 'things',
  'stuff', 'way', 'ways', 'kind', 'type', 'types', 'version', 'versions', 'example', 'examples',
  'postgres', 'postgresql', 'mysql', 'sqlite', 'redis', 'mongodb', 'clickhouse', 'kafka',
  'docker', 'kubernetes', 'stripe', 'aws', 'gcp', 'azure', 'react', 'node', 'typescript',
  'javascript', 'python', 'rust', 'golang', 'fastify', 'express', 'django', 'rails',
  'webrtc', 'websocket', 'websockets', 'graphql', 'rest', 'oauth', 'sso', 'jwt',
  'realtime', 'real-time', 'live', 'offline', 'sync', 'cursor', 'cursors', 'drag', 'drop',
  'search', 'full-text', 'fulltext', 'import', 'export', 'integration', 'integrations',
  'dashboard_ui', 'ui', 'ux', 'analytics', 'metrics', 'design', 'layout', 'theme', 'dark', 'light', 'mode',
  'idea', 'ideas', 'project_idea', 'prototype', 'mvp', 'demo', 'poc',
]);

/** Verbs and determiners that precede the real subject of the sentence. */
const LEADING_NOISE = new Set([
  'build', 'ship', 'create', 'design', 'prototype', 'add', 'make', 'develop', 'implement',
  'a', 'an', 'the', 'my', 'our', 'me', 'some', 'new', 'simple', 'basic', 'small', 'full',
  'complete', 'modern', 'like', 'style', 'styled', 'inspired', 'similar', 'to', 'of', 'for',
  'with', 'and', 'or', 'that', 'which', 'using', 'via', 'on', 'in', 'at', 'by', 'from',
  'top', 'its', 'their', 'this', 'these', 'those', 'it', 'them',
]);

const IRREGULAR_SINGULARS: Record<string, string> = {
  people: 'person',
  children: 'child',
  men: 'man',
  women: 'woman',
  data: 'record',
  media: 'media_asset',
  metrics: 'metric',
  matches: 'match',
  classes: 'class',
  addresses: 'address',
  statuses: 'status',
  indices: 'index',
  categories: 'category',
  companies: 'company',
  activities: 'activity',
  entries: 'entry',
  queries: 'query',
  libraries: 'library',
  policies: 'policy',
  repositories: 'repository',
};

/** Best-effort singularisation. Deliberately conservative. */
export function singularize(word: string): string {
  const lower = word.toLowerCase();
  if (IRREGULAR_SINGULARS[lower]) return IRREGULAR_SINGULARS[lower];
  if (lower.endsWith('ss') || lower.endsWith('us') || lower.endsWith('is')) return lower;
  if (lower.endsWith('ies') && lower.length > 4) return `${lower.slice(0, -3)}y`;
  if (lower.endsWith('ches') || lower.endsWith('shes') || lower.endsWith('xes') || lower.endsWith('zes'))
    return lower.slice(0, -2);
  if (lower.endsWith('s') && lower.length > 3) return lower.slice(0, -1);
  return lower;
}

/**
 * Lift candidate resource nouns straight out of the prompt.
 *
 * Two shapes carry almost all the signal in a product one-liner:
 *   - an explicit list: "with channels, threads, and presence"
 *   - bare plural nouns anywhere: "patients", "appointments"
 * Both are collected, singularised and filtered against the noise lists.
 */
export function extractPromptNouns(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string): void => {
    // Keep compound nouns as snake_case: "medical records" -> medical_record.
    const cleaned = raw
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s-]+/g, '_');
    if (!cleaned) return;

    const parts = cleaned.split('_').filter((p) => p && !LEADING_NOISE.has(p));
    if (parts.length === 0 || parts.length > 3) return;

    const last = singularize(parts[parts.length - 1]!);
    const name = [...parts.slice(0, -1), last].join('_');

    if (name.length < 3 || name.length > 32) return;
    if (NON_RESOURCE_WORDS.has(name) || NON_RESOURCE_WORDS.has(last)) return;
    if (LEADING_NOISE.has(name)) return;
    if (seen.has(name)) return;

    seen.add(name);
    found.push(name);
  };

  // 1. Comma / "and" separated lists — the most reliable signal.
  for (const match of text.matchAll(/\bwith\s+([^.;!?]+)/gi)) {
    const list = match[1] ?? '';
    for (const item of list.split(/,|\band\b|\bplus\b|&/i)) push(item);
  }

  // 2. Bare plural nouns anywhere in the sentence.
  for (const match of text.matchAll(/\\b([a-z][a-z-]{2,}[^s])s\\b/gi)) {
    push(match[1] ? `${match[1]}s` : '');
  }

  return found;
}

export interface DomainMatch {
  profile: DomainProfile | null;
  score: number;
}

/** Score each profile against the prompt and return the strongest match. */
export function detectDomain(text: string): DomainMatch {
  const haystack = text.toLowerCase();
  let best: DomainMatch = { profile: null, score: 0 };

  for (const profile of DOMAIN_PROFILES) {
    let score = 0;
    for (const signal of profile.strongSignals ?? []) {
      if (haystack.includes(signal)) score += 2;
    }
    for (const signal of profile.signals) {
      if (haystack.includes(signal)) score += signal.includes(' ') ? 2 : 1;
    }
    // A resource named outright is strong corroboration.
    for (const resource of profile.resources) {
      const word = resource.replace(/_/g, ' ');
      if (haystack.includes(word)) score += 1;
    }
    if (score > best.score) best = { profile, score };
  }

  return best;
}
