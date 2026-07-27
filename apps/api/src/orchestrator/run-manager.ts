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
        (currentAgent, stepProgress, completedSteps) => {
          run.currentAgent = currentAgent;
          run.stepProgress = stepProgress;
          run.completedSteps = completedSteps;
        },
      );

      run.status = 'COMPLETED';
      run.completedAt = new Date().toISOString();
      run.stepProgress = 100;
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
    this.events.set(mockId, []);

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
      {
        path: 'PRD.md',
        content:
          '# Product Requirement Document\n\n## Overview\nMeridian API multi-tenant billing engine with usage-based metering.\n',
      },
      {
        path: 'Architecture.md',
        content:
          '# Architecture Blueprint\n\n## System Overview\nMicroservice architecture built on Fastify, TypeScript, Zod, and PostgreSQL.\n',
      },
      {
        path: 'Tasks.json',
        content:
          '[\n  { "id": "TASK-1", "title": "Setup Fastify Server", "status": "DONE" },\n  { "id": "TASK-2", "title": "Implement Health Endpoint", "status": "DONE" }\n]\n',
      },
    ]);

    const zipBase64 = zipBuffer.toString('base64');

    const seedArtifacts: GeneratedArtifact[] = [
      {
        id: 'art-001',
        runId: mockId,
        type: 'SPEC',
        producerAgent: 'PRODUCT_MANAGER',
        agentType: 'PRODUCT_MANAGER',
        filename: 'PRD.md',
        mimeType: 'text/markdown',
        sizeBytes: 1240,
        storageKey: `artifacts/${mockId}/PRD.md`,
        createdAt: now,
        version: 1,
        dependencies: [],
        consumers: ['ARCHITECT', 'DEVELOPER'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/art-001/download`,
        content: '# Product Requirement Document\n\n## Overview\nMeridian API multi-tenant billing engine with usage-based metering.\n\n## Core Scope\n- Tenant isolation and token-bucket rate limiting\n- Usage-based billing metrics aggregation\n- Event-driven transaction webhooks\n',
      },
      {
        id: 'art-002',
        runId: mockId,
        type: 'SPEC',
        producerAgent: 'PRODUCT_MANAGER',
        agentType: 'PRODUCT_MANAGER',
        filename: 'Tasks.json',
        mimeType: 'application/json',
        sizeBytes: 680,
        storageKey: `artifacts/${mockId}/Tasks.json`,
        createdAt: now,
        version: 1,
        dependencies: [],
        consumers: ['ARCHITECT', 'DEVELOPER'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/art-002/download`,
        content: '[\n  { "id": "TASK-1", "title": "Setup Fastify Server", "status": "DONE" },\n  { "id": "TASK-2", "title": "Implement Health Endpoint", "status": "DONE" },\n  { "id": "TASK-3", "title": "Add Package Manifest", "status": "DONE" }\n]\n',
      },
      {
        id: 'art-003',
        runId: mockId,
        type: 'DOC',
        producerAgent: 'ARCHITECT',
        agentType: 'ARCHITECT',
        filename: 'Architecture.md',
        mimeType: 'text/markdown',
        sizeBytes: 2450,
        storageKey: `artifacts/${mockId}/Architecture.md`,
        createdAt: now,
        version: 1,
        dependencies: ['art-001', 'art-002'],
        consumers: ['DEVELOPER'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/art-003/download`,
        content: '# Architecture Blueprint\n\n## System Overview\nMicroservice architecture built on Fastify, TypeScript, Zod, and PostgreSQL.\n\n## Layers\n- HTTP Transport API Layer\n- Service & Billing Orchestration Layer\n- Data Access & Persistence Layer\n',
      },
      {
        id: 'art-004',
        runId: mockId,
        type: 'SOURCE_CODE',
        producerAgent: 'DEVELOPER',
        agentType: 'DEVELOPER',
        filename: 'package.json',
        mimeType: 'application/json',
        sizeBytes: 320,
        storageKey: `artifacts/${mockId}/package.json`,
        createdAt: now,
        version: 1,
        dependencies: ['art-003'],
        consumers: ['REVIEWER', 'TESTER'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/art-004/download`,
        content: '{\n  "name": "meridian-api",\n  "version": "1.0.0",\n  "private": true,\n  "scripts": {\n    "dev": "tsx watch src/index.ts",\n    "build": "tsc",\n    "start": "node dist/index.js"\n  },\n  "dependencies": {\n    "fastify": "^5.0.0",\n    "zod": "^3.23.0"\n  }\n}\n',
      },
      {
        id: 'art-005',
        runId: mockId,
        type: 'SOURCE_CODE',
        producerAgent: 'DEVELOPER',
        agentType: 'DEVELOPER',
        filename: 'src/index.ts',
        mimeType: 'text/plain',
        sizeBytes: 512,
        storageKey: `artifacts/${mockId}/src/index.ts`,
        createdAt: now,
        version: 1,
        dependencies: ['art-003'],
        consumers: ['REVIEWER', 'TESTER'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/art-005/download`,
        content: `import Fastify from 'fastify';\nimport { healthRoute } from './routes/health';\n\nconst server = Fastify({ logger: true });\nserver.register(healthRoute);\n\nconst start = async () => {\n  try {\n    await server.listen({ port: 4000, host: '0.0.0.0' });\n    console.log('Meridian API running on http://localhost:4000');\n  } catch (err) {\n    server.log.error(err);\n    process.exit(1);\n  }\n};\n\nstart();\n`,
      },
      {
        id: 'art-006',
        runId: mockId,
        type: 'SOURCE_CODE',
        producerAgent: 'DEVELOPER',
        agentType: 'DEVELOPER',
        filename: 'src/routes/health.ts',
        mimeType: 'text/plain',
        sizeBytes: 280,
        storageKey: `artifacts/${mockId}/src/routes/health.ts`,
        createdAt: now,
        version: 1,
        dependencies: ['art-003'],
        consumers: ['REVIEWER', 'TESTER'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/art-006/download`,
        content: `import type { FastifyPluginAsync } from 'fastify';\n\nexport const healthRoute: FastifyPluginAsync = async (fastify) => {\n  fastify.get('/health', async () => {\n    return { status: 'ok', service: 'meridian-api', timestamp: new Date().toISOString() };\n  });\n};\n`,
      },
      {
        id: 'art-007',
        runId: mockId,
        type: 'ZIP',
        producerAgent: 'DEVELOPER',
        agentType: 'DEVELOPER',
        filename: 'Repository.zip',
        mimeType: 'application/zip',
        sizeBytes: zipBuffer.length,
        storageKey: `artifacts/${mockId}/Repository.zip`,
        createdAt: now,
        version: 1,
        dependencies: ['art-004', 'art-005', 'art-006'],
        consumers: ['REVIEWER', 'TESTER', 'SECURITY', 'DEVOPS'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/art-007/download`,
        content: zipBase64,
      },
      {
        id: 'art-008',
        runId: mockId,
        type: 'DOC',
        producerAgent: 'REVIEWER',
        agentType: 'REVIEWER',
        filename: 'Review.md',
        mimeType: 'text/markdown',
        sizeBytes: 920,
        storageKey: `artifacts/${mockId}/Review.md`,
        createdAt: now,
        version: 1,
        dependencies: ['art-007'],
        consumers: ['TESTER'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/art-008/download`,
        content: '# Code Review Report\n\n- All handlers strictly typed with Fastify and Zod.\n- Zero high/critical security findings.\n- Recommendation: Proceed to test phase.\n',
      },
      {
        id: 'art-009',
        runId: mockId,
        type: 'SECURITY',
        producerAgent: 'SECURITY',
        agentType: 'SECURITY',
        filename: 'SecurityAudit.md',
        mimeType: 'text/markdown',
        sizeBytes: 810,
        storageKey: `artifacts/${mockId}/SecurityAudit.md`,
        createdAt: now,
        version: 1,
        dependencies: ['art-007'],
        consumers: ['DEVOPS'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/art-009/download`,
        content: '# SAST & Dependency Security Audit\n\n- SAST scan score: 100/100\n- Vulnerabilities found: 0\n- Dependency vulnerability check: CLEAR\n',
      },
      {
        id: 'art-010',
        runId: mockId,
        type: 'DEPLOYMENT_PLAN',
        producerAgent: 'DEVOPS',
        agentType: 'DEVOPS',
        filename: 'DeploymentPlan.md',
        mimeType: 'text/markdown',
        sizeBytes: 1150,
        storageKey: `artifacts/${mockId}/DeploymentPlan.md`,
        createdAt: now,
        version: 1,
        dependencies: ['art-007', 'art-009'],
        consumers: ['DOCUMENTATION'],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/art-010/download`,
        content: '# Deployment Plan\n\n- Strategy: Blue/Green deployment\n- Environment: Staging / Production Kubernetes Cluster\n- Health Check: GET /health\n',
      },
      {
        id: 'art-011',
        runId: mockId,
        type: 'README',
        producerAgent: 'DOCUMENTATION',
        agentType: 'DOCUMENTATION',
        filename: 'README.md',
        mimeType: 'text/markdown',
        sizeBytes: 640,
        storageKey: `artifacts/${mockId}/README.md`,
        createdAt: now,
        version: 1,
        dependencies: ['art-007'],
        consumers: [],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/art-011/download`,
        content: '# Meridian API\n\nMulti-tenant billing engine with usage-based metering.\n\n## Quick Start\n\n```bash\nnpm install\nnpm run dev\n```\n',
      },
      {
        id: 'art-012',
        runId: mockId,
        type: 'SUMMARY_REPORT',
        producerAgent: 'DOCUMENTATION',
        agentType: 'DOCUMENTATION',
        filename: 'SummaryReport.md',
        mimeType: 'text/markdown',
        sizeBytes: 980,
        storageKey: `artifacts/${mockId}/SummaryReport.md`,
        createdAt: now,
        version: 1,
        dependencies: ['art-011'],
        consumers: [],
        downloadUrl: `/api/v1/runs/${mockId}/artifacts/art-012/download`,
        content: '# Executive Summary Report\n\nEnd-to-end autonomous engineering run completed successfully.\nAll pipeline stages verified clean build, passing unit tests, and security clearance.\n',
      },
    ];

    this.artifacts.set(mockId, seedArtifacts);
  }
}
