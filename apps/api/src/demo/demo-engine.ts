import type { DemoRunState, DemoEvent, DemoArtifact, DemoReplayPackage } from './types';
import type { AgentType } from '@forgeone/types';

export class DemoEngine {
  private static instance: DemoEngine;
  private readonly runs: Map<string, DemoRunState> = new Map();
  private readonly events: Map<string, DemoEvent[]> = new Map();
  private readonly artifacts: Map<string, DemoArtifact[]> = new Map();
  private activeRunId: string | null = null;

  private constructor() {
    this.seedDefaultDemoRun();
  }

  public static getInstance(): DemoEngine {
    if (!DemoEngine.instance) {
      DemoEngine.instance = new DemoEngine();
    }
    return DemoEngine.instance;
  }

  public startDemo(prompt?: string, durationSeconds: number = 90): DemoRunState {
    const runId = crypto.randomUUID();
    const now = new Date().toISOString();
    const effectivePrompt = prompt && prompt.trim().length > 0
      ? prompt
      : 'Build an autonomous multi-agent software engineering workspace for automated code generation & deployment';

    const run: DemoRunState = {
      id: runId,
      prompt: effectivePrompt,
      status: 'RUNNING',
      currentAgent: 'PRODUCT_MANAGER',
      stepProgress: 0,
      totalSteps: 8,
      completedSteps: 0,
      durationSeconds,
      startedAt: now,
    };

    this.runs.set(runId, run);
    this.events.set(runId, []);
    this.artifacts.set(runId, []);
    this.activeRunId = runId;

    // Execute background simulation pipeline
    void this.runSimulationPipeline(run);

    return run;
  }

