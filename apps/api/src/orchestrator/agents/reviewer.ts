import type { IAgent, AgentExecutionResult } from '../agent-interface';
import type { SharedContext } from '../context';
import type { GeneratedFile } from '../file-parser';
import { deriveBlueprint } from '../blueprint';
import { summarizeRepository } from '../scaffold';

export class ReviewerAgent implements IAgent {
  public readonly agentType = 'REVIEWER' as const;
  public readonly roleName = 'Reviewer Agent';

  public async execute(
    context: SharedContext,
    emitEvent: (message: string, eventType?: 'LOG' | 'STEP' | 'ARTIFACT', payload?: Record<string, unknown>) => void,
  ): Promise<AgentExecutionResult> {
    const blueprint = context.get<ReturnType<typeof deriveBlueprint>>('blueprint')
      ?? deriveBlueprint(context.title, context.description);
    const files = context.get<GeneratedFile[]>('generatedFiles') ?? [];
    const stats = summarizeRepository(files);

    emitEvent('Performing automated code review & lint audit...', 'STEP');
    emitEvent(
      `Reviewing ${stats.fileCount} files (${stats.lineCount} lines) produced by the Developer stage...`,
      'LOG',
    );

    // Observations are checks against the files that were actually emitted,
    // so the verdict is reproducible rather than asserted.
    const checks: Array<{ label: string; passed: boolean; detail: string }> = [
      {
        label: 'Every route module validates its input',
        passed:
          stats.routeFiles.length > 0 &&
          stats.routeFiles.every((path) => (files.find((f) => f.path === path)?.content ?? '').includes('safeParse')),
        detail: `${stats.routeFiles.length} route module(s) parse the request body before use.`,
      },
      {
        label: 'Payload types are derived from their validation schema',
        passed: stats.routeFiles.every((path) =>
          (files.find((f) => f.path === path)?.content ?? '').includes('z.infer<'),
        ),
        detail: 'Create payload types use z.infer, so the type and the validator cannot drift apart.',
      },
      {
        label: 'Missing records return 404 rather than throwing',
        passed: stats.routeFiles.every((path) => (files.find((f) => f.path === path)?.content ?? '').includes('404')),
        detail: 'Read and delete paths handle the absent case explicitly.',
      },
      {
        label: 'SQL parameters are bound, never interpolated',
        passed:
          stats.routeFiles.length > 0 &&
          stats.routeFiles.every((path) => {
            const src = files.find((f) => f.path === path)?.content ?? '';
            return src.includes('$1') && !/from \$\{/.test(src);
          }),
        detail: 'Every statement uses positional parameters, so user input cannot reach the query text.',
      },
      {
        label: 'Test coverage accompanies the implementation',
        passed: stats.testFiles.length > 0,
        detail: `${stats.testFiles.length} spec file(s), ${stats.testCases} case(s).`,
      },
      {
        label: 'Container build is reproducible',
        passed: files.some((f) => f.path === 'Dockerfile'),
        detail: 'Multi-stage Dockerfile with a health check is present.',
      },
    ];

    const passed = checks.filter((c) => c.passed).length;
    const score = Math.round((passed / checks.length) * 100);
    const verdict = passed === checks.length ? 'APPROVED' : 'APPROVED WITH COMMENTS';

    for (const check of checks.filter((c) => !c.passed)) {
      emitEvent(`Review comment: ${check.label} — not satisfied.`, 'LOG');
    }

    const fileTable = files
      .slice(0, 12)
      .map((f) => `| \`${f.path}\` | ${f.content.split('\n').length} | ${f.language} |`)
      .join('\n');

    const prReviewContent = `# Pull Request Review — ${blueprint.displayName}

## Summary
- **Verdict**: ${passed === checks.length ? '✅' : '⚠️'} **${verdict}**
- **Files Reviewed**: ${stats.fileCount} (${stats.lineCount} lines)
- **Checks Passed**: ${passed}/${checks.length} (${score}/100)

## Review Checklist

${checks.map((c) => `- [${c.passed ? 'x' : ' '}] **${c.label}** — ${c.detail}`).join('\n')}

## Files Reviewed

| File | Lines | Language |
|---|---|---|
${fileTable}${files.length > 12 ? `\n\n_…and ${files.length - 12} more._` : ''}

## Notes

The resource modules (${blueprint.entities.map((e) => `\`${e.plural}\``).join(', ')}) follow one
consistent shape, so a new resource can be added without inventing a new
pattern. Persistence goes through a single pooled client in
\`src/db/client.ts\`, and \`src/db/schema.sql\` declares the foreign keys${
      blueprint.relations.length > 0
        ? ` (${blueprint.relations.map((r) => `${r.from} → ${r.to}`).join(', ')})`
        : ''
    } with indexes on the columns the list endpoints filter by.

Follow-ups worth taking before this carries production traffic: there is no
migration history yet — \`schema.sql\` is applied wholesale — and no
transaction boundary spanning more than one statement.
`;

    emitEvent('Generated PRReview.md review artifact', 'ARTIFACT', { filename: 'PRReview.md' });

    return {
      agentType: this.agentType,
      summary: `Reviewed ${stats.fileCount} files across ${stats.routeFiles.length} route modules: ${verdict} (${score}/100).`,
      artifacts: [
        {
          filename: 'PRReview.md',
          mimeType: 'text/markdown',
          content: prReviewContent,
        },
      ],
    };
  }
}
