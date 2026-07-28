import { describe, it, expect } from 'vitest';
import { deriveBlueprint } from '../orchestrator/blueprint';
import { scaffoldRepository } from '../orchestrator/scaffold';

describe('Prompt-derived Project Blueprint', () => {
  describe('deriveBlueprint', () => {
    it('is deterministic for the same prompt', () => {
      const a = deriveBlueprint('Ship a Slack-like chat', 'channels, threads, presence');
      const b = deriveBlueprint('Ship a Slack-like chat', 'channels, threads, presence');
      expect(a).toEqual(b);
    });

    it('derives a repository name without imperative verbs or filler', () => {
      const bp = deriveBlueprint(
        'Build a Notion-style docs app with realtime cursors',
        'Collaborative documents',
      );
      expect(bp.name).not.toContain('build');
      expect(bp.name).not.toContain('the');
      expect(bp.name).toMatch(/^[a-z0-9-]+$/);
    });

    it('extracts chat resources from a messaging prompt', () => {
      const bp = deriveBlueprint(
        'Ship a Slack-like chat',
        'channels, threads, presence, and full-text search',
      );
      const names = bp.entities.map((e) => e.name);
      expect(names).toContain('channel');
      expect(names).toContain('thread');
    });

    it('extracts commerce resources from a storefront prompt', () => {
      const bp = deriveBlueprint(
        'Build a headless storefront',
        'CMS, Stripe checkout, and product recommendations',
      );
      const names = bp.entities.map((e) => e.name);
      expect(names).toContain('product');
      expect(names).toContain('order');
    });

    it('detects capabilities and maps them to dependencies', () => {
      const bp = deriveBlueprint(
        'Build a realtime whiteboard',
        'live cursors, presence, Stripe billing, and file uploads',
      );
      const caps = bp.capabilities.map((c) => c.id);
      expect(caps).toContain('realtime');
      expect(caps).toContain('billing');
      expect(caps).toContain('storage');

      expect(bp.dependencies).toHaveProperty('ws');
      expect(bp.dependencies).toHaveProperty('stripe');
      expect(bp.dependencies).toHaveProperty('@aws-sdk/client-s3');
    });

    it('produces different blueprints for different prompts', () => {
      const chat = deriveBlueprint('Ship a Slack-like chat', 'channels and threads');
      const shop = deriveBlueprint('Build a storefront', 'products and checkout');
      expect(chat.name).not.toBe(shop.name);
      expect(chat.entities.map((e) => e.name)).not.toEqual(shop.entities.map((e) => e.name));
    });

    it('does not match a resource keyword inside a longer word', () => {
      // "Postgres" contains "post"; a substring match produced a bogus
      // `posts` resource for a documents app.
      const bp = deriveBlueprint(
        'Build a Notion-style docs app with realtime cursors, comments, and a Postgres backend',
        'Collaborative documents',
      );
      const names = bp.entities.map((e) => e.name);
      expect(names).toContain('document');
      expect(names).toContain('comment');
      expect(names).not.toContain('post');
    });

    it('still matches plural and gerund forms of a resource keyword', () => {
      const plural = deriveBlueprint('Ship a chat with channels', 'threads and messages');
      expect(plural.entities.map((e) => e.name)).toContain('channel');

      const gerund = deriveBlueprint('Prototype a video conferencing app', 'rooms and recordings');
      expect(gerund.entities.map((e) => e.name)).toContain('room');
      expect(gerund.entities.map((e) => e.name)).toContain('recording');
    });

    it('always yields at least one resource, even for an unrecognisable prompt', () => {
      const bp = deriveBlueprint('zzzz', 'qqqq');
      expect(bp.entities.length).toBeGreaterThan(0);
      expect(bp.name.length).toBeGreaterThan(0);
    });

    it('caps resources so generated repositories stay readable', () => {
      const bp = deriveBlueprint(
        'Build everything',
        'channels threads messages documents pages comments boards cards issues tasks projects products orders',
      );
      expect(bp.entities.length).toBeLessThanOrEqual(4);
    });
  });

  describe('scaffoldRepository', () => {
    it('emits a coherent repository whose files agree with the blueprint', () => {
      const bp = deriveBlueprint('Ship a Slack-like chat', 'channels, threads, and presence');
      const files = scaffoldRepository(bp);
      const paths = files.map((f) => f.path);

      expect(paths).toContain('package.json');
      expect(paths).toContain('src/index.ts');
      expect(paths).toContain('src/db/schema.sql');
      expect(paths).toContain('README.md');
      expect(paths).toContain('Dockerfile');

      // Every entity gets a route module, and index.ts registers each one.
      const index = files.find((f) => f.path === 'src/index.ts')!.content;
      for (const entity of bp.entities) {
        expect(paths).toContain(`src/routes/${entity.plural}.ts`);
        expect(index).toContain(`/api/${entity.plural}`);
      }
    });

    it('names package.json after the derived project', () => {
      const bp = deriveBlueprint('Build a headless storefront', 'products and checkout');
      const files = scaffoldRepository(bp);
      const pkg = JSON.parse(files.find((f) => f.path === 'package.json')!.content) as {
        name: string;
        dependencies: Record<string, string>;
      };
      expect(pkg.name).toBe(bp.name);
      expect(pkg.dependencies).toHaveProperty('fastify');
    });

    it('creates one table per resource in the SQL schema', () => {
      const bp = deriveBlueprint('Ship a chat app', 'channels and messages');
      const sql = scaffoldRepository(bp).find((f) => f.path === 'src/db/schema.sql')!.content;
      for (const entity of bp.entities) {
        expect(sql).toContain(`create table if not exists ${entity.plural}`);
      }
    });

    it('wires a realtime gateway only when the prompt implies one', () => {
      const realtime = scaffoldRepository(
        deriveBlueprint('Build a collaborative canvas', 'realtime cursors and presence'),
      ).find((f) => f.path === 'src/index.ts')!.content;
      expect(realtime).toContain('WebSocketServer');

      const plain = scaffoldRepository(
        deriveBlueprint('Build an invoice tracker', 'record invoices'),
      ).find((f) => f.path === 'src/index.ts')!.content;
      expect(plain).not.toContain('WebSocketServer');
    });

    it('produces no empty files', () => {
      const files = scaffoldRepository(deriveBlueprint('Build a task tracker', 'tasks and projects'));
      for (const file of files) {
        expect(file.content.trim().length).toBeGreaterThan(0);
      }
    });
  });
});
