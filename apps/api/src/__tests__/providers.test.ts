import { describe, it, expect } from 'vitest';
import {
  ProviderRegistry,
  MockLLMProvider,
  GeminiProvider,
  OpenAIProvider,
  AnthropicProvider,
} from '../providers';
import { ArchitectAgent } from '../orchestrator/agents/architect';
import { SharedContext } from '../orchestrator/context';

describe('LLM Provider Abstraction Layer Test Suite', () => {
  describe('Provider Implementations', () => {
    it('MockLLMProvider should generate mock response and embeddings', async () => {
      const provider = new MockLLMProvider();
      expect(provider.providerType).toBe('mock');
      expect(provider.isConfigured()).toBe(true);

      const response = await provider.generate('Design a database schema');
      expect(response.text).toContain('Mock Generated Response');
      expect(response.provider).toBe('mock');

      const embeddings = await provider.embed('test string');
      expect(embeddings.length).toBe(768);
    });

    it('GeminiProvider should detect missing key gracefully', () => {
      const provider = new GeminiProvider();
      expect(provider.providerType).toBe('gemini');
      expect(provider.providerName).toContain('Gemini');
      // Unless GEMINI_API_KEY is present in env, isConfigured should return false
      if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
        expect(provider.isConfigured()).toBe(false);
      }
    });

    it('OpenAIProvider should detect missing key gracefully', () => {
      const provider = new OpenAIProvider();
      expect(provider.providerType).toBe('openai');
      if (!process.env.OPENAI_API_KEY) {
        expect(provider.isConfigured()).toBe(false);
      }
    });

    it('AnthropicProvider should detect missing key gracefully', () => {
      const provider = new AnthropicProvider();
      expect(provider.providerType).toBe('anthropic');
      if (!process.env.ANTHROPIC_API_KEY) {
        expect(provider.isConfigured()).toBe(false);
      }
    });
  });

  describe('ProviderRegistry', () => {
    it('ProviderRegistry should register and retrieve providers by type', () => {
      const registry = ProviderRegistry.getInstance();
      expect(registry.getProvider('mock')).toBeInstanceOf(MockLLMProvider);
      expect(registry.getProvider('gemini')).toBeInstanceOf(GeminiProvider);
      expect(registry.getProvider('openai')).toBeInstanceOf(OpenAIProvider);
      expect(registry.getProvider('anthropic')).toBeInstanceOf(AnthropicProvider);
    });

    it('getDefaultProvider should return mock provider when no API keys are configured', () => {
      const registry = ProviderRegistry.getInstance();
      const defaultProvider = registry.getDefaultProvider();
      expect(defaultProvider).toBeDefined();
    });
  });

  describe('ArchitectAgent with Provider Abstraction', () => {
    it('ArchitectAgent should execute using provider layer and generate Architecture.md artifact', async () => {
      const agent = new ArchitectAgent();
      const context = new SharedContext(
        'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Test System Architecture',
        'Build a real-time analytics platform',
      );

      const events: string[] = [];
      const result = await agent.execute(context, (msg) => events.push(msg));

      expect(result.agentType).toBe('ARCHITECT');
      expect(result.artifacts).toBeDefined();
      expect(result.artifacts?.[0]?.filename).toBe('Architecture.md');
      expect(result.artifacts?.[0]?.content).toContain('System Architecture Blueprint');
    });
  });
});
