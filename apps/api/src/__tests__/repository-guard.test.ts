import { describe, it, expect } from 'vitest';
import {
  normalizeRepositoryPath,
  guardRepositoryFiles,
  isViableRepository,
  DEFAULT_LIMITS,
} from '../orchestrator/repository-guard';
import { createZipArchive } from '../utils/zip-builder';
import { parseGeneratedFiles } from '../orchestrator/file-parser';

/** Entry names from a zip's central directory. */
function zipEntryNames(buf: Buffer): string[] {
  const names: string[] = [];
  let i = 0;
  while (i < buf.length - 4) {
    if (buf.readUInt32LE(i) === 0x02014b50) {
      const nameLen = buf.readUInt16LE(i + 28);
      const extraLen = buf.readUInt16LE(i + 30);
      const commentLen = buf.readUInt16LE(i + 32);
      names.push(buf.subarray(i + 46, i + 46 + nameLen).toString('utf-8'));
      i += 46 + nameLen + extraLen + commentLen;
    } else i++;
  }
  return names;
}

/** Entry count declared in the End of Central Directory record. */
function zipDeclaredCount(buf: Buffer): number {
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) return buf.readUInt16LE(i + 10);
  }
  return -1;
}

describe('Repository guard (untrusted provider output)', () => {
  describe('normalizeRepositoryPath', () => {
    it.each([
      ['../../../../etc/cron.d/backdoor', 'path-traversal'],
      ['src/../../escape.ts', 'path-traversal'],
      ['..', 'path-traversal'],
      ['/etc/passwd', 'absolute-path'],
      ['C:\\Windows\\System32\\hosts', 'absolute-path'],
      ['c:/windows/hosts', 'absolute-path'],
      ['', 'empty-path'],
      ['   ', 'empty-path'],
      ['./', 'empty-path'],
      ['CON.ts', 'reserved-name'],
      ['src/nul.json', 'reserved-name'],
      ['src/com1.ts', 'reserved-name'],
      ['src/bad\u0000name.ts', 'illegal-character'],
      ['src/a:b.ts', 'illegal-character'],
      // Windows silently strips a trailing dot or space from a path segment,
      // which would make two distinct entries collide after extraction.
      // (A trailing space on the whole path is just trimmed, so the hazard is
      // an internal segment.)
      ['src/dir /file.ts', 'illegal-character'],
      ['src/trailing.', 'illegal-character'],
      ['src/trailing./x.ts', 'illegal-character'],
    ])('rejects %s as %s', (input, reason) => {
      const result = normalizeRepositoryPath(input);
      expect(result).toEqual({ reason });
    });

    it.each([
      ['src/index.ts', 'src/index.ts'],
      ['./src/index.ts', 'src/index.ts'],
      ['src//db//schema.sql', 'src/db/schema.sql'],
      ['src\\routes\\users.ts', 'src/routes/users.ts'],
      ['src/nested/../index.ts', 'src/index.ts'],
      ['package.json', 'package.json'],
    ])('accepts %s as %s', (input, expected) => {
      expect(normalizeRepositoryPath(input)).toEqual({ path: expected });
    });

    it('rejects a path longer than the limit', () => {
      const long = `src/${'a'.repeat(DEFAULT_LIMITS.maxPathLength)}.ts`;
      expect(normalizeRepositoryPath(long)).toEqual({ reason: 'path-too-long' });
    });
  });

  describe('guardRepositoryFiles', () => {
    it('keeps the first claim on a path and rejects later duplicates', () => {
      const { files, rejections } = guardRepositoryFiles([
        { path: 'src/a.ts', content: 'first' },
        { path: 'src/a.ts', content: 'second' },
      ]);
      expect(files).toHaveLength(1);
      expect(files[0]!.content).toBe('first');
      expect(rejections[0]!.reason).toBe('duplicate-path');
    });

    it('treats paths differing only by case as duplicates', () => {
      // Extraction on a case-insensitive filesystem would collide.
      const { files, rejections } = guardRepositoryFiles([
        { path: 'README.md', content: 'a' },
        { path: 'readme.md', content: 'b' },
      ]);
      expect(files).toHaveLength(1);
      expect(rejections[0]!.reason).toBe('duplicate-path');
    });

    it('rejects an oversized file but keeps the rest', () => {
      const { files, rejections } = guardRepositoryFiles([
        { path: 'huge.txt', content: 'x'.repeat(DEFAULT_LIMITS.maxFileBytes + 1) },
        { path: 'small.ts', content: 'ok' },
      ]);
      expect(files.map((f) => f.path)).toEqual(['small.ts']);
      expect(rejections[0]!.reason).toBe('file-too-large');
    });

    it('stops once the total byte budget is exhausted', () => {
      const chunk = 'x'.repeat(DEFAULT_LIMITS.maxFileBytes);
      const candidates = Array.from({ length: 20 }, (_, i) => ({
        path: `f${i}.txt`,
        content: chunk,
      }));
      const { files, rejections } = guardRepositoryFiles(candidates);
      const total = files.reduce((n, f) => n + Buffer.byteLength(f.content), 0);
      expect(total).toBeLessThanOrEqual(DEFAULT_LIMITS.maxTotalBytes);
      expect(rejections.some((r) => r.reason === 'budget-exceeded')).toBe(true);
    });

    it('caps the number of files', () => {
      const candidates = Array.from({ length: DEFAULT_LIMITS.maxFiles + 10 }, (_, i) => ({
        path: `f${i}.ts`,
        content: 'x',
      }));
      const { files, rejections } = guardRepositoryFiles(candidates);
      expect(files).toHaveLength(DEFAULT_LIMITS.maxFiles);
      expect(rejections.some((r) => r.reason === 'too-many-files')).toBe(true);
    });

    it('drops empty files', () => {
      const { files, rejections } = guardRepositoryFiles([
        { path: 'blank.ts', content: '   \n  ' },
        { path: 'real.ts', content: 'const a = 1;' },
      ]);
      expect(files.map((f) => f.path)).toEqual(['real.ts']);
      expect(rejections[0]!.reason).toBe('empty-content');
    });

    it('is deterministic for the same input', () => {
      const input = [
        { path: 'src/b.ts', content: 'b' },
        { path: '../evil', content: 'x' },
        { path: 'src/a.ts', content: 'a' },
      ];
      expect(guardRepositoryFiles(input)).toEqual(guardRepositoryFiles(input));
    });
  });

  describe('isViableRepository', () => {
    it('requires a manifest and a minimum file count', () => {
      expect(isViableRepository([])).toBe(false);
      expect(
        isViableRepository([
          { path: 'a.md', content: 'x' },
          { path: 'b.md', content: 'x' },
          { path: 'c.md', content: 'x' },
        ]),
      ).toBe(false);
      expect(
        isViableRepository([
          { path: 'package.json', content: '{}' },
          { path: 'src/index.ts', content: 'x' },
          { path: 'README.md', content: 'x' },
        ]),
      ).toBe(true);
    });
  });

  describe('createZipArchive hardening', () => {
    it('never writes a traversal, absolute or duplicate entry', () => {
      const zip = createZipArchive([
        { path: '../../../../etc/cron.d/backdoor', content: 'evil' },
        { path: '/absolute/secrets.env', content: 'evil' },
        { path: 'C:\\Windows\\System32\\hosts', content: 'evil' },
        { path: 'src/../../escape.ts', content: 'evil' },
        { path: 'src/routes/users.ts', content: 'first' },
        { path: 'src/routes/users.ts', content: 'duplicate' },
        { path: 'CON.ts', content: 'reserved' },
      ]);

      const names = zipEntryNames(zip);
      expect(names).toEqual(['src/routes/users.ts']);
      expect(names.some((n) => n.includes('..'))).toBe(false);
      expect(names.some((n) => n.startsWith('/') || /^[a-zA-Z]:/.test(n))).toBe(false);
    });

    it('declares an entry count matching what it actually wrote', () => {
      // A mismatch here is what archive readers report as a corrupt file.
      const zip = createZipArchive([
        { path: 'keep.ts', content: 'a' },
        { path: '../drop.ts', content: 'b' },
        { path: 'keep.ts', content: 'c' },
      ]);
      expect(zipDeclaredCount(zip)).toBe(zipEntryNames(zip).length);
      expect(zipDeclaredCount(zip)).toBe(1);
    });

    it('normalises separators so a Windows-style path stays one entry', () => {
      const zip = createZipArchive([{ path: 'src\\db\\schema.sql', content: 'x' }]);
      expect(zipEntryNames(zip)).toEqual(['src/db/schema.sql']);
    });
  });

  describe('parseGeneratedFiles', () => {
    it('does not adopt file content as a filename when path is blank', () => {
      // A blank `path:` previously caused the next content line to become the
      // filename, yielding entries like `empty path`.
      const files = parseGeneratedFiles(
        'BEGIN FILE\npath:\n\nsome file body here\n\nEND FILE\n',
      );
      expect(files.every((f) => f.path.trim().length > 0)).toBe(true);
      expect(files.map((f) => f.path)).not.toContain('some file body here');
    });

    it('still parses a well-formed block', () => {
      const files = parseGeneratedFiles(
        'BEGIN FILE\npath: src/index.ts\n\nconst a = 1;\n\nEND FILE\n',
      );
      expect(files).toHaveLength(1);
      expect(files[0]!.path).toBe('src/index.ts');
      expect(files[0]!.content).toContain('const a = 1;');
    });
  });
});
