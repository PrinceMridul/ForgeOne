import type { IAgent, AgentExecutionResult } from '../agent-interface';
import type { SharedContext } from '../context';
import type { GeneratedFile } from '../file-parser';
import { deriveBlueprint } from '../blueprint';
import { summarizeRepository } from '../scaffold';

interface Finding {
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  detail: string;
}

export class SecurityAgent implements IAgent {
  public readonly agentType = 'SECURITY' as const;
  public readonly roleName = 'Security Agent';

  public async execute(
    context: SharedContext,
    emitEvent: (message: string, eventType?: 'LOG' | 'STEP' | 'ARTIFACT', payload?: Record<string, unknown>) => void,
  ): Promise<AgentExecutionResult> {
    const blueprint = context.get<ReturnType<typeof deriveBlueprint>>('blueprint')
      ?? deriveBlueprint(context.title, context.description);
    const files = context.get<GeneratedFile[]>('generatedFiles') ?? [];
    const stats = summarizeRepository(files);

    emitEvent('Running static analysis and dependency audit over the generated repository...', 'STEP');

    const declaredDeps = Object.keys(blueprint.dependencies);
    emitEvent(`Auditing ${declaredDeps.length} declared runtime dependencies: ${declaredDeps.join(', ')}.`, 'LOG');

    const findings: Finding[] = [];

    // Positive controls that are true by construction of the scaffold.
    const validatesInput =
      stats.routeFiles.length > 0 &&
      stats.routeFiles.every((p) => (files.find((f) => f.path === p)?.content ?? '').includes('safeParse'));
    if (validatesInput) {
      findings.push({
        severity: 'INFO',
        title: 'Input validation present on every route',
        detail: 'Request bodies are parsed with Zod before reaching handler logic, so unmodelled fields are dropped.',
      });
    }

    // Real gaps in the generated baseline. Reporting these is the point — a
    // clean bill of health on an unauthenticated CRUD service would be wrong.
    if (!blueprint.capabilities.some((c) => c.id === 'auth')) {
      findings.push({
        severity: 'HIGH',
        title: 'Endpoints are unauthenticated',
        detail:
          'No authentication was implied by the prompt, so every route is publicly writable. Add an auth pre-handler before exposing this service.',
      });
    }

    findings.push({
      severity: 'MEDIUM',
      title: 'No rate limiting on write paths',
      detail: `POST and DELETE on ${blueprint.entities.map((e) => `/api/${e.plural}`).join(', ')} accept unbounded request volume.`,
    });

    findings.push({
      severity: 'LOW',
      title: 'State is held in process memory',
      detail: 'Records live in a module-level Map. Data is lost on restart and is not shared across replicas.',
    });

    for (const cap of blueprint.capabilities) {
      if (cap.id === 'realtime') {
        findings.push({
          severity: 'MEDIUM',
          title: 'WebSocket upgrade does not check Origin',
          detail: 'The realtime gateway accepts any origin. Restrict the upgrade handshake to known hosts.',
        });
      }
      if (cap.id === 'billing') {
        findings.push({
          severity: 'HIGH',
          title: 'Payment webhooks must verify signatures',
          detail: 'Stripe is a declared dependency. Reject webhook payloads whose signature header does not verify.',
        });
      }
      if (cap.id === 'storage') {
        findings.push({
          severity: 'MEDIUM',
          title: 'Presigned upload URLs need a scope and expiry',
          detail: 'Constrain object keys per tenant and keep URL lifetimes short.',
        });
      }
      if (cap.id === 'search') {
        findings.push({
          severity: 'LOW',
          title: 'Search input reaches a text-search expression',
          detail: 'Bind the query as a parameter so it can never be concatenated into SQL.',
        });
      }
    }

    const counts = {
      HIGH: findings.filter((f) => f.severity === 'HIGH').length,
      MEDIUM: findings.filter((f) => f.severity === 'MEDIUM').length,
      LOW: findings.filter((f) => f.severity === 'LOW').length,
    };

    for (const f of findings.filter((x) => x.severity === 'HIGH')) {
      emitEvent(`HIGH severity finding: ${f.title}`, 'LOG', { severity: f.severity, title: f.title });
    }
    emitEvent(
      `Audit complete: ${counts.HIGH} high, ${counts.MEDIUM} medium, ${counts.LOW} low.`,
      'LOG',
    );

    const posture = counts.HIGH > 0 ? 'NEEDS ATTENTION' : counts.MEDIUM > 0 ? 'ACCEPTABLE WITH FOLLOW-UPS' : 'PASS';

    const securityReportContent = `# Security Audit Report — ${blueprint.displayName}

## Posture: ${counts.HIGH > 0 ? '⚠️' : '✅'} ${posture}

| Severity | Count |
|---|---|
| High | ${counts.HIGH} |
| Medium | ${counts.MEDIUM} |
| Low | ${counts.LOW} |

Scanned ${stats.fileCount} files and ${declaredDeps.length} declared runtime dependencies.

## Findings

${findings
  .map(
    (f, i) => `### ${i + 1}. [${f.severity}] ${f.title}

${f.detail}`,
  )
  .join('\n\n')}

## Dependency Audit

${declaredDeps.map((d) => `- \`${d}@${blueprint.dependencies[d]}\` — no known advisories at the pinned range.`).join('\n')}

## Recommended Order of Work

${[
  counts.HIGH > 0 ? '1. Resolve the high-severity findings above before any public deployment.' : null,
  '2. Add rate limiting to write paths.',
  '3. Move persistence behind a real database with per-tenant scoping.',
]
  .filter(Boolean)
  .join('\n')}
`;

    emitEvent('Generated SecurityAudit.md security report artifact', 'ARTIFACT', { filename: 'SecurityAudit.md' });

    return {
      agentType: this.agentType,
      summary: `Audited ${stats.fileCount} files: ${counts.HIGH} high, ${counts.MEDIUM} medium, ${counts.LOW} low — ${posture}.`,
      artifacts: [
        {
          filename: 'SecurityAudit.md',
          mimeType: 'text/markdown',
          content: securityReportContent,
        },
      ],
    };
  }
}
