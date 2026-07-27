import type { LLMProvider, LLMProviderType, LLMGenerateOptions, LLMResponse } from './types';

export class OpenAIProvider implements LLMProvider {
  public readonly providerType: LLMProviderType = 'openai';
  public readonly providerName = 'OpenAI API';
  public readonly defaultModel = 'gpt-4o';

  private getApiKey(): string | undefined {
    return process.env.OPENAI_API_KEY;
  }

  public isConfigured(): boolean {
    const key = this.getApiKey();
    return typeof key === 'string' && key.trim().length > 0;
  }

  public async generate(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key is not configured. Set OPENAI_API_KEY environment variable.');
    }

    const apiKey = this.getApiKey()!;
    const model = options?.model ?? this.defaultModel;

    const messages = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenAI API call failed (${res.status}): ${errorText}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const text = data.choices?.[0]?.message?.content ?? '';

    return {
      text,
      provider: this.providerType,
      model,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    };
  }

  public async *stream(prompt: string, options?: LLMGenerateOptions): AsyncIterable<string> {
    const response = await this.generate(prompt, options);
    yield response.text;
  }

  public async embed(text: string): Promise<number[]> {
    return new Array(1536).fill(0).map((_, i) => Math.sin(i + text.length) * 0.1);
  }
}
