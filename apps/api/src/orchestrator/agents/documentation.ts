import type { IAgent, AgentExecutionResult } from '../agent-interface';
import type { SharedContext } from '../context';
import type { GeneratedFile } from '../file-parser';
import { deriveBlueprint } from '../blueprint';
import { summarizeRepository } from '../scaffold';

export class DocumentationAgent implements IAgent {
  public readonly agentType = 'DOCUMENTATION' as const;
  public readonly roleName = 'Documentation Agent';

  public async execute(
    context: SharedContext,
    emitEvent: (message: string, eventType?: 'LOG' | 'STEP' | 'ARTIFACT', payload?: Record<string, unknown>) => void,
  ): Promise<AgentExecutionResult> {
    const blueprint = context.get<ReturnType<typeof deriveBlueprint>>('blueprint')
      ?? deriveBlueprint(context.title, context.description);
    const files = context.get<GeneratedFile[]>('generatedFiles') ?? [];
    const stats = summarizeRepository(files);

    emitEvent('Synthesizing documentation from the artifacts produced upstream...', 'STEP');
    emitEvent(`Indexing ${stats.fileCount} generated files and ${context.getArtifacts().length} pipeline artifacts...`, 'LOG');

    // The Developer already emits the repository's own README.md. Emitting a
    // second file under that exact name produced two same-named rows in the
    // artifact list and let this one shadow the repo README in the file tree,
    // so the run-level index ships as ProjectOverview.md instead.
    const overviewContent = `# ${blueprint.displayName}

${blueprint.summary}

## What was produced

A \`${blueprint.name}\` service — ${stats.fileCount} files, ${stats.lineCount} lines — exposing
${blueprint.entities.length} resource route group(s) with schema validation, a SQL schema, specs
and a container build.

### Resources

| Route | Fields |
|---|---|
${blueprint.entities.map((e) => `| \`/api/${e.plural}\` | ${e.fields.map((f) => `\`${f.name}\``).join(', ')} |`).join('\n')}

${
  blueprint.capabilities.length > 0
    ? `### Capabilities\n\n${blueprint.capabilities.map((c) => `- **${c.label}** — ${c.implication}`).join('\n')}`
    : ''
}

## Run it

\`\`\`bash
npm install
npm run dev
curl http://localhost:4000/health
\`\`\`

## Pipeline artifacts

| Artifact | Produced by |
|---|---|
| [PRD.md](PRD.md) | Product Manager |
| [Tasks.json](Tasks.json) | Product Manager |
| [Architecture.md](Architecture.md) | Architect |
| [Repository.zip](Repository.zip) | Developer |
| [PRReview.md](PRReview.md) | Reviewer |
| [TestReport.md](TestReport.md) | Tester |
| [SecurityAudit.md](SecurityAudit.md) | Security |
| [DeploymentPlan.md](DeploymentPlan.md) | DevOps |
| [SummaryReport.md](SummaryReport.md) | Documentation |
`;

    const summaryReportContent = `# Execution Summary — ${blueprint.displayName}

## Request

> ${blueprint.summary}

## Interpretation

The prompt was resolved to **${blueprint.entities.length} core resource(s)** —
${blueprint.entities.map((e) => `\`${e.plural}\``).join(', ')} — and
**${blueprint.capabilities.length} cross-cutting capability(ies)**${
      blueprint.capabilities.length > 0
        ? `: ${blueprint.capabilities.map((c) => c.label).join(', ')}`
        : ''
    }. Those choices drove the schema, the route surface and the dependency set.

## Pipeline

| Stage | Outcome |
|---|---|
| Product Manager | PRD and task breakdown scoped to the resources above |
| Architect | Service topology and data model |
| Developer | ${stats.fileCount} files, ${stats.lineCount} lines, ${stats.routeFiles.length} route module(s) |
| Reviewer | Static review against the emitted files |
| Tester | ${stats.testCases} test case(s) across ${stats.testFiles.length} spec file(s) |
| Security | Dependency and static audit with severity-ranked findings |
| DevOps | Container image, compose topology and rollout order |
| Documentation | This summary and the repository index |

## Honest Limitations

- Persistence is in-process; the SQL schema is emitted but not yet wired to the handlers.
- The security audit reports real gaps rather than a clean bill of health — read it before deploying.
- Generated specs cover handler behaviour, not durability or concurrency.

## Status: COMPLETE
`;

    emitEvent('Generated ProjectOverview.md artifact', 'ARTIFACT', { filename: 'ProjectOverview.md' });
    emitEvent('Generated SummaryReport.md artifact', 'ARTIFACT', { filename: 'SummaryReport.md' });

    return {
      agentType: this.agentType,
      summary: `Documented ${blueprint.name}: project overview and execution summary covering ${stats.fileCount} files.`,
      artifacts: [
        {
          filename: 'ProjectOverview.md',
          mimeType: 'text/markdown',
          content: overviewContent,
        },
        {
          filename: 'SummaryReport.md',
          mimeType: 'text/markdown',
          content: summaryReportContent,
        },
      ],
    };
  }
}
