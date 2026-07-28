import type { IAgent, AgentExecutionResult } from '../agent-interface';
import type { SharedContext } from '../context';
import { ProviderRegistry } from '../../providers';
import { parseGeneratedFiles, detectLanguage, type GeneratedFile } from '../file-parser';
import { createZipArchive } from '../../utils/zip-builder';
import { deriveBlueprint } from '../blueprint';
import { scaffoldRepository } from '../scaffold';

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

    // The blueprint is derived from the user's prompt, so the baseline
    // codebase is specific to what they asked for rather than one fixed
    // sample project reused for every run.
    const blueprint = context.get<ReturnType<typeof deriveBlueprint>>('blueprint')
      ?? deriveBlueprint(context.title, context.description);

    let rawCodeText = '';

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
      emitEvent(
        `No active LLM API key configured. Generating baseline codebase from the derived project blueprint (${blueprint.entities.length} resources, ${blueprint.capabilities.length} capabilities).`,
        'LOG',
      );
    }

    const generatedFiles: GeneratedFile[] = parseGeneratedFiles(rawCodeText);

    // Either no provider was configured, or it replied in a format we could
    // not parse. Render the blueprint directly — the result is still specific
    // to this prompt rather than a fixed sample project.
    if (generatedFiles.length === 0) {
      for (const file of scaffoldRepository(blueprint)) {
        generatedFiles.push({
          path: file.path,
          content: file.content,
          language: detectLanguage(file.path),
          size: Buffer.byteLength(file.content, 'utf-8'),
        });
      }
    }

    context.set('generatedFiles', generatedFiles);

    const artifactResults: Array<{
      filename: string;
      mimeType: string;
      content: string;
      inRepository?: boolean;
    }> = [];

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
        // These are exactly the entries that go into Repository.zip below.
        inRepository: true,
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
      summary: `Generated ${generatedFiles.length} source files for ${blueprint.name} (${blueprint.entities.map((e) => e.plural).join(', ')}) and bundled Repository.zip via ${provider.providerName}.`,
      artifacts: artifactResults,
    };
  }
}
