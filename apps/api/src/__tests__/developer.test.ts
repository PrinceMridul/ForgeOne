import { describe, it, expect } from 'vitest';
import { parseGeneratedFiles } from '../orchestrator/file-parser';
import { createZipArchive } from '../utils/zip-builder';
import { DeveloperAgent } from '../orchestrator/agents/developer';
import { SharedContext } from '../orchestrator/context';

describe('Developer Agent & Code Generation Pipeline Test Suite', () => {
  describe('Structured File Parser', () => {
    it('parseGeneratedFiles should parse BEGIN FILE ... path: ... END FILE blocks correctly', () => {
      const rawOutput = `
BEGIN FILE
path: src/index.ts

console.log("hello world");

END FILE

BEGIN FILE
path: package.json

{ "name": "test-pkg" }

END FILE
`;

      const files = parseGeneratedFiles(rawOutput);
      expect(files.length).toBe(2);
      expect(files[0]?.path).toBe('src/index.ts');
      expect(files[0]?.content).toBe('console.log("hello world");');
      expect(files[0]?.language).toBe('typescript');

      expect(files[1]?.path).toBe('package.json');
      expect(files[1]?.content).toBe('{ "name": "test-pkg" }');
      expect(files[1]?.language).toBe('json');
    });
  });

  describe('Zip Builder Utility', () => {
    it('createZipArchive should produce valid PKZip buffer with local and central headers', () => {
      const entries = [
        { path: 'README.md', content: '# Test Project' },
        { path: 'src/app.ts', content: 'export const app = {};' },
      ];

      const zipBuf = createZipArchive(entries);
      expect(Buffer.isBuffer(zipBuf)).toBe(true);
      expect(zipBuf.length).toBeGreaterThan(100);

      // Check PKZip signature bytes: 0x50 0x4B 0x03 0x04 ("PK\x03\x04")
      expect(zipBuf[0]).toBe(0x50);
      expect(zipBuf[1]).toBe(0x4b);
      expect(zipBuf[2]).toBe(0x03);
      expect(zipBuf[3]).toBe(0x04);
    });
  });

  describe('DeveloperAgent Execution', () => {
    it('DeveloperAgent should generate source files and bundle Repository.zip', async () => {
      const agent = new DeveloperAgent();
      const context = new SharedContext(
        'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'ForgeOne Microservices',
        'Build real-time microservices workspace',
      );

      context.set('tasksSpec', '{"epics": []}');
      context.set('architectureSpec', '# System Architecture Blueprint');

      const events: string[] = [];
      const result = await agent.execute(context, (msg) => events.push(msg));

      expect(result.agentType).toBe('DEVELOPER');
      expect(result.artifacts).toBeDefined();
      expect(result.artifacts?.length).toBeGreaterThan(1);

      const zipArtifact = result.artifacts?.find((a) => a.filename === 'Repository.zip');
      expect(zipArtifact).toBeDefined();
      expect(zipArtifact?.mimeType).toBe('application/zip');

      const fileCreatedEvents = events.filter((e) => e.includes('FILE_CREATED'));
      expect(fileCreatedEvents.length).toBeGreaterThan(0);
    });
  });
});
