import type { LLMProvider, LLMProviderType, LLMGenerateOptions, LLMResponse } from './types';

export class GeminiProvider implements LLMProvider {
  public readonly providerType: LLMProviderType = 'gemini';
  public readonly providerName = 'Google Gemini (AI Studio)';
  public readonly defaultModel = 'gemini-2.5-flash';

  private getApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  }

  public isConfigured(): boolean {
    const key = this.getApiKey();
    return typeof key === 'string' && key.trim().length > 0;
  }

  public async generate(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.');
    }

    const apiKey = this.getApiKey()!;
    const model = options?.model ?? this.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = [];
    if (options?.systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: `System Instruction: ${options.systemPrompt}` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will follow your system instructions.' }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const body = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: options?.maxTokens ?? 4096,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini API call failed (${res.status}): ${errorText}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    return {
      text: generatedText,
      provider: this.providerType,
      model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
      },
    };
  }

  public async *stream(prompt: string, options?: LLMGenerateOptions): AsyncIterable<string> {
    const response = await this.generate(prompt, options);
    const lines = response.text.split('\n');
    for (const line of lines) {
      yield `${line}\n`;
    }
  }

  public async embed(text: string): Promise<number[]> {
    if (!this.isConfigured()) {
      return new Array(768).fill(0).map((_, i) => Math.sin(i + text.length) * 0.1);
    }

    const apiKey = this.getApiKey()!;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] },
      }),
    });

    if (!res.ok) {
      return new Array(768).fill(0).map((_, i) => Math.sin(i + text.length) * 0.1);
    }

    const data = (await res.json()) as {
      embedding?: { values?: number[] };
    };

    return data.embedding?.values ?? new Array(768).fill(0);
  }
}
