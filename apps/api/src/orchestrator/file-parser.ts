export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  size: number;
}

export function detectLanguage(filepath: string): string {
  const ext = filepath.slice(filepath.lastIndexOf('.')).toLowerCase();
  switch (ext) {
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return 'javascript';
    case '.json':
      return 'json';
    case '.md':
      return 'markdown';
    case '.py':
      return 'python';
    case '.html':
      return 'html';
    case '.css':
      return 'css';
    case '.yaml':
    case '.yml':
      return 'yaml';
    case '.sh':
    case '.bash':
      return 'shell';
    case '.prisma':
      return 'prisma';
    default:
      return 'plaintext';
  }
}

/**
 * Parses raw LLM response into structured GeneratedFile objects based on:
 * BEGIN FILE
 * path: <relative_path>
 * <content>
 * END FILE
 */
export function parseGeneratedFiles(rawText: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // Match BEGIN FILE ... path: <filepath> ... END FILE
  const fileBlockRegex = /BEGIN FILE[\r\n]+path:\s*([^\r\n]+)[\r\n]+([\s\S]*?)(?:END FILE|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = fileBlockRegex.exec(rawText)) !== null) {
    const rawPath = match[1]?.trim();
    let content = match[2] ?? '';

    if (!rawPath) continue;

    // Clean up content trimming
    content = content.replace(/^[\r\n]+/, '').replace(/[\r\n]+$/, '');

    const language = detectLanguage(rawPath);
    const size = Buffer.byteLength(content, 'utf-8');

    files.push({
      path: rawPath,
      content,
      language,
      size,
    });
  }

  // Fallback: If no files matched via BEGIN FILE block format, parse markdown code fences
  if (files.length === 0) {
    const markdownFenceRegex = /```(?:[a-z0-9_-]+\s+)?(?:filepath=|file=|path=)?([^\r\n`]+\.[a-z0-9]+)[\r\n]+([\s\S]*?)```/gi;
    let mdMatch: RegExpExecArray | null;
    while ((mdMatch = markdownFenceRegex.exec(rawText)) !== null) {
      const rawPath = mdMatch[1]?.trim();
      const content = mdMatch[2]?.trim() ?? '';
      if (rawPath) {
        files.push({
          path: rawPath,
          content,
          language: detectLanguage(rawPath),
          size: Buffer.byteLength(content, 'utf-8'),
        });
      }
    }
  }

  return files;
}
