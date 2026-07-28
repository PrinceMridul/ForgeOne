import type { AgentType } from '@forgeone/types';
import { AgentRegistry } from './agent-registry';
import { SharedContext } from './context';
import { ExecutionPipeline } from './pipeline';
import type { WorkflowRun, ExecutionEvent, GeneratedArtifact } from './types';
import { createZipArchive } from '../utils/zip-builder';

export class RunManager {
  private static instance: RunManager;
  private readonly runs: Map<string, WorkflowRun> = new Map();
  private readonly contexts: Map<string, SharedContext> = new Map();
  private readonly events: Map<string, ExecutionEvent[]> = new Map();
  private readonly artifacts: Map<string, GeneratedArtifact[]> = new Map();
  private readonly registry: AgentRegistry;
  private readonly pipeline: ExecutionPipeline;

  private constructor() {
    this.registry = new AgentRegistry();
    this.pipeline = new ExecutionPipeline(this.registry);
    this.seedMockRun();
  }

  public static getInstance(): RunManager {
    if (!RunManager.instance) {
      RunManager.instance = new RunManager();
    }
    return RunManager.instance;
  }

  public async startRun(projectId: string, title: string, description: string): Promise<WorkflowRun> {
    const runId = crypto.randomUUID();
    const now = new Date().toISOString();

    const run: WorkflowRun = {
      id: runId,
      projectId,
      title,
      description,
      status: 'PENDING',
      currentAgent: 'ORCHESTRATOR',
      stepProgress: 0,
      stageProgress: 0,
      totalSteps: 8,
      completedSteps: 0,
      error: null,
      startedAt: now,
      completedAt: null,
      createdAt: now,
    };

    const context = new SharedContext(runId, projectId, title, description);
    this.runs.set(runId, run);
    this.contexts.set(runId, context);
    this.events.set(runId, []);
    this.artifacts.set(runId, []);

    // Execute pipeline asynchronously
    void this.executeRun(run, context);

    return run;
  }

  private async executeRun(run: WorkflowRun, context: SharedContext): Promise<void> {
    try {
      await this.pipeline.executePipeline(
        run,
        context,
        (event) => {
          const runEvents = this.events.get(run.id) ?? [];
          runEvents.push(event);
          this.events.set(run.id, runEvents);
        },
        (artifact) => {
          const runArtifacts = this.artifacts.get(run.id) ?? [];
          runArtifacts.push(artifact);
          this.artifacts.set(run.id, runArtifacts);
        },
        (currentAgent, stepProgress, completedSteps, stageProgress) => {
          run.currentAgent = currentAgent;
          run.stepProgress = stepProgress;
          run.completedSteps = completedSteps;
          if (stageProgress !== undefined) run.stageProgress = stageProgress;
        },
      );

      run.status = 'COMPLETED';
      run.completedAt = new Date().toISOString();
      run.stepProgress = 100;
      run.stageProgress = 100;
    } catch (err) {
      run.status = 'FAILED';
      run.error = err instanceof Error ? err.message : 'Pipeline execution failed';
      run.completedAt = new Date().toISOString();
    }
  }

  public listRuns(): WorkflowRun[] {
    return Array.from(this.runs.values());
  }

  public getRun(runId: string): WorkflowRun | undefined {
    return this.runs.get(runId);
  }

  public getRunEvents(runId: string): ExecutionEvent[] {
    return this.events.get(runId) ?? [];
  }

  public getRunArtifacts(runId: string): GeneratedArtifact[] {
    return this.artifacts.get(runId) ?? [];
  }

  public getRunArtifactContent(runId: string, artifactId: string): GeneratedArtifact | undefined {
    const runArtifacts = this.artifacts.get(runId) ?? [];
    return runArtifacts.find((a) => a.id === artifactId || a.filename === artifactId);
  }

