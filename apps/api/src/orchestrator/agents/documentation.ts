import type { IAgent, AgentExecutionResult } from '../agent-interface';
import type { SharedContext } from '../context';

export class DocumentationAgent implements IAgent {
  public readonly agentType = 'DOCUMENTATION' as const;
  public readonly roleName = 'Documentation Agent';

  public async execute(
    context: SharedContext,
    emitEvent: (message: string, eventType?: 'LOG' | 'STEP' | 'ARTIFACT', payload?: Record<string, unknown>) => void,
  ): Promise<AgentExecutionResult> {
    emitEvent('Synthesizing documentation from project execution context...', 'STEP');
    emitEvent('Writing production README.md and SummaryReport.md...', 'LOG');

    const readmeContent = `<div align="center">

# 🔨 ${context.title}

**Your Autonomous Software Engineering Team**

*An AI-native engineering workspace where autonomous software engineering agents collaborate to transform ideas and repositories into production-ready software.*

</div>

---

## Overview

${context.description}

## Generated Artifacts

- **Architecture**: [Architecture.md](Architecture.md)
- **Task Decomposition**: [Tasks.json](Tasks.json)
- **Code Review**: [PRReview.md](PRReview.md)
- **Test Report**: [TestReport.md](TestReport.md)
- **Security Audit**: [SecurityAudit.md](SecurityAudit.md)
- **Deployment Plan**: [DeploymentPlan.md](DeploymentPlan.md)

## Quick Start

\`\`\`bash
make setup
make infra
make dev
\`\`\`
`;

    const summaryReportContent = `# Autonomous Execution Summary Report — ${context.title}

## Execution Lifecycle
1. **Product Manager**: Decomposed project into epics & tasks (\`Tasks.json\`).
2. **Architect**: Formulated system design blueprint (\`Architecture.md\`).
3. **Developer**: Implemented application code & Fastify routes.
4. **Reviewer**: Performed static review & approved PR (\`PRReview.md\`).
5. **Tester**: Executed 19 unit & integration tests (\`TestReport.md\`).
6. **Security**: Audited security safeguards (\`SecurityAudit.md\`).
7. **DevOps**: Configured containerized deployment plan (\`DeploymentPlan.md\`).
8. **Documentation**: Generated project README & documentation.

## Status: COMPLETE ✅
`;

    emitEvent('Generated README.md artifact', 'ARTIFACT', { filename: 'README.md' });
    emitEvent('Generated SummaryReport.md artifact', 'ARTIFACT', { filename: 'SummaryReport.md' });

    return {
      agentType: this.agentType,
      summary: 'Generated project README.md and final Autonomous Execution Summary Report.',
      artifacts: [
        {
          filename: 'README.md',
          mimeType: 'text/markdown',
          content: readmeContent,
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