  private async runSimulationPipeline(run: DemoRunState): Promise<void> {
    const stages: Array<{
      agent: AgentType;
      name: string;
      events: Array<{ type: DemoEvent['eventType']; msg: string; payload?: Record<string, unknown> }>;
      artifact?: { filename: string; mimeType: string; content: string };
    }> = [
      {
        agent: 'PRODUCT_MANAGER',
        name: 'Product Manager Agent',
        events: [
          { type: 'STATUS_CHANGE', msg: 'Product Manager initialized requirements parsing' },
          { type: 'AGENT_TALK', msg: 'Decomposing user prompt into high-level Epics and actionable user stories...' },
          { type: 'LOG', msg: 'Scoped 3 Core Epics: [EPIC-1] Core Backend, [EPIC-2] Agent Runtime, [EPIC-3] Real-time Dashboard' },
        ],
        artifact: {
          filename: 'PRD.md',
          mimeType: 'text/markdown',
          content: `# Product Requirement Document (PRD)\n\n## Overview\n${run.prompt}\n\n## Epics & Acceptance Criteria\n- **EPIC-1**: Monorepo Setup & API Contracts\n- **EPIC-2**: Real-time Agent Telemetry & Event Streaming\n- **EPIC-3**: Single-click Containerized Deployment\n`,
        },
      },
      {
        agent: 'ARCHITECT',
        name: 'Architect Agent',
        events: [
          { type: 'STATUS_CHANGE', msg: 'Architect Agent formulating system topology' },
          { type: 'AGENT_TALK', msg: 'Designing high-concurrency event-driven monorepo architecture...' },
          { type: 'LOG', msg: 'Selected Tech Stack: Next.js 15, Fastify 5, Turborepo, PostgreSQL 16, Redis 7, Qdrant' },
        ],
        artifact: {
          filename: 'Architecture.md',
          mimeType: 'text/markdown',
          content: `# System Architecture Blueprint\n\n## Topology\n- **Web App**: Next.js 15 App Router (:3000)\n- **API Server**: Fastify 5 Zod API (:4000)\n- **Agent Runtime**: Python FastAPI (:8000)\n`,
        },
      },
      {
        agent: 'DEVELOPER',
        name: 'Developer Agent',
        events: [
          { type: 'STATUS_CHANGE', msg: 'Developer Agent compiling module implementations' },
          { type: 'CODE_GEN', msg: 'Writing apps/api/src/routes/v1/runs.ts controller & Fastify handlers...' },
          { type: 'LOG', msg: 'Compiled 14 TypeScript files cleanly without syntax or type errors.' },
        ],
        artifact: {
          filename: 'CodeDiff.ts',
          mimeType: 'text/plain',
          content: `export async function executeRunPipeline(runId: string) {\n  const context = new SharedContext(runId);\n  await pipeline.run(context);\n}\n`,
        },
      },
      {
        agent: 'REVIEWER',
        name: 'Reviewer Agent',
        events: [
          { type: 'STATUS_CHANGE', msg: 'Reviewer Agent executing AST static analysis' },
          { type: 'AGENT_TALK', msg: 'Auditing code quality, error boundary wrapping, and static typing...' },
          { type: 'LOG', msg: 'Verdict: APPROVED (Quality Score: 98/100). No code smell detected.' },
        ],
        artifact: {
          filename: 'PRReview.md',
          mimeType: 'text/markdown',
          content: `# Code Review Report\n\n- **Verdict**: APPROVED ✅\n- **Score**: 98/100\n- **Strict Type Compliance**: 100%\n`,
        },
      },
      {
        agent: 'TESTER',
        name: 'Tester Agent',
        events: [
          { type: 'STATUS_CHANGE', msg: 'Tester Agent executing Vitest suite' },
          { type: 'METRIC', msg: '32/32 tests passed (100% pass rate). Code coverage: 96.4%' },
        ],
        artifact: {
          filename: 'TestReport.md',
          mimeType: 'text/markdown',
          content: `# Test Execution Report\n\n- **Framework**: Vitest v3.2\n- **Pass Rate**: 100% (32/32 Passed)\n- **Coverage**: 96.4%\n`,
        },
      },
      {
        agent: 'SECURITY',
        name: 'Security Agent',
        events: [
          { type: 'STATUS_CHANGE', msg: 'Security Agent scanning vulnerabilities' },
          { type: 'LOG', msg: 'SAST Audit Complete: 0 Critical, 0 High, 0 Medium vulnerabilities.' },
        ],
        artifact: {
          filename: 'SecurityAudit.md',
          mimeType: 'text/markdown',
          content: `# Security Audit Report\n\n- **Status**: PASSED ✅\n- **Vulnerabilities**: 0 Found\n- **Safeguards**: Helmet HTTP Headers, Zod Schema Isolation\n`,
        },
      },
      {
        agent: 'DEVOPS',
        name: 'DevOps Agent',
        events: [
          { type: 'STATUS_CHANGE', msg: 'DevOps Agent configuring deployment stack' },
          { type: 'LOG', msg: 'Built multi-stage Docker container images & verified health check probes.' },
        ],
        artifact: {
          filename: 'DeploymentPlan.md',
          mimeType: 'text/markdown',
          content: `# Deployment Plan\n\n- **Container Stack**: Docker Compose & Kubernetes\n- **Health Check**: GET /health ➔ 200 OK\n`,
        },
      },
      {
        agent: 'DOCUMENTATION',
        name: 'Documentation Agent',
        events: [
          { type: 'STATUS_CHANGE', msg: 'Documentation Agent finalizing repository docs' },
          { type: 'AGENT_TALK', msg: 'Generated production README.md & execution summary.' },
        ],
        artifact: {
          filename: 'README.md',
          mimeType: 'text/markdown',
          content: `# ForgeOne Autonomous Software Engineering WorkSpace\n\nAutonomous execution complete.\n`,
        },
      },
    ];

    const runEvents = this.events.get(run.id) ?? [];
    const runArtifacts = this.artifacts.get(run.id) ?? [];

    for (let index = 0; index < stages.length; index++) {
      const stage = stages[index]!;
      run.currentAgent = stage.agent;
      run.completedSteps = index;
      run.stepProgress = Math.round((index / stages.length) * 100);

      for (const ev of stage.events) {
        const eventObj: DemoEvent = {
          id: crypto.randomUUID(),
          runId: run.id,
          timestamp: new Date().toISOString(),
          agentType: stage.agent,
          agentName: stage.name,
          eventType: ev.type,
          message: ev.msg,
          payload: ev.payload,
        };
        runEvents.push(eventObj);
      }

      if (stage.artifact) {
        const artifactObj: DemoArtifact = {
          id: crypto.randomUUID(),
          runId: run.id,
          agentType: stage.agent,
          filename: stage.artifact.filename,
          mimeType: stage.artifact.mimeType,
          sizeBytes: Buffer.byteLength(stage.artifact.content, 'utf-8'),
          content: stage.artifact.content,
          createdAt: new Date().toISOString(),
        };
        runArtifacts.push(artifactObj);
      }
    }

    run.status = 'COMPLETED';
    run.stepProgress = 100;
    run.completedSteps = stages.length;
    run.completedAt = new Date().toISOString();
  }

  public getEvents(runId?: string): DemoEvent[] {
    const targetId = runId || this.activeRunId || 'demo-run-001';
    return this.events.get(targetId) ?? [];
  }

  public getArtifacts(runId?: string): DemoArtifact[] {
    const targetId = runId || this.activeRunId || 'demo-run-001';
    return this.artifacts.get(targetId) ?? [];
  }

  public getReplay(runId?: string): DemoReplayPackage {
    const targetId = runId || this.activeRunId || 'demo-run-001';
    const run = this.runs.get(targetId) ?? this.seedDefaultDemoRun();
    const events = this.events.get(targetId) ?? [];
    const artifacts = this.artifacts.get(targetId) ?? [];

    const timelineSummary = events.map((e) => ({
      agent: e.agentType,
      role: e.agentName,
      action: e.message,
      timestamp: e.timestamp,
    }));

    return {
      run,
      events,
      artifacts,
      timelineSummary,
    };
  }

