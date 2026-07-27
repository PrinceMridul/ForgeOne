export type LLMProviderType = 'gemini' | 'openai' | 'anthropic' | 'mock';

export interface LLMGenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface LLMResponse {
  text: string;
  provider: LLMProviderType;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  readonly providerType: LLMProviderType;
  readonly providerName: string;
  readonly defaultModel: string;

  /**
   * Check if the required API keys and credentials are set in environment
   */
  isConfigured(): boolean;

  /**
   * Generate text response from LLM provider
   */
  generate(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse>;

  /**
   * Stream text response from LLM provider
   */
  stream(prompt: string, options?: LLMGenerateOptions): AsyncIterable<string>;

  /**
   * Embed text into vector representations (placeholder)
   */
  embed(text: string): Promise<number[]>;
}
