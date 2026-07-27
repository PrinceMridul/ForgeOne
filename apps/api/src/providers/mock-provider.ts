import type { LLMProvider, LLMProviderType, LLMGenerateOptions, LLMResponse } from './types';

export class MockLLMProvider implements LLMProvider {
  public readonly providerType: LLMProviderType = 'mock';
  public readonly providerName = 'Mock LLM Provider';
  public readonly defaultModel = 'mock-v1';

  public isConfigured(): boolean {
    return true;
  }

  public async generate(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse> {
    const model = options?.model ?? this.defaultModel;
    const text = `# Mock Generated Response\n\nPrompt received: "${prompt.slice(0, 100)}..."\n\nGenerated via Mock Provider.`;
    return {
      text,
      provider: this.providerType,
      model,
      usage: {
        promptTokens: prompt.length / 4,
        completionTokens: text.length / 4,
        totalTokens: (prompt.length + text.length) / 4,
      },
    };
  }

  public async *stream(prompt: string, options?: LLMGenerateOptions): AsyncIterable<string> {
    const response = await this.generate(prompt, options);
    const chunks = response.text.split(' ');
    for (const chunk of chunks) {
      yield `${chunk} `;
    }
  }

  public async embed(text: string): Promise<number[]> {
    // Generate dummy 768-dim float vector
    const vector = new Array(768).fill(0).map((_, i) => Math.sin(i + text.length) * 0.1);
    return vector;
  }
}
