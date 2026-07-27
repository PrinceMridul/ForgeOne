import { describe, it, expect } from 'vitest';
import { ArtifactGraph, SharedContext } from '../orchestrator/context';
import { ExecutionPipeline } from '../orchestrator/pipeline';
import { AgentRegistry } from '../orchestrator/agent-registry';

describe('Artifact-Driven Dependency Graph Engine Test Suite', () => {
  describe('ArtifactGraph Core Operations & Immutability', () => {
    it('should add artifacts with automatic versioning and immutability', () => {
      const graph = new ArtifactGraph();

      const artV1 = graph.addArtifact({
        type: 'PRD',
        producerAgent: 'PRODUCT_MANAGER',
        filename: 'PRD.md',
        mimeType: 'text/markdown',
        content: '# PRD v1',
        runId: 'test-run-101',
      });

      expect(artV1.version).toBe(1);
      expect(artV1.type).toBe('PRD');
      expect(artV1.producerAgent).toBe('PRODUCT_MANAGER');
      expect(Object.isFrozen(artV1)).toBe(true);

      // Adding second version of same filename increments version
      const artV2 = graph.addArtifact({
        type: 'PRD',
        producerAgent: 'PRODUCT_MANAGER',
        filename: 'PRD.md',
        mimeType: 'text/markdown',
        content: '# PRD v2',
        runId: 'test-run-101',
      });

      expect(artV2.version).toBe(2);
      expect(graph.getLatestArtifactByFilename('PRD.md')?.content).toBe('# PRD v2');
    });

    it('should track artifact consumers cleanly and preserve immutability', () => {
      const graph = new ArtifactGraph();
      const art = graph.addArtifact({
        type: 'ARCHITECTURE',
        producerAgent: 'ARCHITECT',
        filename: 'Architecture.md',
        mimeType: 'text/markdown',
        content: '# Blueprint',
        runId: 'test-run-102',
      });

      expect(art.consumers).toHaveLength(0);

      const consumed = graph.consumeArtifact(art.id, 'DEVELOPER');
      expect(consumed?.consumers).toContain('DEVELOPER');
      expect(Object.isFrozen(consumed)).toBe(true);
    });

    it('should evaluate hasArtifactTypes correctly', () => {
      const graph = new ArtifactGraph();
      graph.addArtifact({
        type: 'PRD',
        producerAgent: 'PRODUCT_MANAGER',
        filename: 'PRD.md',
        mimeType: 'text/markdown',
        content: 'content',
        runId: 'run-1',
      });
      graph.addArtifact({
        type: 'TASKS',
        producerAgent: 'PRODUCT_MANAGER',
        filename: 'Tasks.json',
        mimeType: 'application/json',
        content: '{}',
        runId: 'run-1',
      });

      expect(graph.hasArtifactTypes(['PRD', 'TASKS'])).toBe(true);
      expect(graph.hasArtifactTypes(['PRD', 'ARCHITECTURE'])).toBe(false);
    });
  });

  describe('ExecutionPipeline Dependency Resolution & State Telemetry', () => {
    it('should execute complete pipeline while resolving dependencies and emitting telemetry', async () => {
      const registry = new AgentRegistry();
      const pipeline = new ExecutionPipeline(registry);

      const context = new SharedContext(
        'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'ForgeOne Dependency Graph Pipeline',
        'Test artifact-driven orchestration',
      );

      const run = {
        id: context.runId,
        projectId: context.projectId,
        title: context.title,
        description: context.description,
        status: 'PENDING' as const,
        currentAgent: 'ORCHESTRATOR' as const,
        stepProgress: 0,
        totalSteps: 8,
        completedSteps: 0,
        startedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      const emittedEvents: string[] = [];

      await pipeline.executePipeline(
        run,
        context,
        (ev) => emittedEvents.push(ev.message),
        () => {},
        () => {},
      );

      expect(run.status).toBe('COMPLETED');

      // Verify execution states emitted
      const statesInTelemetry = ['WAITING_FOR_INPUT', 'RUNNING', 'GENERATING_ARTIFACTS', 'VALIDATING', 'COMPLETE'];
      for (const state of statesInTelemetry) {
        const found = emittedEvents.some((msg) => msg.includes(`[${state}]`));
        expect(found).toBe(true);
      }

      // Verify artifact telemetry events
      expect(emittedEvents.some((msg) => msg.includes('[ARTIFACT_CREATED]'))).toBe(true);
      expect(emittedEvents.some((msg) => msg.includes('[ARTIFACT_CONSUMED]'))).toBe(true);
      expect(emittedEvents.some((msg) => msg.includes('[DEPENDENCY_SATISFIED]'))).toBe(true);
      expect(emittedEvents.some((msg) => msg.includes('[AGENT_UNBLOCKED]'))).toBe(true);
    });
  });
});
