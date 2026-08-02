import { describe, it, expect } from 'vitest';
import { deriveBlueprint } from '../orchestrator/blueprint';
import { scaffoldRepository } from '../orchestrator/scaffold';
import { extractPromptNouns, detectDomain, singularize } from '../orchestrator/domain';

describe('Semantic project understanding', () => {
  describe('extractPromptNouns', () => {
    it('lifts nouns from an explicit "with" list', () => {
      const nouns = extractPromptNouns('Ship a chat app with channels, threads, and reactions');
      expect(nouns).toContain('channel');
      expect(nouns).toContain('thread');
      expect(nouns).toContain('reaction');
    });

    it('keeps compound nouns together as snake_case', () => {
      const nouns = extractPromptNouns('Hospital system with medical records and lab results');
      expect(nouns).toContain('medical_record');
    });

    it('ignores technology names and filler words', () => {
      const nouns = extractPromptNouns('Build an app with a Postgres backend using Docker');
      expect(nouns).not.toContain('postgres');
      expect(nouns).not.toContain('backend');
      expect(nouns).not.toContain('docker');
      expect(nouns).not.toContain('app');
    });

    it('does not treat a word ending in a double s as a plural', () => {
      // "chess" was previously singularised to "ches" and re-pluralised to
      // "chesses", producing a nonsense resource.
      expect(extractPromptNouns('Build a chess platform')).not.toContain('chess');
    });
  });

  describe('singularize', () => {
    it.each([
      ['channels', 'channel'],
      ['companies', 'company'],
      ['people', 'person'],
      ['matches', 'match'],
      ['chess', 'chess'],
      ['analysis', 'analysis'],
      // A lone `z` doubles before `-es`, so the singular is "quiz", not "quizz".
      ['quizzes', 'quiz'],
    ])('%s -> %s', (input, expected) => {
      expect(singularize(input)).toBe(expected);
    });
  });

  describe('detectDomain', () => {
    it('identifies a domain from a single conclusive term', () => {
      expect(detectDomain('Build a Hospital Management system').profile?.id).toBe('healthcare');
      expect(detectDomain('Build a Chess Platform').profile?.id).toBe('chess');
    });

    it('does not claim a domain for an unrelated prompt', () => {
      const { score } = detectDomain('Build a widget for my garden shed');
      expect(score).toBeLessThan(2);
    });
  });

  describe('deriveBlueprint', () => {
    it('is deterministic for the same prompt', () => {
      const a = deriveBlueprint('Build a Chess Platform', 'ranked play');
      const b = deriveBlueprint('Build a Chess Platform', 'ranked play');
      expect(a).toEqual(b);
    });

    // The domains named in the brief, with the resources each must produce.
    it.each([
      ['Build a Chess Platform', ['player', 'game', 'move']],
      ['Build a Hospital Management system', ['patient', 'doctor', 'appointment']],
      ['Build a Research Platform for papers', ['paper', 'dataset', 'experiment']],
      ['Build an E-Commerce storefront', ['product', 'order', 'customer']],
      ['Build a Netflix clone', ['title', 'episode', 'profile']],
      ['Build a Resume Builder', ['resume', 'template', 'section']],
    ])('%s models the right resources', (prompt, expected) => {
      const bp = deriveBlueprint(prompt, prompt);
      const names = bp.entities.map((e) => e.name);
      for (const resource of expected) expect(names).toContain(resource);
    });

    it('prefers resources supplied by a provider over local inference', () => {
      const bp = deriveBlueprint('Build a chess platform', 'ranked play', {
        suppliedResources: ['grandmaster', 'opening_line'],
      });
      const names = bp.entities.map((e) => e.name);
      expect(names[0]).toBe('grandmaster');
      expect(names).toContain('opening_line');
    });

    it('infers foreign keys and materialises them as reference fields', () => {
      const bp = deriveBlueprint('Build a Chess Platform', 'games and moves');
      const move = bp.entities.find((e) => e.name === 'move');
      expect(move).toBeDefined();

      const fk = move!.fields.find((f) => f.references === 'game');
      expect(fk).toBeDefined();
      expect(fk!.name).toBe('game_id');
      expect(fk!.type).toBe('uuid');

      expect(bp.relations).toContainEqual({ from: 'move', to: 'game', kind: 'many-to-one' });
    });

    it('never emits a relation whose endpoints were not both modelled', () => {
      const bp = deriveBlueprint('Build a Hospital Management system', 'patients and doctors');
      const names = new Set(bp.entities.map((e) => e.name));
      for (const relation of bp.relations) {
        expect(names.has(relation.from)).toBe(true);
        expect(names.has(relation.to)).toBe(true);
      }
    });

    it('adds capabilities the domain implies even when unstated', () => {
      const bp = deriveBlueprint('Build a Chess Platform', 'ranked play');
      expect(bp.capabilities.map((c) => c.id)).toContain('realtime');
    });

    it('falls back to a generic resource for an unrecognisable prompt', () => {
      const bp = deriveBlueprint('zzzz qqqq', 'wwww');
      expect(bp.entities.length).toBeGreaterThan(0);
      expect(bp.domain).toBeNull();
    });

    it('produces different models for different domains', () => {
      const chess = deriveBlueprint('Build a Chess Platform', 'ranked play');
      const hospital = deriveBlueprint('Build a Hospital Management system', 'patient care');
      expect(chess.entities.map((e) => e.name)).not.toEqual(hospital.entities.map((e) => e.name));
      expect(chess.domain).not.toBe(hospital.domain);
    });
  });

  describe('scaffoldRepository', () => {
    it('emits a repository whose files agree with the blueprint', () => {
      const bp = deriveBlueprint('Build a Chess Platform', 'games, moves and ratings');
      const files = scaffoldRepository(bp);
      const paths = files.map((f) => f.path);

      for (const required of [
        'package.json',
        'tsconfig.json',
        '.env.example',
        'src/config.ts',
        'src/index.ts',
        'src/db/client.ts',
        'src/db/schema.sql',
        'Dockerfile',
        'README.md',
      ]) {
        expect(paths).toContain(required);
      }

      const index = files.find((f) => f.path === 'src/index.ts')!.content;
      for (const entity of bp.entities) {
        expect(paths).toContain(`src/routes/${entity.plural}.ts`);
        expect(index).toContain(`/api/${entity.plural}`);
      }
    });

    it('declares foreign keys in the SQL schema', () => {
      const bp = deriveBlueprint('Build a Chess Platform', 'games and moves');
      const sql = scaffoldRepository(bp).find((f) => f.path === 'src/db/schema.sql')!.content;

      expect(sql).toContain('references games(id) on delete cascade');
      expect(sql).toContain('create index if not exists moves_game_id_idx');
    });

    it('declares every table before it is referenced', () => {
      const bp = deriveBlueprint('Build a Hospital Management system', 'patients and appointments');
      const sql = scaffoldRepository(bp).find((f) => f.path === 'src/db/schema.sql')!.content;

      for (const relation of bp.relations) {
        const parent = bp.entities.find((e) => e.name === relation.to)!;
        const child = bp.entities.find((e) => e.name === relation.from)!;
        const parentIdx = sql.indexOf(`create table if not exists ${parent.plural}`);
        const childIdx = sql.indexOf(`create table if not exists ${child.plural}`);
        expect(parentIdx).toBeGreaterThanOrEqual(0);
        expect(parentIdx).toBeLessThan(childIdx);
      }
    });

    it('lists only the environment variables the capabilities require', () => {
      const billing = scaffoldRepository(
        deriveBlueprint('Build an E-Commerce storefront with Stripe checkout', 'payments'),
      ).find((f) => f.path === '.env.example')!.content;
      expect(billing).toContain('STRIPE_SECRET_KEY');

      const plain = scaffoldRepository(
        deriveBlueprint('Build a Resume Builder', 'resumes and templates'),
      ).find((f) => f.path === '.env.example')!.content;
      expect(plain).not.toContain('STRIPE_SECRET_KEY');
    });

    it('wires a realtime gateway only when the prompt implies one', () => {
      const realtime = scaffoldRepository(
        deriveBlueprint('Build a collaborative canvas', 'realtime cursors and presence'),
      ).find((f) => f.path === 'src/index.ts')!.content;
      expect(realtime).toContain('WebSocketServer');

      const plain = scaffoldRepository(
        deriveBlueprint('Build a Resume Builder', 'resumes and templates'),
      ).find((f) => f.path === 'src/index.ts')!.content;
      expect(plain).not.toContain('WebSocketServer');
    });

    it('binds SQL parameters rather than interpolating them', () => {
      const bp = deriveBlueprint('Build a Chess Platform', 'games and moves');
      for (const file of scaffoldRepository(bp)) {
        if (!file.path.startsWith('src/routes/')) continue;
        // Every query must use positional parameters.
        expect(file.content).toMatch(/\$1/);
        expect(file.content).not.toMatch(/select \* from \$\{/);
      }
    });

    it('produces no empty files', () => {
      const files = scaffoldRepository(deriveBlueprint('Build a CRM', 'deals and contacts'));
      for (const file of files) {
        expect(file.content.trim().length).toBeGreaterThan(0);
      }
    });

    it('never emits two route modules for the same resource', () => {
      // A prompt naming "quizzes" once yielded both quizes.ts and quizzes.ts:
      // the domain profile contributed "quiz" while the prompt singularised to
      // "quizz", so the two never collided during de-duplication. Any pair of
      // route modules whose names differ only by a doubled consonant is the
      // same defect wearing a different word.
      const prompts: Array<[string, string]> = [
        ['Build an online learning platform', 'courses, lessons and quizzes'],
        ['Build a Hospital Management system', 'patients, doctors and appointments'],
        ['Build an e-commerce store', 'products, orders and customers'],
      ];

      for (const [title, description] of prompts) {
        const routes = scaffoldRepository(deriveBlueprint(title, description))
          .filter((f) => f.path.startsWith('src/routes/'))
          .map((f) => f.path.replace('src/routes/', '').replace('.ts', ''));

        expect(new Set(routes).size).toBe(routes.length);

        // Collapse runs of repeated letters; two resources that agree once
        // collapsed are the same noun spelled two ways.
        const collapsed = routes.map((r) => r.replace(/(.)+/g, '$1'));
        expect(new Set(collapsed).size).toBe(collapsed.length);
      }
    });
  });
});
