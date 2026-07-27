import type { LLMProvider, LLMProviderType } from './types';
import { GeminiProvider } from './gemini-provider';
import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';
import { MockLLMProvider } from './mock-provider';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private readonly providers: Map<LLMProviderType, LLMProvider> = new Map();
  private readonly mockProvider: MockLLMProvider;

  private constructor() {
    this.mockProvider = new MockLLMProvider();
    this.register(new GeminiProvider());
    this.register(new OpenAIProvider());
    this.register(new AnthropicProvider());
    this.register(this.mockProvider);
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public register(provider: LLMProvider): void {
    this.providers.set(provider.providerType, provider);
  }

  public getProvider(type: LLMProviderType): LLMProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      return this.mockProvider;
    }
    return provider;
  }

  public getDefaultProvider(): LLMProvider {
    const preferred = process.env.DEFAULT_LLM_PROVIDER as LLMProviderType | undefined;
    if (preferred && this.providers.has(preferred)) {
      const provider = this.providers.get(preferred)!;
      if (provider.isConfigured()) {
        return provider;
      }
    }

    // Auto-detect based on available API keys
    const gemini = this.getProvider('gemini');
    if (gemini.isConfigured()) return gemini;

    const openai = this.getProvider('openai');
    if (openai.isConfigured()) return openai;

    const anthropic = this.getProvider('anthropic');
    if (anthropic.isConfigured()) return anthropic;

    // Fallback to mock provider
    return this.mockProvider;
  }
}