  private seedDefaultDemoRun(): DemoRunState {
    const demoId = 'demo-run-001';
    const now = new Date().toISOString();

    const run: DemoRunState = {
      id: demoId,
      prompt: 'Build an autonomous AI-native engineering workspace for ForgeOne',
      status: 'COMPLETED',
      currentAgent: 'DOCUMENTATION',
      stepProgress: 100,
      totalSteps: 8,
      completedSteps: 8,
      durationSeconds: 90,
      startedAt: now,
      completedAt: now,
    };

    this.runs.set(demoId, run);

    const mockEvents: DemoEvent[] = [
      { id: 'ev-1', runId: demoId, timestamp: now, agentType: 'PRODUCT_MANAGER', agentName: 'Product Manager Agent', eventType: 'STATUS_CHANGE', message: 'Decomposed prompt into 3 core Epics & 8 Engineering tasks' },
      { id: 'ev-2', runId: demoId, timestamp: now, agentType: 'ARCHITECT', agentName: 'Architect Agent', eventType: 'ARTIFACT', message: 'Generated System Architecture Blueprint (Architecture.md)' },
      { id: 'ev-3', runId: demoId, timestamp: now, agentType: 'DEVELOPER', agentName: 'Developer Agent', eventType: 'CODE_GEN', message: 'Compiled 14 TypeScript files and Fastify route definitions' },
      { id: 'ev-4', runId: demoId, timestamp: now, agentType: 'REVIEWER', agentName: 'Reviewer Agent', eventType: 'LOG', message: 'Code review approved with score 98/100' },
      { id: 'ev-5', runId: demoId, timestamp: now, agentType: 'TESTER', agentName: 'Tester Agent', eventType: 'METRIC', message: '32/32 Vitest integration tests passed (100%)' },
      { id: 'ev-6', runId: demoId, timestamp: now, agentType: 'SECURITY', agentName: 'Security Agent', eventType: 'LOG', message: 'SAST security audit clean: 0 vulnerabilities found' },
      { id: 'ev-7', runId: demoId, timestamp: now, agentType: 'DEVOPS', agentName: 'DevOps Agent', eventType: 'STATUS_CHANGE', message: 'Containerized deployment stack ready on Docker Compose' },
      { id: 'ev-8', runId: demoId, timestamp: now, agentType: 'DOCUMENTATION', agentName: 'Documentation Agent', eventType: 'ARTIFACT', message: 'Generated project README.md and final Demo Summary' },
    ];

    const mockArtifacts: DemoArtifact[] = [
      { id: 'art-1', runId: demoId, agentType: 'PRODUCT_MANAGER', filename: 'PRD.md', mimeType: 'text/markdown', sizeBytes: 512, content: '# Product Requirement Document (PRD)\n\nForgeOne Demo Run', createdAt: now },
      { id: 'art-2', runId: demoId, agentType: 'ARCHITECT', filename: 'Architecture.md', mimeType: 'text/markdown', sizeBytes: 1240, content: '# System Architecture Blueprint\n\nMonorepo Topology', createdAt: now },
      { id: 'art-3', runId: demoId, agentType: 'DEVELOPER', filename: 'CodeDiff.ts', mimeType: 'text/plain', sizeBytes: 310, content: 'export async function run() {}', createdAt: now },
      { id: 'art-4', runId: demoId, agentType: 'REVIEWER', filename: 'PRReview.md', mimeType: 'text/markdown', sizeBytes: 420, content: '# Code Review\n\nApproved ✅', createdAt: now },
      { id: 'art-5', runId: demoId, agentType: 'TESTER', filename: 'TestReport.md', mimeType: 'text/markdown', sizeBytes: 380, content: '# Test Report\n\n32/32 Passed', createdAt: now },
      { id: 'art-6', runId: demoId, agentType: 'SECURITY', filename: 'SecurityAudit.md', mimeType: 'text/markdown', sizeBytes: 290, content: '# Security Audit\n\n0 Vulnerabilities', createdAt: now },
      { id: 'art-7', runId: demoId, agentType: 'DEVOPS', filename: 'DeploymentPlan.md', mimeType: 'text/markdown', sizeBytes: 310, content: '# Deployment Plan\n\nDocker Compose', createdAt: now },
      { id: 'art-8', runId: demoId, agentType: 'DOCUMENTATION', filename: 'README.md', mimeType: 'text/markdown', sizeBytes: 210, content: '# ForgeOne Demo', createdAt: now },
    ];

    this.events.set(demoId, mockEvents);
    this.artifacts.set(demoId, mockArtifacts);

    return run;
  }
}
