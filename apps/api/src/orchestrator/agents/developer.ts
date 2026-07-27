import type { IAgent, AgentExecutionResult } from '../agent-interface';
import type { SharedContext } from '../context';
import { ProviderRegistry } from '../../providers';
import { parseGeneratedFiles, type GeneratedFile } from '../file-parser';
import { createZipArchive } from '../../utils/zip-builder';

export class DeveloperAgent implements IAgent {
  public readonly agentType = 'DEVELOPER' as const;
  public readonly roleName = 'Developer Agent';

  public async execute(
    context: SharedContext,
    emitEvent: (message: string, eventType?: 'LOG' | 'STEP' | 'ARTIFACT', payload?: Record<string, unknown>) => void,
  ): Promise<AgentExecutionResult> {
    emitEvent('Reading Tasks.json, PRD.md, and Architecture.md specs from SharedContext...', 'STEP');

    const provider = ProviderRegistry.getInstance().getDefaultProvider();
    emitEvent(`Selected LLM Provider for Code Generation: ${provider.providerName} (${provider.defaultModel})`, 'LOG');

    const architectureSpec = context.get<string>('architectureSpec') ?? 'N/A';
    const tasksSpec = context.get<string>('tasksSpec') ?? 'N/A';

    const fallbackCodeBlock = `BEGIN FILE
path: package.json

{
  "name": "forgeone-generated-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "fastify": "^5.0.0",
    "zod": "^3.23.0"
  }
}

END FILE

BEGIN FILE
path: src/index.ts

import Fastify from 'fastify';

const server = Fastify({ logger: true });

server.get('/health', async () => {
  return { status: 'ok', service: '${context.title}' };
});

const start = async () => {
  try {
    await server.listen({ port: 4000, host: '0.0.0.0' });
    console.log('Server running at http://localhost:4000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

END FILE

BEGIN FILE
path: README.md

# ${context.title}

${context.description}

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`
END FILE
`;

    let rawCodeText = fallbackCodeBlock;

    if (provider.isConfigured() && provider.providerType !== 'mock') {
      try {
        emitEvent(`Requesting multi-file code generation from ${provider.providerName}...`, 'LOG');

        const prompt = `You are a Principal Software Engineer. Implement the codebase for the project below.

User Prompt: ${context.title} — ${context.description}

PRD / Tasks Specification:
${tasksSpec.slice(0, 1000)}

Architecture Blueprint:
${architectureSpec.slice(0, 1000)}

You MUST output production-ready project files using this EXACT format for each file:

BEGIN FILE
path: relative/path/to/file

<contents>

END FILE

Do not output explanations. Only output files.
`;

        const response = await provider.generate(prompt, {
          systemPrompt: 'You are an autonomous AI Software Engineer that outputs structured code files only.',
          temperature: 0.2,
          maxTokens: 8192,
        });

        if (response.text && response.text.trim().length > 50) {
          rawCodeText = response.text.trim();
          emitEvent(`Received raw code response (${response.usage?.totalTokens ?? 0} tokens) from ${provider.providerName}`, 'LOG');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown provider error';
        emitEvent(`Code generation provider error (${errorMsg}). Falling back to baseline generated codebase.`, 'LOG');
      }
    } else {
      emitEvent('No active LLM API key configured. Generating baseline project codebase.', 'LOG');
    }

    const generatedFiles: GeneratedFile[] = parseGeneratedFiles(rawCodeText);

    // If fallback or LLM failed to format files correctly, ensure we have at least baseline files
    if (generatedFiles.length === 0) {
      const fallbackFiles = parseGeneratedFiles(fallbackCodeBlock);
      generatedFiles.push(...fallbackFiles);
    }

    context.set('generatedFiles', generatedFiles);

    const artifactResults: Array<{ filename: string; mimeType: string; content: string }> = [];

    for (const file of generatedFiles) {
      emitEvent(`FILE_CREATED: ${file.path} (${file.size} bytes, ${file.language})`, 'LOG', {
        path: file.path,
        size: file.size,
        language: file.language,
      });

      emitEvent(`ARTIFACT_CREATED: Created artifact file ${file.path}`, 'ARTIFACT', {
        filename: file.path,
      });

      artifactResults.push({
        filename: file.path,
        mimeType: file.language === 'json' ? 'application/json' : 'text/plain',
        content: file.content,
      });
    }

    // Generate Repository.zip bundle
    const zipEntries = generatedFiles.map((f) => ({
      path: f.path,
      content: f.content,
    }));
    const zipBuffer = createZipArchive(zipEntries);
    const zipBase64 = zipBuffer.toString('base64');

    emitEvent('Bundled all generated files into Repository.zip downloadable archive', 'ARTIFACT', {
      filename: 'Repository.zip',
      sizeBytes: zipBuffer.length,
    });

    artifactResults.push({
      filename: 'Repository.zip',
      mimeType: 'application/zip',
      content: zipBase64,
    });

    return {
      agentType: this.agentType,
      summary: `Generated ${generatedFiles.length} project source files and bundled downloadable Repository.zip via ${provider.providerName}.`,
      artifacts: artifactResults,
    };
  }
}
