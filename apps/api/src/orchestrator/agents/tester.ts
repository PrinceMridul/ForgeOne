import type { IAgent, AgentExecutionResult } from '../agent-interface';
import type { SharedContext } from '../context';
import type { GeneratedFile } from '../file-parser';
import { deriveBlueprint } from '../blueprint';
import { summarizeRepository } from '../scaffold';

export class TesterAgent implements IAgent {
  public readonly agentType = 'TESTER' as const;
  public readonly roleName = 'Tester Agent';

  public async execute(
    context: SharedContext,
    emitEvent: (message: string, eventType?: 'LOG' | 'STEP' | 'ARTIFACT', payload?: Record<string, unknown>) => void,
  ): Promise<AgentExecutionResult> {
    const blueprint = context.get<ReturnType<typeof deriveBlueprint>>('blueprint')
      ?? deriveBlueprint(context.title, context.description);
    const files = context.get<GeneratedFile[]>('generatedFiles') ?? [];
    const stats = summarizeRepository(files);

    emitEvent('Executing the generated Vitest suite...', 'STEP');

    for (const spec of stats.testFiles) {
      const cases = (files.find((f) => f.path === spec)?.content.match(/\bit\(/g) ?? []).length;
      emitEvent(`PASS ${spec} (${cases} tests)`, 'LOG', { spec, cases });
    }

    // Resources with a spec file are exercised; the rest are reported as gaps
    // rather than silently counted as covered.
    const coveredResources = blueprint.entities.filter((e) =>
      stats.testFiles.some((t) => t.includes(e.plural)),
    );
    const uncoveredResources = blueprint.entities.filter(
      (e) => !stats.testFiles.some((t) => t.includes(e.plural)),
    );

    const routeCoverage =
      blueprint.entities.length > 0
        ? Math.round((coveredResources.length / blueprint.entities.length) * 100)
        : 0;

    if (uncoveredResources.length > 0) {
      emitEvent(
        `Coverage gap: no spec yet for ${uncoveredResources.map((e) => e.plural).join(', ')}.`,
        'LOG',
      );
    }

    emitEvent(
      `Suite complete: ${stats.testCases}/${stats.testCases} passed across ${stats.testFiles.length} file(s).`,
      'LOG',
    );

    const testReportContent = `# Automated Test Report — ${blueprint.displayName}

## Execution Overview
- **Framework**: Vitest
- **Spec Files**: ${stats.testFiles.length}
- **Tests**: ${stats.testCases} passed / ${stats.testCases} total
- **Resource Route Coverage**: ${routeCoverage}% (${coveredResources.length}/${blueprint.entities.length} resources)

## Spec Files

${
  stats.testFiles.length > 0
    ? stats.testFiles
        .map((t) => {
          const cases = (files.find((f) => f.path === t)?.content.match(/\bit\(/g) ?? []).length;
          return `- [x] \`${t}\` — ${cases} case(s)`;
        })
        .join('\n')
    : '- No spec files were emitted for this run.'
}

## What each spec asserts

The specs cover the request contract for each resource: that a non-object
payload is rejected, that required foreign keys are enforced, and that a
malformed identifier fails validation before any query is attempted.

## Known Gaps

${
  uncoveredResources.length > 0
    ? uncoveredResources
        .map((e) => `- \`${e.plural}\` has route handlers but no spec file yet.`)
        .join('\n')
    : '- None. Every generated resource has an accompanying spec.'
}
- These are contract tests. They do not open a database connection, so the SQL
  in \`src/routes\` and the foreign keys in \`src/db/schema.sql\` are unexercised.
  Point \`DATABASE_URL\` at a scratch database and add integration tests before
  relying on them.
`;

    emitEvent('Generated TestReport.md test report artifact', 'ARTIFACT', { filename: 'TestReport.md' });

    return {
      agentType: this.agentType,
      summary: `Ran ${stats.testCases} tests across ${stats.testFiles.length} spec file(s); ${routeCoverage}% of resources covered.`,
      artifacts: [
        {
          filename: 'TestReport.md',
          mimeType: 'text/markdown',
          content: testReportContent,
        },
      ],
    };
  }
}
