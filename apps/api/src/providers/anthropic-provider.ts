import type { LLMProvider, LLMProviderType, LLMGenerateOptions, LLMResponse } from './types';

export class AnthropicProvider implements LLMProvider {
  public readonly providerType: LLMProviderType = 'anthropic';
  public readonly providerName = 'Anthropic Claude';
  public readonly defaultModel = 'claude-3-5-sonnet-20241022';

  private getApiKey(): string | undefined {
    return process.env.ANTHROPIC_API_KEY;
  }

  public isConfigured(): boolean {
    const key = this.getApiKey();
    return typeof key === 'string' && key.trim().length > 0;
  }

  public async generate(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('Anthropic API key is not configured. Set ANTHROPIC_API_KEY environment variable.');
    }

    const apiKey = this.getApiKey()!;
    const model = options?.model ?? this.defaultModel;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens ?? 4096,
        system: options?.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Anthropic API call failed (${res.status}): ${errorText}`);
    }

    const data = (await res.json()) as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const text = data.content?.[0]?.text ?? '';

    return {
      text,
      provider: this.providerType,
      model,
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
    };
  }

  public async *stream(prompt: string, options?: LLMGenerateOptions): AsyncIterable<string> {
    const response = await this.generate(prompt, options);
    yield response.text;
  }

  public async embed(text: string): Promise<number[]> {
    return new Array(1024).fill(0).map((_, i) => Math.sin(i + text.length) * 0.1);
  }
}
