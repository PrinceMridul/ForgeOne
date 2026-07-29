/**
 * Repository guard.
 *
 * Everything a language model returns is untrusted input. The Developer agent
 * turns that output into files that are bundled into Repository.zip and handed
 * to a user to extract, so an unchecked path is a real archive-extraction
 * vulnerability (Zip Slip), not a theoretical one.
 *
 * A probe against the unguarded pipeline produced an archive containing
 * `../../../../etc/cron.d/backdoor`, `C:\Windows\System32\drivers\etc\hosts`
 * and a duplicated `src/routes/users.ts`. This module is the single choke
 * point that makes that impossible.
 *
 * The policy is deliberately strict and total: any file that cannot be made
 * safe is dropped and reported, never silently rewritten into something the
 * model did not ask for. If too little survives, the caller falls back to the
 * deterministic scaffold rather than shipping a half-formed repository.
 */

export interface GuardedFile {
  path: string;
  content: string;
}

export type RejectionReason =
  | 'empty-path'
  | 'absolute-path'
  | 'path-traversal'
  | 'illegal-character'
  | 'reserved-name'
  | 'path-too-long'
  | 'duplicate-path'
  | 'file-too-large'
  | 'budget-exceeded'
  | 'too-many-files'
  | 'empty-content';

export interface Rejection {
  path: string;
  reason: RejectionReason;
}

export interface GuardResult {
  files: GuardedFile[];
  rejections: Rejection[];
}

export interface GuardLimits {
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
  maxPathLength: number;
}

export const DEFAULT_LIMITS: GuardLimits = {
  /** Enough for a rich service; far below anything that would stall a demo. */
  maxFiles: 60,
  maxFileBytes: 256 * 1024,
  maxTotalBytes: 2 * 1024 * 1024,
  maxPathLength: 200,
};

/** Device names Windows refuses to create regardless of extension. */
const RESERVED_BASENAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

/** Control characters and the separators Windows rejects outright. */
const ILLEGAL_CHARS = /[\u0000-\u001f<>:"|?*]/;

/**
 * Resolve a path to a normalised, repository-relative form.
 *
 * Returns null when the path cannot be trusted. Traversal is evaluated after
 * normalisation, so `src/../../escape.ts` is caught even though it contains no
 * leading `..`.
 */
export function normalizeRepositoryPath(
  rawPath: string,
  maxPathLength: number = DEFAULT_LIMITS.maxPathLength,
): { path: string } | { reason: RejectionReason } {
  const trimmed = rawPath.trim();
  if (!trimmed) return { reason: 'empty-path' };

  // Treat backslashes as separators before anything else, so a Windows-style
  // path is analysed as a path rather than as one long filename.
  const unified = trimmed.replace(/\\/g, '/');

  if (ILLEGAL_CHARS.test(unified.replace(/^[a-zA-Z]:/, ''))) {
    return { reason: 'illegal-character' };
  }

  // Absolute in either flavour: /etc/passwd, C:/Windows, //server/share.
  if (unified.startsWith('/') || /^[a-zA-Z]:/.test(unified)) {
    return { reason: 'absolute-path' };
  }

  const resolved: string[] = [];
  for (const segment of unified.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      // Escaping the repository root is never recoverable.
      if (resolved.length === 0) return { reason: 'path-traversal' };
      resolved.pop();
      continue;
    }
    if (RESERVED_BASENAMES.has(segment.split('.')[0]!.toLowerCase())) {
      return { reason: 'reserved-name' };
    }
    // A trailing dot or space is silently stripped by Windows, which would
    // make two distinct entries collide after extraction.
    if (/[. ]$/.test(segment)) return { reason: 'illegal-character' };
    resolved.push(segment);
  }

  if (resolved.length === 0) return { reason: 'empty-path' };

  const normalized = resolved.join('/');
  if (normalized.length > maxPathLength) return { reason: 'path-too-long' };
  if (normalized.includes('..')) return { reason: 'path-traversal' };

  return { path: normalized };
}

/**
 * Apply the full policy to a candidate file set.
 *
 * Order matters: the first file to claim a path wins, so the result is
 * deterministic for a given input rather than depending on iteration order.
 */
export function guardRepositoryFiles(
  candidates: Array<{ path: string; content: string }>,
  limits: GuardLimits = DEFAULT_LIMITS,
): GuardResult {
  const files: GuardedFile[] = [];
  const rejections: Rejection[] = [];
  const claimed = new Set<string>();
  let totalBytes = 0;

  for (const candidate of candidates) {
    if (files.length >= limits.maxFiles) {
      rejections.push({ path: candidate.path, reason: 'too-many-files' });
      continue;
    }

    const result = normalizeRepositoryPath(candidate.path, limits.maxPathLength);
    if ('reason' in result) {
      rejections.push({ path: candidate.path, reason: result.reason });
      continue;
    }

    // Case-insensitive, because the archive may be extracted on a filesystem
    // that cannot hold both `README.md` and `readme.md`.
    const key = result.path.toLowerCase();
    if (claimed.has(key)) {
      rejections.push({ path: result.path, reason: 'duplicate-path' });
      continue;
    }

    const content = candidate.content ?? '';
    if (content.trim().length === 0) {
      rejections.push({ path: result.path, reason: 'empty-content' });
      continue;
    }

    const bytes = Buffer.byteLength(content, 'utf-8');
    if (bytes > limits.maxFileBytes) {
      rejections.push({ path: result.path, reason: 'file-too-large' });
      continue;
    }
    if (totalBytes + bytes > limits.maxTotalBytes) {
      rejections.push({ path: result.path, reason: 'budget-exceeded' });
      continue;
    }

    claimed.add(key);
    totalBytes += bytes;
    files.push({ path: result.path, content });
  }

  return { files, rejections };
}

/**
 * Does the surviving set look like a repository worth shipping?
 *
 * Used to decide whether provider output can be trusted or the deterministic
 * scaffold should take over. A model that returned three prose files and no
 * manifest has not produced a repository.
 */
export function isViableRepository(files: GuardedFile[]): boolean {
  if (files.length < 3) return false;
  return files.some((f) => f.path === 'package.json' || f.path.endsWith('/package.json'));
}

/** Human-readable summary for agent telemetry. */
export function describeRejections(rejections: Rejection[]): string {
  const counts = new Map<RejectionReason, number>();
  for (const r of rejections) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1);
  return [...counts.entries()].map(([reason, n]) => `${n} ${reason}`).join(', ');
}