  private seedMockRun(): void {
    const mockId = 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';
    const projectId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const now = new Date().toISOString();

    const mockRun: WorkflowRun = {
      id: mockId,
      projectId,
      title: 'ForgeOne Autonomous Execution',
      description: 'End-to-end autonomous engineering pipeline execution',
      status: 'COMPLETED',
      currentAgent: 'DOCUMENTATION',
      stepProgress: 100,
      stageProgress: 100,
      totalSteps: 8,
      completedSteps: 8,
      error: null,
      startedAt: now,
      completedAt: now,
      createdAt: now,
    };

    const context = new SharedContext(mockId, projectId, mockRun.title, mockRun.description);
    this.runs.set(mockId, mockRun);
    this.contexts.set(mockId, context);

    const zipBuffer = createZipArchive([
      {
        path: 'package.json',
        content:
          '{\n  "name": "meridian-api",\n  "version": "1.0.0",\n  "private": true,\n  "scripts": {\n    "dev": "tsx watch src/index.ts",\n    "build": "tsc",\n    "start": "node dist/index.js"\n  },\n  "dependencies": {\n    "fastify": "^5.0.0",\n    "zod": "^3.23.0"\n  }\n}\n',
      },
      {
        path: 'src/index.ts',
        content:
          "import Fastify from 'fastify';\nimport { healthRoute } from './routes/health';\n\nconst server = Fastify({ logger: true });\nserver.register(healthRoute);\n\nconst start = async () => {\n  try {\n    await server.listen({ port: 4000, host: '0.0.0.0' });\n    console.log('Meridian API running on http://localhost:4000');\n  } catch (err) {\n    server.log.error(err);\n    process.exit(1);\n  }\n};\n\nstart();\n",
      },
      {
        path: 'src/routes/health.ts',
        content:
          "import type { FastifyPluginAsync } from 'fastify';\n\nexport const healthRoute: FastifyPluginAsync = async (fastify) => {\n  fastify.get('/health', async () => {\n    return { status: 'ok', service: 'meridian-api', timestamp: new Date().toISOString() };\n  });\n};\n",
      },
      {
        path: 'README.md',
        content:
          '# Meridian API\n\nMulti-tenant billing engine with usage-based metering.\n\n## Quick Start\n\n```bash\nnpm install\nnpm run dev\n```\n',
      },
      // PRD.md, Architecture.md and Tasks.json are pipeline documents written
      // *about* the project, not files of it, so they are deliberately not
      // bundled. The seeded run therefore obeys the same invariant as a live
      // one: zip entries == artifacts flagged inRepository.
    ]);

    const zipBase64 = zipBuffer.toString('base64');

    const seedArtifacts: GeneratedArtifact[] = [
      {
        id: '2f9a4c10-7b5e-4d18-9c3a-000000000001',
        runId: mockId,
        type: 'SPEC',
        producerAgent: 'PRODUCT_MANAGER',
        agentType: 'PRODUCT_MANAGER',
        filename: 'PRD.md',
        inRepository: false,
        mimeType: 'text/markdown',
        sizeBytes: 1240,
        storageKey: `artifacts/${mockId}/PRD.md`,
        createdAt: now,
        version: 1,
        dependencies: [],
        consumers: ['ARCHITECT', 'DEVELOPER'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/2f9a4c10-7b5e-4d18-9c3a-000000000001/download`,
        content: '# Product Requirement Document\n\n## Overview\nMeridian API multi-tenant billing engine with usage-based metering.\n\n## Core Scope\n- Tenant isolation and token-bucket rate limiting\n- Usage-based billing metrics aggregation\n- Event-driven transaction webhooks\n',
      },
      {
        id: '2f9a4c10-7b5e-4d18-9c3a-000000000002',
        runId: mockId,
        type: 'SPEC',
        producerAgent: 'PRODUCT_MANAGER',
        agentType: 'PRODUCT_MANAGER',
        filename: 'Tasks.json',
        inRepository: false,
        mimeType: 'application/json',
        sizeBytes: 680,
        storageKey: `artifacts/${mockId}/Tasks.json`,
        createdAt: now,
        version: 1,
        dependencies: [],
        consumers: ['ARCHITECT', 'DEVELOPER'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/2f9a4c10-7b5e-4d18-9c3a-000000000002/download`,
        content: '[\n  { "id": "TASK-1", "title": "Setup Fastify Server", "status": "DONE" },\n  { "id": "TASK-2", "title": "Implement Health Endpoint", "status": "DONE" },\n  { "id": "TASK-3", "title": "Add Package Manifest", "status": "DONE" }\n]\n',
      },
      {
        id: '2f9a4c10-7b5e-4d18-9c3a-000000000003',
        runId: mockId,
        type: 'DOC',
        producerAgent: 'ARCHITECT',
        agentType: 'ARCHITECT',
        filename: 'Architecture.md',
        inRepository: false,
        mimeType: 'text/markdown',
        sizeBytes: 2450,
        storageKey: `artifacts/${mockId}/Architecture.md`,
        createdAt: now,
        version: 1,
        dependencies: ['2f9a4c10-7b5e-4d18-9c3a-000000000001', '2f9a4c10-7b5e-4d18-9c3a-000000000002'],
        consumers: ['DEVELOPER'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/2f9a4c10-7b5e-4d18-9c3a-000000000003/download`,
        content: '# Architecture Blueprint\n\n## System Overview\nMicroservice architecture built on Fastify, TypeScript, Zod, and PostgreSQL.\n\n## Layers\n- HTTP Transport API Layer\n- Service & Billing Orchestration Layer\n- Data Access & Persistence Layer\n',
      },
      {
        id: '2f9a4c10-7b5e-4d18-9c3a-000000000004',
        runId: mockId,
        type: 'SOURCE_CODE',
        producerAgent: 'DEVELOPER',
        agentType: 'DEVELOPER',
        filename: 'package.json',
        inRepository: true,
        mimeType: 'application/json',
        sizeBytes: 320,
        storageKey: `artifacts/${mockId}/package.json`,
        createdAt: now,
        version: 1,
        dependencies: ['2f9a4c10-7b5e-4d18-9c3a-000000000003'],
        consumers: ['REVIEWER', 'TESTER'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/2f9a4c10-7b5e-4d18-9c3a-000000000004/download`,
        content: '{\n  "name": "meridian-api",\n  "version": "1.0.0",\n  "private": true,\n  "scripts": {\n    "dev": "tsx watch src/index.ts",\n    "build": "tsc",\n    "start": "node dist/index.js"\n  },\n  "dependencies": {\n    "fastify": "^5.0.0",\n    "zod": "^3.23.0"\n  }\n}\n',
      },
      {
        id: '2f9a4c10-7b5e-4d18-9c3a-000000000005',
        runId: mockId,
        type: 'SOURCE_CODE',
        producerAgent: 'DEVELOPER',
        agentType: 'DEVELOPER',
        filename: 'src/index.ts',
        inRepository: true,
        mimeType: 'text/plain',
        sizeBytes: 512,
        storageKey: `artifacts/${mockId}/src/index.ts`,
        createdAt: now,
        version: 1,
        dependencies: ['2f9a4c10-7b5e-4d18-9c3a-000000000003'],
        consumers: ['REVIEWER', 'TESTER'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/2f9a4c10-7b5e-4d18-9c3a-000000000005/download`,
        content: `import Fastify from 'fastify';\nimport { healthRoute } from './routes/health';\n\nconst server = Fastify({ logger: true });\nserver.register(healthRoute);\n\nconst start = async () => {\n  try {\n    await server.listen({ port: 4000, host: '0.0.0.0' });\n    console.log('Meridian API running on http://localhost:4000');\n  } catch (err) {\n    server.log.error(err);\n    process.exit(1);\n  }\n};\n\nstart();\n`,
      },
      {
        id: '2f9a4c10-7b5e-4d18-9c3a-000000000006',
        runId: mockId,
        type: 'SOURCE_CODE',
        producerAgent: 'DEVELOPER',
        agentType: 'DEVELOPER',
        filename: 'src/routes/health.ts',
        inRepository: true,
        mimeType: 'text/plain',
        sizeBytes: 280,
        storageKey: `artifacts/${mockId}/src/routes/health.ts`,
        createdAt: now,
        version: 1,
        dependencies: ['2f9a4c10-7b5e-4d18-9c3a-000000000003'],
        consumers: ['REVIEWER', 'TESTER'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/2f9a4c10-7b5e-4d18-9c3a-000000000006/download`,
        content: `import type { FastifyPluginAsync } from 'fastify';\n\nexport const healthRoute: FastifyPluginAsync = async (fastify) => {\n  fastify.get('/health', async () => {\n    return { status: 'ok', service: 'meridian-api', timestamp: new Date().toISOString() };\n  });\n};\n`,
      },
      {
        id: '2f9a4c10-7b5e-4d18-9c3a-000000000007',
        runId: mockId,
        type: 'ZIP',
        producerAgent: 'DEVELOPER',
        agentType: 'DEVELOPER',
        filename: 'Repository.zip',
        inRepository: false,
        mimeType: 'application/zip',
        sizeBytes: zipBuffer.length,
        storageKey: `artifacts/${mockId}/Repository.zip`,
        createdAt: now,
        version: 1,
        dependencies: ['2f9a4c10-7b5e-4d18-9c3a-000000000004', '2f9a4c10-7b5e-4d18-9c3a-000000000005', '2f9a4c10-7b5e-4d18-9c3a-000000000006'],
        consumers: ['REVIEWER', 'TESTER', 'SECURITY', 'DEVOPS'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/2f9a4c10-7b5e-4d18-9c3a-000000000007/download`,
        content: zipBase64,
      },
      {
        id: '2f9a4c10-7b5e-4d18-9c3a-000000000008',
        runId: mockId,
        type: 'DOC',
        producerAgent: 'REVIEWER',
        agentType: 'REVIEWER',
        filename: 'Review.md',
        inRepository: false,
        mimeType: 'text/markdown',
        sizeBytes: 920,
        storageKey: `artifacts/${mockId}/Review.md`,
        createdAt: now,
        version: 1,
        dependencies: ['2f9a4c10-7b5e-4d18-9c3a-000000000007'],
        consumers: ['TESTER'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/2f9a4c10-7b5e-4d18-9c3a-000000000008/download`,
        content: '# Code Review Report\n\n- All handlers strictly typed with Fastify and Zod.\n- Zero high/critical security findings.\n- Recommendation: Proceed to test phase.\n',
      },
      {
        id: '2f9a4c10-7b5e-4d18-9c3a-000000000009',
        runId: mockId,
        type: 'SECURITY',
        producerAgent: 'SECURITY',
        agentType: 'SECURITY',
        filename: 'SecurityAudit.md',
        inRepository: false,
        mimeType: 'text/markdown',
        sizeBytes: 810,
        storageKey: `artifacts/${mockId}/SecurityAudit.md`,
        createdAt: now,
        version: 1,
        dependencies: ['2f9a4c10-7b5e-4d18-9c3a-000000000007'],
        consumers: ['DEVOPS'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/2f9a4c10-7b5e-4d18-9c3a-000000000009/download`,
        content: '# SAST & Dependency Security Audit\n\n- SAST scan score: 100/100\n- Vulnerabilities found: 0\n- Dependency vulnerability check: CLEAR\n',
      },
      {
        id: '2f9a4c10-7b5e-4d18-9c3a-000000000010',
        runId: mockId,
        type: 'DEPLOYMENT_PLAN',
        producerAgent: 'DEVOPS',
        agentType: 'DEVOPS',
        filename: 'DeploymentPlan.md',
        inRepository: false,
        mimeType: 'text/markdown',
        sizeBytes: 1150,
        storageKey: `artifacts/${mockId}/DeploymentPlan.md`,
        createdAt: now,
        version: 1,
        dependencies: ['2f9a4c10-7b5e-4d18-9c3a-000000000007', '2f9a4c10-7b5e-4d18-9c3a-000000000009'],
        consumers: ['DOCUMENTATION'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/2f9a4c10-7b5e-4d18-9c3a-000000000010/download`,
        content: '# Deployment Plan\n\n- Strategy: Blue/Green deployment\n- Environment: Staging / Production Kubernetes Cluster\n- Health Check: GET /health\n',
      },
      {
        id: '2f9a4c10-7b5e-4d18-9c3a-000000000011',
        runId: mockId,
        type: 'README',
        producerAgent: 'DOCUMENTATION',
        agentType: 'DOCUMENTATION',
        filename: 'README.md',
        inRepository: true,
        mimeType: 'text/markdown',
        sizeBytes: 640,
        storageKey: `artifacts/${mockId}/README.md`,
        createdAt: now,
        version: 1,
        dependencies: ['2f9a4c10-7b5e-4d18-9c3a-000000000007'],
        consumers: [],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/2f9a4c10-7b5e-4d18-9c3a-000000000011/download`,
        content: '# Meridian API\n\nMulti-tenant billing engine with usage-based metering.\n\n## Quick Start\n\n```bash\nnpm install\nnpm run dev\n```\n',
      },
      {
        id: '2f9a4c10-7b5e-4d18-9c3a-000000000012',
        runId: mockId,
        type: 'SUMMARY_REPORT',
        producerAgent: 'DOCUMENTATION',
        agentType: 'DOCUMENTATION',
        filename: 'SummaryReport.md',
        inRepository: false,
        mimeType: 'text/markdown',
        sizeBytes: 980,
        storageKey: `artifacts/${mockId}/SummaryReport.md`,
        createdAt: now,
        version: 1,
        dependencies: ['2f9a4c10-7b5e-4d18-9c3a-000000000011'],
        consumers: [],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/2f9a4c10-7b5e-4d18-9c3a-000000000012/download`,
        content: '# Executive Summary Report\n\nEnd-to-end autonomous engineering run completed successfully.\nAll pipeline stages verified clean build, passing unit tests, and security clearance.\n',
      },
    ];

    this.artifacts.set(mockId, seedArtifacts);
    this.events.set(mockId, this.buildSeedEvents(mockId, new Date(now).getTime()));
  }

  /**
   * Telemetry for the seeded showcase run.
   *
   * This run is what the landing page surfaces first under "Recent runs", so
   * opening it must show a complete console — logs, activity feed, and
   * thinking timeline — not an empty shell. Events are stamped on a synthetic
   * ascending timeline so the log reads chronologically.
   */
  private buildSeedEvents(runId: string, baseMs: number): ExecutionEvent[] {
    const script: Array<{
      agentType: AgentType;
      role: string;
      beats: Array<[ExecutionEvent['eventType'], string]>;
    }> = [
      {
        agentType: 'PRODUCT_MANAGER',
        role: 'Product Manager Agent',
        beats: [
          ['STATUS_CHANGE', '[RUNNING] Agent Product Manager Agent executing task...'],
          ['STEP', 'Analyzing project request and user specifications...'],
          ['LOG', 'Decomposed scope into 3 Epics and 8 engineering tasks.'],
          ['ARTIFACT', 'Generated PRD.md product requirement document artifact'],
          ['ARTIFACT', 'Generated Tasks.json specification artifact'],
          ['STATUS_CHANGE', '[COMPLETE] Agent Product Manager Agent completed stage: PRD.md and Tasks.json produced.'],
        ],
      },
      {
        agentType: 'ARCHITECT',
        role: 'Architect Agent',
        beats: [
          ['STATUS_CHANGE', '[RUNNING] Agent Architect Agent executing task...'],
          ['STEP', 'Consuming PRD.md and Tasks.json to derive system topology...'],
          ['LOG', 'Selected stack: Fastify 5, TypeScript, Zod, PostgreSQL 16.'],
          ['ARTIFACT', 'Generated Architecture.md system blueprint artifact'],
          ['STATUS_CHANGE', '[COMPLETE] Agent Architect Agent completed stage: Architecture blueprint published.'],
        ],
      },
      {
        agentType: 'DEVELOPER',
        role: 'Developer Agent',
        beats: [
          ['STATUS_CHANGE', '[RUNNING] Agent Developer Agent executing task...'],
          ['STEP', 'Reading Architecture.md and Tasks.json from SharedContext...'],
          ['LOG', 'FILE_CREATED: package.json (320 bytes, json)'],
          ['LOG', 'FILE_CREATED: src/index.ts (512 bytes, typescript)'],
          ['LOG', 'FILE_CREATED: src/routes/health.ts (280 bytes, typescript)'],
          ['ARTIFACT', 'Bundled all generated files into Repository.zip downloadable archive'],
          ['STATUS_CHANGE', '[COMPLETE] Agent Developer Agent completed stage: 3 source files bundled into Repository.zip.'],
        ],
      },
      {
        agentType: 'REVIEWER',
        role: 'Reviewer Agent',
        beats: [
          ['STATUS_CHANGE', '[RUNNING] Agent Reviewer Agent executing task...'],
          ['STEP', 'Running static analysis across generated sources...'],
          ['LOG', 'Verdict: APPROVED — all handlers strictly typed, no code smells detected.'],
          ['ARTIFACT', 'Generated Review.md code review report artifact'],
          ['STATUS_CHANGE', '[COMPLETE] Agent Reviewer Agent completed stage: Review approved.'],
        ],
      },
      {
        agentType: 'TESTER',
        role: 'Tester Agent',
        beats: [
          ['STATUS_CHANGE', '[RUNNING] Agent Tester Agent executing task...'],
          ['STEP', 'Executing generated test suite...'],
          ['LOG', 'Test run complete: 32/32 passed, coverage 96.4%.'],
          ['STATUS_CHANGE', '[COMPLETE] Agent Tester Agent completed stage: All tests green.'],
        ],
      },
      {
        agentType: 'SECURITY',
        role: 'Security Agent',
        beats: [
          ['STATUS_CHANGE', '[RUNNING] Agent Security Agent executing task...'],
          ['STEP', 'Running SAST scan and dependency audit...'],
          ['LOG', 'SAST audit clean: 0 critical, 0 high, 0 medium findings.'],
          ['ARTIFACT', 'Generated SecurityAudit.md report artifact'],
          ['STATUS_CHANGE', '[COMPLETE] Agent Security Agent completed stage: Security clearance granted.'],
        ],
      },
      {
        agentType: 'DEVOPS',
        role: 'DevOps Agent',
        beats: [
          ['STATUS_CHANGE', '[RUNNING] Agent DevOps Agent executing task...'],
          ['STEP', 'Composing container build and rollout strategy...'],
          ['LOG', 'Multi-stage image built; health probe GET /health returned 200.'],
          ['ARTIFACT', 'Generated DeploymentPlan.md artifact'],
          ['STATUS_CHANGE', '[COMPLETE] Agent DevOps Agent completed stage: Blue/green rollout plan ready.'],
        ],
      },
      {
        agentType: 'DOCUMENTATION',
        role: 'Documentation Agent',
        beats: [
          ['STATUS_CHANGE', '[RUNNING] Agent Documentation Agent executing task...'],
          ['STEP', 'Aggregating artifacts from every upstream stage...'],
          ['ARTIFACT', 'Generated README.md project documentation artifact'],
          ['ARTIFACT', 'Generated SummaryReport.md executive summary artifact'],
          ['STATUS_CHANGE', '[COMPLETE] Agent Documentation Agent completed stage: Documentation set published.'],
        ],
      },
    ];

    const events: ExecutionEvent[] = [];
    let sequence = 0;

    const push = (
      agentType: AgentType,
      eventType: ExecutionEvent['eventType'],
      message: string,
    ): void => {
      sequence++;
      events.push({
        id: `3c8b5d21-6a4f-4e29-8b7c-${String(sequence).padStart(12, '0')}`,
        runId,
        agentType,
        eventType,
        message,
        timestamp: new Date(baseMs + sequence * 1400).toISOString(),
      });
    };

    push('ORCHESTRATOR', 'STATUS_CHANGE', '[RUNNING] Workflow Run "ForgeOne Autonomous Execution" booted artifact-driven pipeline engine.');

    for (const stage of script) {
      for (const [eventType, message] of stage.beats) {
        push(stage.agentType, eventType, message);
      }
    }

    push('ORCHESTRATOR', 'STATUS_CHANGE', '[COMPLETE] Workflow Run finished all 8 stages with 12 artifacts produced.');

    return events;
  }
}
